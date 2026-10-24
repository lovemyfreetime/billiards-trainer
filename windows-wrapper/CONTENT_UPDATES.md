# Native content updates

Windows and Android keep the public HTTPS app origin and existing saved-data profiles. The installed app is always a complete offline fallback. No app storage, saved tables, or IndexedDB databases are cleared by an update.

`python scripts/build-offline-assets.py` generates both browser cache metadata and `native-updates.json`. Commit all three generated manifests/worker files. The native inventory covers the complete public runtime, with SHA-256, byte lengths, a monotonic release sequence, and a minimum native protocol. It does not contain itself. The generation check runs as part of shared release verification.

Native shells fetch only the fixed HTTPS GitHub Pages origin; redirects, arbitrary source URLs, unsafe asset names, oversized files and incomplete inventories are rejected. HTTPS authenticates the release source. Per-file SHA-256 and byte-length checks prevent mixed or incomplete releases; they are integrity checks, not an independent digital signature for the inventory. APK signing identity remains unchanged.

When the app is open and connected, it checks on startup/resume/reconnection, at most once every five minutes unless the user explicitly checks. Only changed assets are downloaded. Unchanged files are read directly from the installed bundle, and already verified cached files are reused on retry. Changed files are stored by hash in the app's private data directory.

The running resolver retains its complete snapshot until the user presses Restart app or opens a new app process. Only a fully downloaded, verified inventory becomes pending. Pending metadata is atomically replaced. Startup validates cached files and activates a newer complete pending release without network access. Damaged active content falls back to the previous complete snapshot, or the installed bundle. The cache retains the active, pending and previous snapshots and removes unreferenced changed files after a successful download.

Native API/permission changes, the Windows Local Play server/runtime, and Android/Windows executable changes still require an installed-app update. For content that depends on a new native API/server contract, increase `PROTOCOL` in both native updater implementations and `PROTOCOL` in `scripts/build-native-updates.py` together. Older shells will show that a newer installer is required, without downloading incompatible content. Ordinary browser UI, physics, lessons, recordings and graphics updates do not require a new installer.

Checks: `tests/windows-assets/UpdateTests.cs`, Android `ContentUpdatesTest`, and `tests/native-content-updates.browser.cjs` cover changed-file reuse, interrupted/corrupt downloads, complete offline activation, previous-version recovery, protocol incompatibility, unsafe paths, bridge behavior and saved-session restart order. Existing offline browser and native WebView smoke tests remain release gates.
