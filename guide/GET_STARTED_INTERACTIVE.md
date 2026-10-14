# Interactive Get Started

Get Started loads eight practice checkpoints on the live trainer table. Take the Wheel pauses narration without rebuilding the table. Try Again and the table Reset controls restore the current lesson checkpoint. Back, Next Lesson and the lesson selector change checkpoints only when a shot has finished. Narration ending never advances the lesson automatically.

Exit & Restore restores the player's original table, shot settings and Undo history. Finish & Keep Table retains the final practice table. An unfinished tour can be resumed after reload. Save Practice File exports the current lesson's starting checkpoint, including the Undo exercise's real shot history.

## Recording handoff

The eight supplied scripts are in `get-started-tour.json`, in lesson order. Record each as a separate Chase MP3 at one consistent speaking rate. Add these files under `guide/audio/`:

| Lesson | File |
| --- | --- |
| Welcome to Focused Practice | get-started-01.mp3 |
| Set Up and Aim Precisely | get-started-02.mp3 |
| Speed, Tip Contact, and English | get-started-03.mp3 |
| Execute and Compare Variations | get-started-04.mp3 |
| Plan and Execute Shot 2 | get-started-05.mp3 |
| Full Racks and Runout Planning | get-started-06.mp3 |
| Undo and Reset the Layout | get-started-07.mp3 |
| Guide and Explorer | get-started-08.mp3 |

After checking each recording against its script, set that step's `recordingStatus` to `recorded`. Update its matching start topic's audio array/status in `pool-audio-map.json`, add the recording to `audio-assets.json`, and bump the service-worker cache version. Pending slots display the exact narration as text and do not use older audio or browser text-to-speech.

## Engine behavior

Coordinates use the head-to-foot axis for X and the table width for Y. The presets use actual corner/side pockets and standard ball radius. The draw exercise tunes speed against the live solver for a safe target on the selected table size; follow/draw percentages are converted to state fractions. Shot 2 starts at the predicted leave, transfers to the actual leave after the first stroke, and waits for a second Execute Shot. The Undo exercise starts after a genuinely committed missed shot.

The eight portable session checkpoints are `layouts/get-started-01.billiards.json` through `get-started-08.billiards.json`, exported at 9-foot dimensions and cached for offline use. Loading the interactive tour adapts its setups to the player's selected table size.

Run `node tests/focused-get-started.browser.cjs` with Playwright/Chromium available. It checks all eight presets on four table sizes, shot execution, Shot 2 handoff, Undo/Retry, downloads, reload, original-state restoration, and mobile layout.
