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

Trainer and Installer flavors include the complete app in `assets/app`. `scripts/package-android-app.py` uses the shared app asset inventory, adds an early native flag to HTML, and records lengths/hashes. HTTPS requests for the existing public app origin resolve from APK assets, including byte-range media requests; missing assets fail locally. A locally served HTTPS startup page uses document-start injection to unregister older site workers before opening the app, without clearing LocalStorage or IndexedDB. The public HTTPS origin and permanent signing identity are retained.

The release workflow verifies actual APK contents/signatures and tests the signed Trainer/Installer APKs on an Android emulator with internet blocked, including old-worker migration, save storage, media and the WASM classifier. Device-dependent hosting/voice capabilities remain in the separate Play preview.
