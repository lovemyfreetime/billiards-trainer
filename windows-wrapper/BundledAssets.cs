using System.Globalization;

namespace BilliardsTrainer.Windows;

// Resolve only packaged public app files. Never fall through to a slow network request.
internal sealed class BundledAssets(string root)
{
    private readonly string directory = Path.GetFullPath(root) + Path.DirectorySeparatorChar;
    internal sealed record Reply(int Status, string Reason, string Headers, Stream? Body);
    internal Reply Read(Uri url, string method, string? range)
    {
        const string prefix = "/billiards-trainer/";
        if (!url.AbsolutePath.StartsWith(prefix, StringComparison.Ordinal)) return Empty(404, "Not Found");
        if (method != "GET" && method != "HEAD") return Empty(405, "Method Not Allowed");
        string file;
        try
        {
            var relative = Uri.UnescapeDataString(url.AbsolutePath[prefix.Length..]);
            if (relative.Length == 0) relative = "index.html";
            else if (relative.EndsWith('/')) relative += "index.html";
            file = Path.GetFullPath(Path.Combine(directory, relative.Replace('/', Path.DirectorySeparatorChar)));
            if (!file.StartsWith(directory, StringComparison.OrdinalIgnoreCase) || !File.Exists(file)) return Empty(404, "Not Found");
        }
        catch { return Empty(404, "Not Found"); }
        var length = new FileInfo(file).Length;
        long start = 0, end = length - 1;
        var partial = !string.IsNullOrEmpty(range);
        if (partial)
        {
            if (!TryRange(range!, length, out start, out end)) return new(416, "Range Not Satisfiable", $"Content-Range: bytes */{length}\r\nContent-Length: 0\r\n", null);
        }
        var count = Math.Max(0, end - start + 1);
        var headers = $"Content-Type: {Mime(file)}\r\nContent-Length: {count}\r\nAccept-Ranges: bytes\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\n";
        if (partial) headers += $"Content-Range: bytes {start}-{end}/{length}\r\n";
        if (method == "HEAD") return new(partial ? 206 : 200, partial ? "Partial Content" : "OK", headers, null);
        // A seekable memory stream gives WebView2 fast media/range reads without
        // the documented virtual-host media loading delay. Read only the requested range.
        var bytes = new byte[checked((int)count)];
        using (var input = File.OpenRead(file)) { input.Position = start; input.ReadExactly(bytes); }
        return new(partial ? 206 : 200, partial ? "Partial Content" : "OK", headers, new MemoryStream(bytes, writable: false));
    }
    private static Reply Empty(int status, string reason) => new(status, reason, "Content-Length: 0\r\nCache-Control: no-store\r\n", null);
    internal static bool TryRange(string range, long length, out long start, out long end)
    {
        start = 0; end = length - 1;
        if (length == 0 || !range.StartsWith("bytes=", StringComparison.Ordinal) || range.Contains(',')) return false;
        var parts = range[6..].Split('-');
        if (parts.Length != 2) return false;
        if (parts[0].Length == 0)
        {
            if (!long.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out var suffix) || suffix <= 0) return false;
            start = Math.Max(0, length - suffix); return true;
        }
        if (!long.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out start) || start >= length) return false;
        if (parts[1].Length > 0 && (!long.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out end) || end < start)) return false;
        end = Math.Min(end, length - 1); return true;
    }
    private static string Mime(string file) => Path.GetExtension(file).ToLowerInvariant() switch
    {
        ".html" => "text/html; charset=utf-8", ".js" or ".mjs" => "text/javascript; charset=utf-8",
        ".css" => "text/css; charset=utf-8", ".json" or ".webmanifest" => "application/json; charset=utf-8",
        ".mp3" => "audio/mpeg", ".wav" => "audio/wav", ".wasm" => "application/wasm",
        ".svg" => "image/svg+xml", ".png" => "image/png", ".webp" => "image/webp",
        ".jpg" or ".jpeg" => "image/jpeg", ".ico" => "image/x-icon", _ => "application/octet-stream"
    };
}
