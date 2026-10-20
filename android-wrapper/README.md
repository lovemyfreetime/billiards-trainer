# Billiards Trainer 4.12 — Android Wrapper

A dedicated fullscreen Android WebView wrapper for:

https://lovemyfreetime.github.io/billiards-trainer/

## What it fixes
- No Chrome tab/address/bookmark bars.
- Immersive landscape mode hides Android status/navigation bars; swipe from an edge to reveal them temporarily.
- Keeps the screen awake while the trainer is open.
- Supports photo/video file selection and launches the device camera.
- Preserves WebView localStorage/IndexedDB so saved layouts and the in-app photo archive persist.
- The matching v5 website build can also save/archive JPEGs into normal Android folders under `Pictures/Billiards Trainer`.

## Build
Open this folder in Android Studio and build the `app` module, or use the included GitHub Actions workflow.

Minimum Android: Android 10 (API 29).


## Standalone offline Play preview

The separate `play` flavor bundles the current Play assets and includes a local session server, on-device voice adapter, native offline TTS, external clicker handling and local-only hotspot setup. Build with `gradle :app:assemblePlayDebug`. It uses a separate application ID ending `.play`. The added `build-android-play.yml` workflow compiles it without replacing published Trainer/Installer APKs. See `docs/PLAY_IMPLEMENTATION_ROADMAP.md` for hardware validation still required.

## Standard app packaging

Trainer and Installer flavors include the complete app in `assets/app`. `scripts/package-android-app.py` uses the shared app asset inventory, adds an early native flag to HTML, and records lengths/hashes. HTTPS requests for the existing public app origin resolve from APK assets, including byte-range media requests; missing assets fail locally. A locally served HTTPS startup page uses document-start injection to unregister older site workers before opening the app, without clearing LocalStorage or IndexedDB. The public HTTPS origin is retained. The October 20 migration moves older debug-signed apps to the permanent signing identity; that first move requires a verified backup and a one-time reinstall. Future releases retain the permanent identity.

The release workflow verifies actual APK contents/signatures and tests the signed Trainer/Installer APKs on an Android emulator with internet blocked, including old-worker migration, save storage, media and the WASM classifier. Device-dependent hosting/voice capabilities remain in the separate Play preview.

## Saved-data migration

Play → Tools links to `backup.html`. Open it inside the old app, create a backup, and save a complete copy outside the app before uninstalling. Legacy wrappers require copying the complete JSON text; the new wrapper can save JSON to Downloads. Restore the JSON in the new installation. Backups include localStorage, saved session records, and archived image Blobs. Browser storage is separate from app storage. Folder handles are intentionally excluded and must be selected again. Failed imports never report success; keep the original backup until restored data is verified.

Only the pinned permanent certificate may publish. GitHub Actions needs the existing key as `ANDROID_KEYSTORE_BASE64`, with its `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD` stored as encrypted repository secrets. Never commit those values. Both signed flavors must pass the blocked-internet emulator suite before the normal platform installer links switch to the release APKs.
