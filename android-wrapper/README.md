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
