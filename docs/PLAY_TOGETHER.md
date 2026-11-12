# Play Together — companion preview 0.1.0

Updated November 12, 2026.

## First working version

A separate companion workspace inside Billiards Trainer, reached from Play's experience menu. It uses its own page, files and data. The main scoring and simulation engines are not loaded into the companion workspace.

Flow: Meet → Notice → Choose → Try → Keep. Evaluate the situation before selecting a goal. Keep a useful gain for each companion, even when experience and motivations differ.

Known friends and teammates can start on one device. The first activities cover position margin, testing different advice, and recovering after an unfavorable outcome. Each has prediction, comparison, alternating real-table attempts and a short independent-play check. Takeaways and a next-time note survive closing and reopening.

## Installation and updates

For an existing Android or Windows Billiards Trainer installation with the content updater: open Check for updates, wait for the completed update, restart, then open Play → experience selector → Play Together · Preview. No new APK or EXE is required for this first content-only addition. The currently installed APK/EXE still needs an actual-device acceptance check.

Direct browser workspace: https://lovemyfreetime.github.io/billiards-trainer/companion.html

Chrome/Edge installation can use the separate companion manifest. The installed web app and native Trainer store data in their respective profiles; switching between them does not automatically synchronize sessions. Use the same environment for a trial, or transfer a companion backup. The shared browser service worker retains complete releases; the native updater retains the fixed HTTPS origin and checks SHA-256 and lengths before activation.

There is no separate installer or different signing identity in this release. Future native capabilities may require a normal installer update, as in the main app. Content updates do not automatically restart an active session.

## Feature inventory

Available means implemented in this preview; it does not imply physical-device validation. Next and Later items are plans, not functioning controls.

### Start & relationship

| Feature | Status | Purpose / boundary |
|---|---|---|
| Known companions on one device | Available | Names, session mood and time; no public profile needed. |
| A short practice agreement | Available | Ask before coaching, describe what happened, and test suggestions together. |
| Observe before choosing a goal | Available | Each person contributes a concrete starting observation. |
| Individual gains in a shared session | Available | Each player can take something different from the activity. |
| Partner preferences over time | Later | Feedback timing, contribution preferences, playing context and changing goals. |
| Invitation circles & discovery | Later | Friends, teammates, clubs and eventually opt-in partner discovery with mutual invitations. |
| Practical matching | Later | Availability, chosen venues, interests and feedback preferences; explain why a match is suggested. |
| Partner-owned devices | Later | Independent predictions, genuinely private feedback and chosen sharing. |
| Community controls | Later | Decline, disconnect, block and report when discovery is introduced. |

### Practice & learning

| Feature | Status | Purpose / boundary |
|---|---|---|
| Three complete starter activities | Available | Position margin, testing advice, and recovery after an unfavorable outcome. |
| Alternating attempts & undo | Available | Shared success criterion, five attempts per player and a correctable attempt record. |
| Relaxed, focused or match preparation | Available | Choose the session intent without a long questionnaire. |
| Individual difficulty & targets | Next | Different targets in the same activity; progress from demonstrations to independent execution. |
| Trainer setup and return | Next | Transfer layouts and relevant overlays, then return directly to the same activity. The current button opens Trainer only. |
| Learning through teaching | Available | Predictions, demonstrations, explaining back and testing a variation. |
| Recall & transfer checks | Later | Revisit discoveries in a different setup before showing the guides. |
| Structured routines & drill library | Later | Multi-session plans, cue control, aiming, speed, spin, banks, kicks, position, safeties and runouts. |
| Different ways to understand | Later | Adapt through seeing, hearing, trying and explaining, without fixed learner labels or IQ scoring. |

### Psychology & enjoyment

| Feature | Status | Purpose / boundary |
|---|---|---|
| Observation before explanation | Available | Record what happened before deciding why; either partner can revise an idea. |
| Pleasure & willingness to return | Available | Each reports whether the session was worth doing; keep this separate from results. |
| Competition and coaching boundaries | Available | Agree when advice is welcome; return to independent play at the end of an activity. |
| Pressure practice | Next | Agree a score deficit, shot clock or confident-opponent scenario, with an immediate pressure-off control. |
| Recognize influence & recover | Later | Practice composure around intimidating demeanor, distraction and rushing; debrief both perspectives. |
| Luck & decision quality | Available | Explore broader acceptable outcomes and a useful response to bad rolls; do not grade a decision from one outcome. |
| Bias-aware suggestions | Later | Address overconfidence, deference, unsolicited correction and uneven motivation with small prompts. |
| Social play & sustainable motivation | Later | Let people just play, adjust guidance and choose a different companion without guilt or public rankings. |

### Voice & assistance

| Feature | Status | Purpose / boundary |
|---|---|---|
| Local voice notes | Available | Record and replay short audio notes where microphone access is supported. No transcription yet. |
| Spoken prompts | Available | Optional device text-to-speech; availability depends on the installed browser or shell. |
| Keyboard microphone input | Available | Use the device keyboard microphone in any note field when the keyboard provides it. |
| External TTS capture connection | Next | Bring spoken answers into the companion workflow, then review the interpreted result. |
| Local transcription & interpretation | Next | Turn speech into checked observations, a suggested activity or a saved takeaway. |
| Local billiards knowledge & companion guide | Next | Versioned authored knowledge, small relevant excerpts and constrained app actions. |
| Conversation turn-taking | Later | Distinguish each companion and assistant output, preserve corrections and avoid duplicate saves. |
| Hands-free session controls | Later | Start, pause, record results and keep a discovery with spoken commands. |

### Continuity & app foundation

| Feature | Status | Purpose / boundary |
|---|---|---|
| Save & resume | Available | Names, agreements, observations, attempts and takeaways persist locally. |
| Shared discovery history | Available | Review each takeaway and the next-session choice. |
| Companion backup & restore | Available | Export and restore sessions with their audio notes; existing games are untouched. |
| Existing app updates | Available | Use the Trainer update system; activate a completed update by restarting. |
| Separate companion workspace | Available | Own page, files and data; a single entry from Play. |
| Windows, Android and browser layout | Available | Responsive touch-first interface; physical-device acceptance still required. |
| Layouts, snapshots and teaching clips | Later | Attach Trainer setups, annotated images and recorded explanations to discoveries. |
| Optional reminders & meeting plans | Later | Agreed next practice, with opt-in reminders and no missed-session penalties. |
| Field-trial feedback | Later | Check ease of use, partner experience and later learning across repeated sessions. |

## Voice foundation

The current build records short local voice notes with MediaRecorder and IndexedDB when microphone support is available. It can read prompts with Android's existing native device-TTS bridge or the browser speech synthesis engine. This does not replace any approved Chase narration in the main app. Dictation through the device keyboard can fill note fields.

External LLM TTS capture, automatic transcription, a local interpreting model, retrieval from the companion/billiards knowledge guide and validated app actions remain the next integration layer. No model, paid API or cloud service was introduced in this build.

## Data and isolation

Local storage key: billiards.playTogether.v1. Previous snapshot: billiards.playTogether.v1.previous. Records: people, pairs, sessions; a schema version and revision protect loading and reject stale simultaneous writes. Invalid stored data is retained for recovery. Microphone notes are in billiards-play-together-audio / notes.

Companion backup export contains the session state and audio. Restore validates the complete file and stages audio under new IDs before replacing companion state. The main Trainer backup includes companion local-storage records but does not include the separate companion audio database; use Companion backup for a complete voice-note copy.

Public partner discovery, individual accounts, cross-device private feedback and synchronization are not implemented. Shared-tablet notes are visible to both participants. No personality, intelligence or compatibility scores are assigned.

## Verified checks and limits

- Eight focused companion tests passed: start validation, durable notes and attempts, five-attempt turns and undo, invalid backup rejection, stale-tab overwrite rejection, completing and reusing a pair, practice-only result recording, and offline route/update integration.
- Existing background-update session test and all seven offline-loading tests passed. The updated experience navigation test passes the entry and route checks, then fails an unchanged pre-existing Zen source-pattern assertion. The asserted pattern is also absent in the original main-branch file. Zen runtime was not changed.
- Browser walkthrough completed: two companions, agreement, baseline notes, distinct gains, ten attempts, undo, reload preservation, independent-play stage, two takeaways, completion, discovery history, backup download and restoration from that exported file. These are synthetic test entries, not evidence of learning effectiveness.
- Play's existing experience menu opens the companion page. Tablet 1024×768 and phone 390×844 preview layouts have no horizontal document overflow.
- Microphone failure handling verified: the cloud test browser reports Requested device not found. Actual recording/playback and speech quality remain untested on the user's Android tablet.
- Actual Android/Windows content update activation and PWA installation remain untested on physical devices. The same existing updater is reused and new files are included in generated content inventories.
- No automated setup transfer to Trainer, AI inference, live matchmaking, or cloud synchronization is claimed. Open Trainer is an ordinary link; the companion session remains saved.

## First tablet acceptance session

1. Update the installed Trainer and restart. Open Play Together from Play's experience menu.
2. Start two test names. Agree how to practice; record or dictate a starting observation for each.
3. Choose an activity and try five attempts per person. Test Undo. Close and reopen: the same session should resume with both notes and counts.
4. Record and replay one voice note. Listen to one prompt. Check both work on this exact tablet/app version.
5. Finish with a takeaway each and a next-time choice. Check Discoveries and export a companion backup.
6. On the next content release, update and restart; confirm the same sessions and notes remain.

## Demonstration opportunity

A short real-table video can show two teammates starting with different observations, choosing one small experiment, comparing it in Trainer, and keeping different useful takeaways. The strongest demonstration for this preview is the complete low-input session and its saved continuation. Do not imply measured improvement before a real trial.


## November 12: Companion Play 0.2.0

### Requested direction

The companion entry belongs on the Play catalog and Play footer beside the other Play actions. It must not be an experience-switcher category. The shared switcher remains Trainer, Play, Zen and Home.

Use the main Trainer blue (#77c8ff) for Trainer and teal for Play beneath it, in the centered header and left navigation. Remove the top-right preview label and “Learning comes before logging.” Use plural companions and friends. The illustration uses the unchanged icons/zen-reference-table-v1.webp asset from Zen, with separate SVG shot overlays.

### Implemented

- 2–24 named participants. One shared group, adjacent partner sets, or two explicitly assigned groups.
- Individual observations, goals, takeaways, enjoyment responses and voice-note attribution for every participant.
- Each partner set / group has independent five-attempt turns and undo. Everyone returns to shared discoveries.
- Existing two-player sessions and full backups remain readable. Groups stored under the original internal pairs collection retain ordered membership; a reordered new roster gets its own group record.
- Devices page exports one session and imports it without replacing unrelated sessions. File sharing includes all participants’ written notes and counts. Audio remains local; full backups still include audio.
- Three-way text merge stops on conflicting edits; attempt IDs prevent duplicate imports. The receiving device keeps its own stage, completion state and voice recordings. Each device should record a different practice set.
- Share merged copies again between rounds. Copies are asynchronous; this is not live synchronization, independent private feedback, discovery or automatic networking.
- The full Trainer’s Play catalog and footer have a direct Companion Play button. Standalone Offline Play and active Local Table hosts do not show an entry to assets their packages do not yet contain.
- Content updater inventory rebuilt. No new native API or protocol is required.

### Next device milestone

Replace manual session-copy exchange with live invitations, per-participant contribution controls, automatic reconnect and a shared session timeline. Existing Local Table servers validate scored games and cannot carry companion state without an intentional server/protocol update. Avoid claiming the present file flow is effortless live collaboration. No external paid service was added.

### Verification

18 focused core tests cover legacy records, independent sets, 24 players, invalid groups, safe merge, conflicts, repeated imports and subsequent round trips. Browser QA covers four-person creation, separate set counts, per-set undo, reload persistence, four individual takeaway cards, completion, export and import preview. Responsive home checked at 1024 and 390 CSS-pixel frames with no document overflow. Physical Android file sharing and microphone remain device acceptance checks.
