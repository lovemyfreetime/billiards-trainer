# Billiards Play implementation — October 19, 2026

This pass follows the requested order, sharing foundations between related features. Web features are available from Play → Tools or My player. Native Android additions are a separate `play` flavor with application ID `com.lovemyfreetime.billiardstrainer.play`; they do not replace the Trainer app.

| Item | Implementation | Verification and remaining limits |
| --- | --- | --- |
| 1. Shared input | One dispatcher for touch game events, paired clickers, exact voice commands and approved LAN player actions. Checks pause, actor, revision, background state, repeated input and command IDs. | Unit tests cover rejection and successful dispatch. LAN still authenticates requests and restricts private player actions before dispatch. |
| 2. Host and player | My player selects/reserves a host seat and opens its private view. Other seats remain available to phones. Private choices appear only during that seat's action. | Server test checks reservation and returning an already assigned phone to waiting. The host remains the session administrator and can inspect any seat. Shared-screen privacy still requires physically shielding the display. |
| 3. Offline Play | `scripts/package-play.py` creates `downloads/Billiards-Play-Offline.zip` and bundles Android assets from the same manifest. All 20 games, Tournament Play and tools are included. | Referenced entry-page assets and hashes checked. The web ZIP is a local single-device package; native hosting is a separate capability. Trainer and Zen are separate apps. |
| 4. Bluetooth clickers | Learn button mappings from OS-paired keyboard/HID remotes. Android Play can also capture external-device media/volume buttons while mapping or clicker mode is enabled. | Mapping and dispatcher tests; physical remotes need device testing. Browser delivery of media keys varies. Pair in system Bluetooth settings. No BLE-GATT protocol support is claimed. |
| 5. Audio Ghost | Rack score, remaining balls, lowest ball, result and best-run announcements. Reducer-owned attempts, break pots, post-break pots, misses, fouls, best run and rack results. | Game-engine tests cover statistics, purity, rack transitions and undo snapshots. Audio is opt-in. Host and player calls use bundled Chase recordings; no installed TTS voice is required. |
| 6. Drills | Individual/group names, attempts per set, results, percentages, sets, automatic rotation, attempt undo and local saves. | Pure reducer tests cover all-player/all-set completion. Tracking is host-local; this pass does not add a cloud history or remote drill-score permissions. |
| 7. Shot clock | Host-owned absolute deadline, reset after recorded shots, pause, start, per-player match extension budget, 10/5/time calls. Guest screens estimate server offset to display the same deadline. | Timer and LAN projection tests pass. Expiry announces time; it never silently records a foul. No claim of sub-second or background audio synchronization. Host audio must be on. |
| 8. Offline recognition | Android 12+ on-device SpeechRecognizer only, with no cloud recognizer fallback; explicit microphone permission and English commands. | Java compiles against API 35. Requires a compatible, installed on-device English service/model; none is bundled. Other platforms show that offline voice is unavailable. APK/device validation remains. |
| 9. Activation/feedback | Exact “Table …” phrases, final results only, confidence threshold, repeat suppression, feedback, own-speech blocking and a quiet interval. Microphone stops on backgrounding. | Mocked-controller tests check low-confidence rejection, echo suppression, pause and stale speech callbacks. Noisy-room/room-speaker reliability needs physical tests and tuning. |
| 10. Android hosting | In-APK HTTP server, bundled host/player assets, loopback-only host token, invite tokens, explicit seat approval, filtered private views, stale-choice protection, serialized audio leases, revoke/end/rejoin. | Java/API compilation passes. Existing Node LAN tests are not a runtime test of the Java server. Android server lifecycle, networking and private-view projections still require device/instrumentation tests. HTTP is for trusted private LANs. |
| 11. Android hotspot | Local-only hotspot request, versioned runtime permission, Wi-Fi QR with credentials, separate player invitation QR, Wi-Fi settings, errors and cleanup. | API compilation passes. Joining still uses each device's Wi-Fi interface. Device/OEM availability, routing, permission refusal and no-internet prompts require real-device testing. Host must stay foreground. |
| 12. Table calibration | Guided repeated video measurements, robust median, 25% repeatability gate, rolling-resistance estimate and effective normal cushion-speed ratio. Explicitly apply to Trainer Physics; cross-origin link carries measurements for review/application. | Numerical tests pass. This is manual measurement-assisted calibration, not automatic video tracking or a laboratory validation of a table's full physics. It leaves sliding/spin/throw parameters alone. |

## Getting started

1. Open `play.html` and choose a game. **My player** selects your own seat.
2. Open **Tools** for clicker mapping, drill setup and shot clock settings. Close Tools for voice/clicker play. On-screen drill buttons remain on the table screen.
3. Turn **Audio on** for Ghost/referee and clock announcements.
4. Compatible voice examples: “Table ready”, “Table ball one made”, “Table miss”, “Table scratch”, “Table undo”, “Table pause”, “Table resume”, “Table start clock”, “Table extension”, “Table drill made”. Numbered games need ball numbers. Golf/Turf pocket-specific made-shot entry stays on screen.
5. For calibration, open **Tools → Guided table calibration**. Film three or more trials of each type, in both directions/on different cushions. Save locally or open Trainer with the measurements, then deliberately choose **Physics → Apply measured table settings**.
6. Build Android preview with `gradle :app:assemblePlayDebug` inside `android-wrapper`, or download the successful **Build offline Android Play preview** workflow artifact. It is a separate debug preview, pending real-device tests.

## Validation in this pass

- Shared commands, voice-controller echo/id handling, drill reducers, clock timing, Ghost statistics, calibration math and offline asset references.
- Existing full game/catalog tests, Tournament engine tests, experience-entry checks, and local-host security/session tests.
- Android Play Java compiled with Android API 35 and pinned NanoHTTPD 2.3.1 / ZXing 3.5.3 sources.
- Full Gradle APK build is delegated to the added CI workflow. Browser layout tests could not launch because this environment lacks the expected Playwright browser. No browser installation or substitute preview was used.
- Physical Android speech/hotspot/remote tests and real table calibration trials are still required. These native and measurement-dependent items are not marked production-verified.


## Play navigation and Chase narration update

- Table tools has cyan Back to table controls at both ends. Matching return controls lead to the game catalog; tapping outside a popup dismisses it to the previous view.
- Resume game is a compact control below the game grid, next to Clear saved game. Clearing requires confirmation, clears the saved game and shot history, and ends current LAN sharing; drills and tournament events stay.
- 54 locally bundled Chase instruction recordings at the approved +10% setting cover the Play introduction, rules/setup for all 20 games, and tool/instruction sections. Speaker controls play/pause at the same position, stop on dismissal/backgrounding, and suppress voice commands during spoken audio. No secret cards, targets or votes are read aloud.
- Final MP3s and source-text hash receipts live under `play-audio/`; the same audio is included in the offline web package and native packages. `scripts/build-play-narration.cjs` marks a changed script pending until its matching recording is installed.
- Resume/clear behavior, speaker pause/resume and outside-tap handling are checked with automated tests and the deployed UI.

## Recorded gameplay announcements

- 189 additional Chase clips at +10% cover 0–100, Player 1–12, all 20 game names, and turn/result/score/Ghost/clock/drill phrases. Automatic speech uses player numbers, never entered names or private cards, targets, votes, roles or fleet cells. Turn prompts vary without an immediate repeat.
- Host and phone calls use the same local MP3 vocabulary. Web Audio schedules assembled clips in order; extracted file-URL packages reuse an HTML audio player. Missing audio reports a retry message; it never substitutes a device voice.
- Local rooms still serialize host/player speech through a revision-scoped lease, now sized for the recording duration and bounded to 45 seconds. New revisions, muting, backgrounding, undo and native pause cancel stale speech.
- `play-announcements-copy.json` is the authored vocabulary; `play-audio/announcements.json` and `play-announcements-data.js` are generated catalogs. `scripts/install-play-announcements.py` checks hashes, voice/rate, uniqueness, decoding and duration before installation. All 243 instruction/gameplay MP3s ship in the offline web, Windows and Android Play packages.
