# Get Started practice lessons

Get Started uses the existing compact Guide player above the table. The familiar play/pause, skip, Auto, Read, More and lesson selector remain. Try the Shot pauses narration and closes details so the player can practice on the live table. Selecting a lesson loads its calibrated setup. After a Get Started narration, Auto displays a silent five-second countdown beside the lesson selector and a prompt on the table before loading the next lesson. The first table gesture is consumed as a pause/handoff without changing aim or ball positions; subsequent gestures control the table. Practicing cancels the countdown and shows a Next Lesson button in that same compact row, without opening details or adding a footer panel. After lesson 8, Auto plays the closing narration and closes Get Started when that recording ends, without a closing countdown, changing the practice table, or wrapping to lesson 1. Tapping the table cancels this close. Selecting another topic, closing the player, switching Auto off, and browsing Read/More cancel pending transitions.

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

The supplied Chase completion recording is `guide/audio/get-started-complete.mp3`, copied without alteration and included offline. It plays after lesson 8 and closes the player on audio end. It does not announce a modal closing. Guide and Explorer highlight at their mentions in this replacement recording. Tapping the table cancels the recording and automatic close without changing aim. No synthesized fallback voice is used.

## Lesson layouts and control attention

Quick Start retains the eight practice setups in the compact player. During narration, the current lesson's controls glow yellow, including Execute Shot, aim, speed, follow/draw, English, Shot 2, cue visibility, racks and Undo. Table-edge sliders and phone action buttons receive the same attention as their desktop equivalents. Pause, buffering, Stop, closing, and switching to Explorer clear lesson attention; resume restores it. Reduced-motion mode keeps a steady outline. The final lesson and completion recording retain their timed Guide/Explorer cues.

Selecting a Guide lesson with a starting setup loads that lesson's first native layout; Balls and Read/More still provide reset and additional setup actions. Busy shots reject layout changes, and delayed responses from an earlier lesson cannot replace a newer lesson or Quick Start table. `tests/lesson-highlights.browser.cjs` covers these behaviors through native audio playback on desktop and phone, including live slider input and reduced motion. Use the explicit Trainer entry (`index.html?train=1`) in browser tests; a fresh plain entry opens the experience chooser.


## Complete lesson sequencing

Guide shows all 141 lessons across Fundamentals, Physics & Tools, Drills, Exercises and Resources, including lessons that also explain Explorer controls. Advanced lessons are labelled, not filtered out. The curriculum in `pool-audio-map.json` is the single order for numbered menus, Previous/Next and Auto. Guide defaults to Auto on, remembers its own Auto preference, and stops at the end of the selected category. Quick Start always opens at lesson 1 with its separate Auto setting; its eight recordings and practice checkpoints are matched by stable topic IDs. Cancelling an announcement removes its pending playback callbacks.

`tests/lesson-sequence.browser.cjs` exercises every Guide recording through a native media end, then plays all eight Quick Start recordings in sequence. Guide media is sought near its end after playback starts; Quick Start recordings play completely at an accelerated test rate, with only the practice wait shortened in that browser test. The offline Windows and Android tests inject `tests/webview-assets/lesson-sequence.js` before app startup and verify the same full playlists inside WebView2 and Android WebView, including actual five-second Quick Start practice waits. The probe is a test resource, not part of the shipped web app.


Android runs each Guide section and Quick Start as separate bounded checks. This preserves all 146 Guide recordings/introductions, the eight complete Quick Start recordings, and actual practice waits, without imposing a single five-minute budget on their combined mobile run. Each missing/stalled recording still has its own deadline. The probe reports its current phase, topic, verified counts and timing; Android timeout diagnostics also include Guide and tour state. `tests/native-lesson-probe.browser.cjs` runs the shared probe with the Android phase boundaries and verifies that a missing recording produces a specific failure. `LESSON_PROBE_MODE=all` exercises the combined mode used by Windows.
