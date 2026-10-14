# Get Started practice lessons

Get Started uses the existing compact Guide player above the table. The familiar play/pause, skip, Auto, Read, More and lesson selector remain. Try the Shot pauses narration and closes details so the player can practice on the live table. Selecting a lesson loads its calibrated setup. Auto advances through the eight recordings and stops after the final lesson; using the table pauses narration.

More lists all eight lessons. Each has Load layout, Download layout, and Download MP3. Loading uses the selected table size and live solver. Downloaded native session files use 9-foot dimensions and retain shot settings and history, including the Undo exercise. The table Reset restores the selected lesson checkpoint while Get Started is open. Closing the player keeps the practice table.

All eight supplied MP3s are used unchanged, with normal playback speed. The shared audio helper uses native HTML media playback; it does not create AudioContexts, extra gain, compressors, warmup sources, or resampling graphs. This applies to Guide, Explorer, Analyze welcome and Walkthrough narration too.

The supplied scripts, recording URLs and normalized setups are in `get-started-tour.json`. Follow/draw percentages are converted to fractions for the engine. The draw setup tunes speed for a safe target on the chosen table size. Shot 2 transfers the planner to the actual first-shot leave and waits for another Execute Shot. The Undo lesson starts after a genuinely committed miss.

`tests/focused-get-started.browser.cjs` verifies the compact interface, all eight recordings, all eight More entries and downloads, calibrated shots on four table sizes, Shot 2, Undo, final Auto stop and phone width. `tests/audio-startup.test.cjs` and `tests/audio-startup.browser.cjs` verify native playback without custom audio processing.
