# Guide audio startup investigation

Reported symptom: a brief first-word blip, followed by several missing words, on single and automatic clips.

Sampled the first six seconds of welcome-fundamentals, welcome-more, main-pick-and-play-full-racks, drill-stop-shot, and analysis-overview-quick. Decoding succeeded; silence detection at -45 dB found sentence pauses but no several-second opening gap. This is a signal check, not a transcription or a test of the user's speakers.

The shared Guide player now preloads audio and routes it through a reusable Web Audio output. A newly opened or resumed output runs silent for one second before the narration clock advances. The output stays open between tracks, suspends after 30 seconds paused, and is released when changing modes or closing the Guide. Native playback remains available when Web Audio is unsupported. Stop and selection changes invalidate pending starts. Play/Pause reflects startup as well as actual playback. Existing MP3s and voice recordings are unchanged.

Verification:
- Startup unit tests: zero position during warmup, pause/resume position, context reuse, cancellation, native fallback.
- Chromium audio-signal test: first words detected at the output; no clock jumps in the first four seconds; manual, sequential-file, and automatic-lesson starts at zero; Stop during startup cancels playback.
- Full app browser test: all 365 catalog recordings available; main and Analyze playback, five category welcomes, five deferred resource destinations, Explorer mappings, and offline reload pass.

The original device interruption was not reproduced in this environment. The new output initialization is a mitigation, not confirmation of a hardware fault or proof that the user's device is fixed. If it persists, compare the same MP3 outside the app and compare built-in/wired audio with Bluetooth.
