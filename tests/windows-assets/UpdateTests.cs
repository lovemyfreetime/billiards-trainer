using BilliardsTrainer.Windows;
using System.Text;
using System.Text.Json;

internal static class UpdateTests
{
    internal static async Task Run()
    {
        var root = Path.Combine(Path.GetTempPath(), "Billiards-update-test-" + Guid.NewGuid());
        var bundle = Path.Combine(root, "bundle"); var cache = Path.Combine(root, "cache"); Directory.CreateDirectory(bundle);
        void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
        byte[] Bytes(string value) => Encoding.UTF8.GetBytes(value);
        var initial = new Dictionary<string, byte[]> { ["index.html"] = Bytes("old trainer"), ["welcome.html"] = Bytes("home"), ["play.html"] = Bytes("play"), ["app-updates.js"] = Bytes("updater"), ["clip.mp3"] = Bytes("unchanged recording") };
        ContentUpdates.Release Release(Dictionary<string, byte[]> files, long seq, int protocol = 1) => new(1, protocol, seq.ToString("x64"), seq, files.ToDictionary(p => p.Key, p => new ContentUpdates.Entry(ContentUpdates.Hash(p.Value), p.Value.Length)));
        byte[] Manifest(ContentUpdates.Release value) => JsonSerializer.SerializeToUtf8Bytes(value, ContentUpdates.Json);
        try
        {
            foreach (var (name, data) in initial) File.WriteAllBytes(Path.Combine(bundle, name), data);
            File.WriteAllBytes(Path.Combine(bundle, "native-updates.json"), Manifest(Release(initial, 1)));
            File.WriteAllText(Path.Combine(bundle, "bundle-manifest.json"), JsonSerializer.Serialize(new { files = initial.ToDictionary(p => p.Key, p => ContentUpdates.Hash(p.Value)) }));
            var current = new Dictionary<string, byte[]>(initial) { ["index.html"] = Bytes("new trainer"), ["new.css"] = Bytes("new style") };
            var release = Release(current, 2); var calls = new List<string>(); bool corrupt = true, offline = false;
            Task<Stream> Download(string name)
            {
                calls.Add(name); if (offline) throw new IOException("Offline");
                return Task.FromResult<Stream>(new MemoryStream(name == "native-updates.json" ? Manifest(release) : name == "new.css" && corrupt ? Bytes("corruption") : current[name]));
            }
            var app = new ContentUpdates(cache, bundle, Download); Check(calls.Count == 0, "Offline startup does not contact the server");
            await app.Check(true, _ => { }); Check(app.Status.State == "failed", "A corrupt changed file fails verification");
            Check(!File.Exists(Path.Combine(cache, "pending.json")), "Partial releases are never activated");
            Check(File.ReadAllText(app.Resolve("index.html")!) == "old trainer", "Running version is unchanged during a failed update");
            corrupt = false; calls.Clear(); await app.Check(true, _ => { }); Check(app.Status.State == "ready", "Complete verified update is ready");
            Check(!calls.Contains("clip.mp3") && !calls.Contains("welcome.html"), "Unchanged installed assets are reused");
            Check(!calls.Contains("index.html"), "Retry reuses a previously verified changed file");
            Check(File.ReadAllText(app.Resolve("index.html")!) == "old trainer", "Ready does not switch a running shot");
            offline = true; var restarted = new ContentUpdates(cache, bundle, Download); Check(restarted.Selected.Sequence == 2, "Restart activates the complete release without internet");
            var resolver = new BundledAssets(bundle, restarted); var url = new Uri(ContentUpdates.Source + "new.css?v=2");
            var reply = resolver.Read(url, "GET", null); Check(reply.Status == 200 && reply.Headers.Contains("text/css"), "New assets load from hashed cache with their original MIME type");reply.Body!.Dispose();
            await restarted.Check(true, _ => { }); Check(restarted.Status.State == "failed", "Offline check reports a failure without deleting the working version");
            Check(File.ReadAllText(restarted.Resolve("index.html")!) == "new trainer", "Updated version remains available offline");
            // Retain the previous complete content snapshot when a later cache is damaged.
            offline = false; current["index.html"] = Bytes("third trainer"); release = Release(current, 3); await restarted.Check(true, _ => { });restarted.Apply();Check(restarted.Selected.Sequence == 3, "Explicit restart applies a complete pending release");
            File.WriteAllText(restarted.Resolve("index.html")!, "damaged");var recovered = new ContentUpdates(cache, bundle, Download);Check(recovered.Selected.Sequence == 2, "Damaged active cache falls back to the previous verified snapshot");
            release = Release(current, 4, 2);calls.Clear();await recovered.Check(true, _ => { });Check(recovered.Status.State == "native-required" && calls.Count == 1, "Incompatible native protocol requests an installer and downloads no content");
            foreach (var path in new[] { "../outside", "/absolute", "a/../b", "a\\b", "https://evil/file", "file?url=bad", "a//b", "a/%2e%2e/b" }) Check(!ContentUpdates.Safe(path), "Unsafe path rejected: " + path);
            var bad = new Dictionary<string, byte[]>(initial) { ["../escape.js"] = Bytes("bad") };bool rejected = false;try { ContentUpdates.Parse(Manifest(Release(bad, 5))); } catch { rejected = true; }Check(rejected, "Inventory traversal rejected");
            Console.WriteLine("Native content updater: changed-file downloads, verified retry, atomic restart, offline restart, MIME/ranges, rollback, protocol and path safety passed.");
        }
        finally { Directory.Delete(root, true); }
    }
}
