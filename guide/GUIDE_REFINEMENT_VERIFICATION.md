# Topic layouts, practice handoff, and narration inventory

This work is restricted to `development/interactive-guide`.

## What changed

All 141 selectable Main Guide entries now have different physical geometry: Get Started 8, Fundamentals 24, Physics & Tools 33, Drills 33, Exercises 37, Resources 6. This includes category introductions. The 133 non-Get-Started scenes use the native layout parser and apply before narration. Original Get Started snapshots/history and the ten coordinate-drill ball positions are retained.

All ordinary lessons now offer Try the Shot. Autoplay uses a ten-second countdown after the final audio clip; a first table gesture hands control over without aiming or dragging. Practice cancels advancement. Balls and Reset Layout restore the current checkpoint. Explorer explanations preserve the user's table. Written lessons without a recording remain available for practice and do not silently autoplay past the gap.

A full inventory covers 487 Main entries, 162 Analyze entries, and every one of the 650 MP3 files. The declared Main and Analyze transcripts were compared with the running browser maps: all 649 match. This checks catalog construction, not actual speech transcription. Of 141 selectable Main items, 136 have audio. Five physical fundamentals need Chase recordings. Duration screening flags 29 selectable items for listening review; the full inventory also marks contextual narration outside the reference band.

`audio-review.html` compares the existing clip with a normal-speed Chase reference and displays the recording script/SSML. The recording queue specifies Speechify Chase (US), starting at +30% prosody. No MP3 was replaced, processed, or re-recorded. Speechify was unavailable as a connected tool in this session.

## Validation

- `node tests/topic-scenes.test.cjs`: 141 different native geometries; ball bounds/separation; inline/downloadable file agreement; exact narrated coordinate drill ball positions; all 650 audio SHA-256 hashes match the audited files; missing scripts use Chase.
- `node tests/learning-catalog.test.cjs`: 482 original entries retained, 487 learning cards, 151 referenced native setup files, exact eight Get Started bindings, all learning paths resolve.
- `CHROMIUM_EXECUTABLE_PATH=... node tests/topic-guide.browser.cjs`: every one of 133 new scenes loads and retains the test friction calibration; narration starts after loading; first mouse drag/touch hands off; the second gesture aims; reset restores; actual ten-second advancement; tap cancels it; pending recording remains written practice; Explorer preserves geometry; compass enabled; player fits desktop/390px phone widths. Final lesson and busy-shot protections are included.
- `CHROMIUM_EXECUTABLE_PATH=... node tests/learning-catalog.browser.cjs`: all eight Get Started practice/reset/history flows; physical fundamentals; promoted strategy/tools; exact scene ball centers; native diagrams/coordinate sheets; offline service-worker installation; deep-linked practice sheets and category scene loading offline; all 34 primary narration review/recording items available offline.
- Existing audio startup, Guide autoplay/start/skip, original practice layouts, full rack, and practice tool tests pass. Inline scripts parse and `git diff --check` passes.
- A solver sweep adjusted eleven new bank/kick/multiple-rail prepared aims and speeds so the default simulator completes the bank or contacts the intended kick target. These are teaching starting points, not promises on a differently calibrated physical table.

## Limits

Duration-based WPM is a listening screen, not an auditory quality score. It includes intentional pauses and assumes catalog text matches the recording. The earlier `AUDIO_PACING.json` documents slowing ten coordinate drills to about 174 WPM; those should be compared first against the approximately 211 WPM short-lesson median. Both slower and faster candidates are queued. The five missing MP3s and actual pacing re-recordings remain pending Speechify access.

Unique arrangements do not automatically evaluate physical technique, cue access, or student performance. The solver checks above are software checks, not physical-table validation. Existing coordinate drills remain manually attempted lessons rather than solved demonstrations. Browser checks use headless Chromium; native Windows/Android/Chromebook installers are not rebuilt by this change.


## Speechify recording batch — 2026-10-15

- Five missing physical-fundamentals recordings and 29 queued replacements were synthesized through Speechify Speech with Chase, Simba 3.2, explicit +30% SSML prosody. No time stretching was applied.
- All 34 MP3s fully decoded with ffmpeg, have distinct SHA-256 hashes, and every replacement differs from its prior file. Exact scripts, before/after durations, hashes and synthesis settings are retained in NARRATION_RECORDINGS.json.
- Coverage: all 141 selectable Main topics have audio and unique prepared layouts; the complete audit covers 649 Main/Analyze declarations and 655 physical MP3s.
- Catalog, Get Started and offline audio URLs are versioned to refresh replacements. Five fundamentals lessons now enable narration and autoplay.
- Native layout/catalog checks and desktop/phone playback, load-before-audio, real countdown, tap cancellation, reset, final-lesson stopping and busy-shot guards passed. Physical sheet cache references were updated with the catalog versions.
- Duration screening retains the original 211.1 WPM reference: 12 recordings still sit outside its ±15% band. All 34 were re-recorded as authorized; naturalness, spoken-text accuracy and pronunciation require listening. Do not treat matching synthesis settings or MP3 decoding as perceptual approval.


## Visual variety and silent practice prompts — 2026-10-15

Supersedes the earlier coordinate-only uniqueness assessment. Redesigned 123 scenes; retained the 8 linked Get Started snapshots and 10 drills whose narration specifies coordinates. SCENE_VARIETY.json records all six pocket destinations, eight 45-degree approach sectors, left/right cuts and the full 1–15 ball palette. The gallery provides a visual review of every scene.

Eleven bank/kick scenes are tuned against native physics (one rail in the explicitly named one-rail lesson; two, three or four cushions elsewhere). Yellow references use the verified contact points. Bank targets pot and kick targets are reached after the intended cushion sequence. Seventy-three direct pocketing setups are tuned for a starting pot; squirt/swerve comparison scenes intentionally retain uncompensated examples. The transient prediction probe restores aim, speed and cue position after every candidate.

Get Started and Guide use a yellow felt-anchored visual prompt during the ten-second timer. Intermediate transition speech is removed; the final Get Started closing recording is retained. Tapping cancels the timer and removes the prompt, with Next Lesson visible. Small portrait tables use a compact prompt to keep it inside the felt.

The screenshot showed stale review JSON with the five fundamentals marked pending. The review now requests versioned, network-first metadata with offline fallback. Media tests load metadata for all five actual MP3s. Other 29 recordings are marked approved by the user; 12 duration outliers remain measurement evidence, not unresolved listening issues.

## Narration-linked cues and default playback — 2026-10-15

- The thirty-degree lesson now starts with a natural-roll, approximately half-ball cut. Its prepared speed (0.95) both pockets the target and produces the eligible 30° reference. The reference reaches the cushion, with an incoming-line extension and an angle arc. Existing exclusions for stun, draw, strong side spin, and extreme cuts still apply.
- Main Guide opens with Auto On and a new Chase introduction explaining Auto Off, independent experimentation, table practice, and Explorer. The shared welcome was freshly recorded without its former “Turn on Auto” instruction. `GUIDED_CUES_RECORDINGS.json` records both original exports and their hashes. Auto Off remains off across category changes until the Guide is reopened; the last lesson never loops.
- `narration-cues.json` contains 496 transcript-constrained, audio-hash-bound tracks and 1,111 timed references. Build-only PocketSphinx alignment maps approved words to the MP3 clock. Playback, seeking, buffering, pause, stop, category changes, and practice handoff control the spotlight lifecycle. Eight recordings about physical fundamentals, real-table calibration, or external resources contain no applicable on-screen feature cue.
- Yellow, non-intercepting spotlights track live canvas geometry (including the actual rail-diamond offsets), balls, overlap/cut contact, ghost ball, natural-roll reference, tangent, paths, markers, and pockets. Control references reveal the relevant panel/advanced section and scroll it into view. Only presentation/disclosure changes occur: no shot execution or parameter adjustment.
- Fullscreen is requested at startup. Ordinary browser tabs retry on the first trusted interaction because browser policy requires user activation. The existing top-right button exits; explicitly exiting disables further automatic entry for that load. Fullscreen and disclosure navigation do not pause narration.
- Automated verification passed: all 141 scene files and media hashes; 496 cue-track hashes and ordered/non-overlapping cue bounds; native 30° geometry and opening pot; 73 prepared opening pots and 11 rail examples; real-audio seek/pause/resume cues; Auto defaults and retained user choice; advanced disclosure; desktop/phone handoff; ten-second countdown and final stop; and installed service-worker operation with new cues and both new recordings offline.

## Curved massé starters and geometry-shaped highlights — 2026-10-15

- Replaced all five massé starter arrangements, including the three Physics & Tools examples, with native simulated curves around an object ball blocking the direct route. Prepared controls and geometry are in `topic-masse-scenes.json`, reproducibly applied by the scene builder. All five reach the intended target with zero cushion contacts. Their pre-contact deviation from a straight chord is 84–125 mm; the cue ball clears the blocking ball in the table plane. The solver and calibration are unchanged.
- During massé Guide lessons, jump takeoff/landing and clearance callouts no longer obscure the cloth curve. The native 3-D trajectory remains the source for the displayed path. Ordinary jump lessons retain their flight overlays.
- Cue-ball and object-ball highlights use unfilled circular outlines at the actual displayed ball boundary. Ghost/contact cues show the ghost and object together. Radius limits keep the two outlines from overlapping at contact.
- Tangent highlights now trace the exact clipped native line from cushion to cushion. Aim, natural-roll, and predicted-path references use continuous yellow polylines rather than point boxes. Curved-path mentions are included in the existing audio-clock cue sheet (496 tracks; 1,115 cues).
- Checks: native five-scene blocker escapes, non-overlapping circle geometry, no rectangle around balls/lines, full tangent endpoints, full curved polyline, pause cleanup, desktop/phone handoff, complete media/cue hashes, unique portable layouts, standard narration flow, and installed offline assets.
