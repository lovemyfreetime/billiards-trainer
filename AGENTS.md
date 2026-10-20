# App working and publishing preferences

The user explicitly restored the public live-app workflow on October 19, 2026.

- Work from the current `main` branch of `lovemyfreetime/billiards-trainer`; preserve newer existing changes.
- For requested app changes, implement, run appropriate checks, and publish to this public `main` branch by default unless the user asks otherwise. GitHub Pages serves https://lovemyfreetime.github.io/billiards-trainer/.
- Provide the normal live-app URL and verify the released functionality. Do not substitute an account-gated preview or a separate ChatGPT Site for viewing the app.
- The private repository and older preview copies can remain as history. They are not the current working/release target.
- Do not add authentication or app protection as part of ordinary feature work unless the user requests it.

- After changing web app runtime files, run `python scripts/build-offline-assets.py` and publish `offline-assets.json` and `service-worker.js` with those changes. The worker serves complete cached releases immediately; its version follows the generated file hashes.
