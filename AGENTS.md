# App working and publishing preferences

The user explicitly restored the public live-app workflow on October 19, 2026.

- Work from the current `main` branch of `lovemyfreetime/billiards-trainer`; preserve newer existing changes.
- For requested app changes, implement, run appropriate checks, and publish to this public `main` branch by default unless the user asks otherwise. GitHub Pages serves https://lovemyfreetime.github.io/billiards-trainer/.
- Provide the normal live-app URL and verify the released functionality. Do not substitute an account-gated preview or a separate ChatGPT Site for viewing the app.
- The private repository and older preview copies can remain as history. They are not the current working/release target.
- Do not add authentication or app protection as part of ordinary feature work unless the user requests it.

- After changing web app runtime files, run `python scripts/build-offline-assets.py` and publish `offline-assets.json`, `service-worker.js`, and `native-updates.json` with those changes. The native inventory is required for Windows and Android background content updates; never leave it stale when publishing runtime changes. The worker serves complete cached releases immediately; its version follows the generated file hashes.

- Standard Android Trainer/Installer APKs bundle the complete app through `scripts/package-android-app.py`. Preserve the application IDs, HTTPS save-data origin, and signing certificates. Do not replace a published APK with an incompatible/debug certificate; require successful offline emulator checks and an actual certificate match before updating the main installer download. Signing-key backups are private and must never be committed. Keep the normal platform installer names.

- On October 20, 2026 the user authorized a one-time migration from the published temporary debug certificates to the existing permanent certificate (SHA-256 `a7e01270b7c40cb939d745d391fd8ae34e89c7051c363c11e125ca1616b4d9c7`). This exception requires verified backup/restore instructions, offline emulator checks on the signed builds, and a pinned permanent-certificate check. Future releases must retain this permanent identity. Never publish disposable test-key builds.

- Narration quality: Jeff approved the review package’s fresh and pre-stretch recordings and Analyze recordings; rejected the other Main/Get Started samples. Never digitally time-stretch, slow, pitch-shift, or re-encode a rejected export as a quality fix. Use approved original bytes or freshly generated Chase narration at the intended speaking pace. Keep approved recording hashes and review status; decoding/playback success alone is not sound-quality approval.

- Native content updates: retain the fixed HTTPS origin and complete installed fallback. Downloaded files must pass SHA-256/length checks before an update becomes pending; activate only on user restart or a new app process. Preserve saved-data profiles and the previous complete content snapshot. If web content needs a new native API or Local Play server contract, bump the native protocol in both shells and `scripts/build-native-updates.py`; older shells must request an installer instead of loading incompatible content.
