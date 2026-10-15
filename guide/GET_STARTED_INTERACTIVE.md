# Get Started practice lessons

Get Started uses the existing compact Guide player above the table. The familiar play/pause, skip, Auto, Read, More and lesson selector remain. Try the Shot pauses narration and closes details so the player can practice on the live table. Selecting a lesson loads its calibrated setup. After a Get Started narration, Auto displays a circular ten-second countdown beside the lesson selector before loading the next lesson. The first table gesture is consumed as a pause/handoff without changing aim or ball positions; subsequent gestures control the table. Practicing cancels the countdown and shows a Next Lesson button in that same compact row, without opening details or adding a footer panel. After lesson 8, Auto uses the same ten-second countdown to close Get Started without changing the practice table or wrapping to lesson 1. Tapping the table cancels this close. Selecting another topic, closing the player, switching Auto off, and browsing Read/More cancel pending transitions.

More lists all eight lessons. Each has Load layout, Download layout, and Download MP3. Loading uses the selected table size and live solver. Downloaded native session files use 9-foot dimensions and retain shot settings and history, including the Undo exercise. The table Reset restores the selected lesson checkpoint while Get Started is open. Closing the player keeps the practice table.

All eight supplied MP3s are used unchanged, with normal playback speed. The shared audio helper uses native HTML media playback. Before a fresh clip it plays 400 milliseconds of a silent WAV to open the output while the narration clock stays at zero. Pause cancels both the silent lead-in and narration. It does not create AudioContexts, gain, compressors, or resampling graphs. This applies to Guide, Explorer, Analyze welcome and Walkthrough narration too.

The supplied scripts, recording URLs and normalized setups are in `get-started-tour.json`. Follow/draw percentages are converted to fractions for the engine. The draw setup tunes speed for a safe target on the chosen table size. Shot 2 transfers the planner to the actual first-shot leave and waits for another Execute Shot. The Undo lesson starts after a genuinely committed miss.

`tests/focused-get-started.browser.cjs` verifies the compact interface, all eight recordings, all eight More entries and downloads, calibrated shots on four table sizes, Shot 2, Undo, final Auto close and phone width. `tests/audio-startup.test.cjs` and `tests/audio-startup.browser.cjs` verify native playback without custom audio processing.

## Between-lesson Chase prompt

The countdown works now. Its supplied Chase recording is `guide/audio/get-started-next-lesson-shortly.mp3` and is connected. The recording says: “Next lesson will start shortly. Tap the table to try this shot.” The approved file is included in the offline cache without alteration. The counter begins when the prompt actually starts playing; a blocked or unavailable recording falls back to the visual countdown. Tapping to practice stops the prompt and countdown.

`tests/lesson-countdown.browser.cjs` verifies real ten-to-zero timing, mouse/touch first-gesture gating, second-gesture aiming, cancellation, Next Lesson, final stop, phone layout, and optional transition-voice behavior.

The first offline-cache activation does not reload the page. Later controller updates also defer reload while Guide/Explorer, Analyze, or a shot is active, preventing startup narration from being interrupted.

## Completion and learning tools

Floating cue-tip badges start off at each app startup and in every Get Started setup/download, including Undo snapshots. Players may enable them in Options. Lesson 8 gives Guide and Explorer a yellow background/ring at their narration cues; pause or changing lessons clears attention.

The completion script in `get-started-tour.json` is awaiting a supplied Chase recording. No synthesized fallback voice is used. When supplied, the completion recording finishes before its ten-second closing countdown begins. Until then the visual closing countdown works without requesting a missing file.
