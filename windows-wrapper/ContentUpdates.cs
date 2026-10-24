using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace BilliardsTrainer.Windows;

// The downloaded snapshot is immutable until the next app start/restart.
internal sealed class ContentUpdates
{
    internal const int Protocol = 1;
    internal const string Source = "https://lovemyfreetime.github.io/billiards-trainer/";
    internal sealed record Entry(string Sha256, long Length);
    internal sealed record Release(int Format, int MinimumProtocol, string Version, long Sequence, Dictionary<string, Entry> Files);
    internal sealed record UpdateState(string State, int Done, int Total, string Version, int Protocol = ContentUpdates.Protocol);
    internal static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, PropertyNameCaseInsensitive = true };
    private readonly string root, blobs, bundlePath;
    private readonly Release baseline;
    private readonly Dictionary<string, string> bundledFiles;
    private readonly Func<string, Task<Stream>> download;
    private Release? active, pending;
    private int busy;
    private DateTime lastCheck;
    internal UpdateState Status { get; private set; }
    internal Release Selected => active ?? baseline;

    internal ContentUpdates(string root, string bundlePath, Func<string, Task<Stream>>? download = null)
    {
        this.root = root; this.bundlePath = bundlePath; blobs = Path.Combine(root, "blobs"); Directory.CreateDirectory(blobs);
        using var bundleManifest = JsonDocument.Parse(File.ReadAllBytes(Path.Combine(bundlePath, "bundle-manifest.json")));
        bundledFiles = bundleManifest.RootElement.GetProperty("files").EnumerateObject().ToDictionary(p => p.Name, p => p.Value.GetString()!);
        baseline = Parse(File.ReadAllBytes(Path.Combine(bundlePath, "native-updates.json")));
        this.download = download ?? Network;
        Select(); Status = State("idle");
    }
    private static readonly HttpClient Client = new(new HttpClientHandler { AllowAutoRedirect = false }) { Timeout = TimeSpan.FromSeconds(30) };
    private static async Task<Stream> Network(string name)
    {
        if (!Safe(name)) throw new IOException("Invalid update path");
        using var request = new HttpRequestMessage(HttpMethod.Get, Source + string.Join('/', name.Split('/').Select(Uri.EscapeDataString)));
        request.Headers.CacheControl = new() { NoCache = true };
        // A bounded byte buffer prevents a malicious or broken endpoint consuming unlimited memory.
        using var response = await Client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
        if (response.StatusCode != System.Net.HttpStatusCode.OK) throw new IOException("Update unavailable");
        await using var input = await response.Content.ReadAsStreamAsync();
        var bytes = await Read(input, name == "native-updates.json" ? 1024 * 1024 : 128 * 1024 * 1024);
        return new MemoryStream(bytes, writable: false);
    }
    internal void Select()
    {
        var saved = Load("active.json"); var previous = Load("previous.json");
        active = Usable(saved) ? saved : Usable(previous) ? previous : null;
        if (active != null && active.Sequence <= baseline.Sequence) active = null;
        pending = Load("pending.json");
        if (Usable(pending) && pending!.Sequence > Selected.Sequence)
        {
            if (active != null) Atomic("previous.json", JsonSerializer.SerializeToUtf8Bytes(active, Json));
            Atomic("active.json", JsonSerializer.SerializeToUtf8Bytes(pending, Json)); active = pending;
        }
        pending = null; File.Delete(Path.Combine(root, "pending.json"));
    }
    internal void Apply() { if (Volatile.Read(ref busy) == 0 && pending != null) { Select(); Status = State("idle"); } }
    internal string? Resolve(string name)
    {
        if (active == null) return Path.Combine(bundlePath, name.Replace('/', Path.DirectorySeparatorChar));
        if (!active.Files.TryGetValue(name, out var info)) return null;
        return InBundle(name, info) ? Path.Combine(bundlePath, name.Replace('/', Path.DirectorySeparatorChar)) : Path.Combine(blobs, info.Sha256);
    }
    private bool InBundle(string name, Entry info) => bundledFiles.TryGetValue(name, out var sha) && sha == info.Sha256;
    internal async Task Check(bool force, Action<UpdateState> notice)
    {
        if (!force && DateTime.UtcNow - lastCheck < TimeSpan.FromMinutes(5)) { notice(Status); return; }
        if (Interlocked.CompareExchange(ref busy, 1, 0) != 0) { notice(Status); return; }
        lastCheck = DateTime.UtcNow;
        try
        {
            Status = State("checking"); notice(Status);
            using var inventory = await download("native-updates.json"); var release = Parse(await Read(inventory, 1024 * 1024));
            if (release.MinimumProtocol > Protocol) { Status = State("native-required"); return; }
            if (release.Sequence <= Math.Max(Selected.Sequence, pending?.Sequence ?? 0)) { Status = State(pending == null ? "current" : "ready"); return; }
            int done = 0, total = release.Files.Count;
            foreach (var (name, info) in release.Files)
            {
                var target = Path.Combine(blobs, info.Sha256);
                if (!InBundle(name, info) && !Valid(target, info))
                {
                    using var input = await download(name); var bytes = await Read(input, checked((int)info.Length));
                    if (bytes.LongLength != info.Length || Hash(bytes) != info.Sha256) throw new IOException("Update file verification failed");
                    var temp = Path.Combine(blobs, "partial-" + Guid.NewGuid());
                    try { using (var output = new FileStream(temp, FileMode.CreateNew, FileAccess.Write)) { await output.WriteAsync(bytes); output.Flush(true); } File.Move(temp, target, true); }
                    finally { if (File.Exists(temp)) File.Delete(temp); }
                }
                done++; if (done == total || done % 25 == 0) { Status = State("downloading", done, total); notice(Status); }
            }
            Atomic("pending.json", JsonSerializer.SerializeToUtf8Bytes(release, Json)); pending = release; Clean(); Status = State("ready", total, total);
        }
        catch { Status = State(pending == null ? "failed" : "ready"); }
        finally { Interlocked.Exchange(ref busy, 0); notice(Status); }
    }
    private UpdateState State(string value, int done = 0, int total = 0) => new(value, done, total, Selected.Version[..16]);
    internal static Release Parse(byte[] bytes)
    {
        if (bytes.Length > 1024 * 1024) throw new IOException("Inventory too large");
        var m = JsonSerializer.Deserialize<Release>(bytes, Json) ?? throw new IOException("Invalid inventory");
        if (m.Format != 1 || m.MinimumProtocol < 1 || !Regex.IsMatch(m.Version ?? "", "^[a-f0-9]{64}$") || m.Sequence < 1 || m.Files == null || m.Files.Count < 4 || m.Files.Count > 5000) throw new IOException("Unsupported update inventory");
        long total = 0;
        foreach (var (name, info) in m.Files)
        {
            if (!Safe(name) || info == null || !Regex.IsMatch(info.Sha256 ?? "", "^[a-f0-9]{64}$") || info.Length < 0 || info.Length > 128L * 1024 * 1024) throw new IOException("Invalid update entry");
            total += info.Length;
        }
        if (total > 1024L * 1024 * 1024 || new[] { "index.html", "welcome.html", "play.html", "app-updates.js" }.Any(n => !m.Files.ContainsKey(n))) throw new IOException("Incomplete update inventory");
        return m;
    }
    internal static bool Safe(string name) => Regex.IsMatch(name, "^[A-Za-z0-9_./ -]+$") && !name.Split('/').Any(p => p is "" or "." or "..");
    private Release? Load(string name) { try { return Parse(File.ReadAllBytes(Path.Combine(root, name))); } catch { return null; } }
    private bool Usable(Release? m)
    {
        if (m == null || m.MinimumProtocol > Protocol) return false;
        try { return m.Files.All(pair => InBundle(pair.Key, pair.Value) || Valid(Path.Combine(blobs, pair.Value.Sha256), pair.Value)); } catch { return false; }
    }
    private static bool Valid(string file, Entry info)
    {
        if (!File.Exists(file) || new FileInfo(file).Length != info.Length) return false;
        using var input = File.OpenRead(file); return Convert.ToHexString(SHA256.HashData(input)).ToLowerInvariant() == info.Sha256;
    }
    internal static string Hash(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
    private void Atomic(string name, byte[] bytes)
    {
        var temp = Path.Combine(root, name + ".tmp"); using (var file = new FileStream(temp, FileMode.Create, FileAccess.Write)) { file.Write(bytes); file.Flush(true); }
        File.Move(temp, Path.Combine(root, name), true);
    }
    private void Clean()
    {
        try { var keep = new HashSet<string>(); foreach (var m in new[] { active, pending, Load("previous.json") }) if (m != null) foreach (var info in m.Files.Values) keep.Add(info.Sha256); foreach (var file in Directory.GetFiles(blobs)) if (!keep.Contains(Path.GetFileName(file))) File.Delete(file); } catch { }
    }
    private static async Task<byte[]> Read(Stream input, int max)
    {
        using var output = new MemoryStream(); var b = new byte[65536]; int n;
        while ((n = await input.ReadAsync(b)) != 0) { if (output.Length + n > max) throw new IOException("Update response too large"); output.Write(b, 0, n); }
        return output.ToArray();
    }
}
