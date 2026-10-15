# Learning structure verification

Story: select an existing or new lesson → open Practice → see purpose, instructions, success, and transfer → load/reset the matching table → open a physical setup sheet → reproduce the ball/target geometry and record physical attempts.

## Confirmed

- `node tests/learning-catalog.test.cjs`: all 482 original merged Main/Shared entries retained; 487 supplemental contracts including five new physical fundamentals; 37 native setup files parse; all eight Get Started IDs map to their exact layouts; all 11 learning paths resolve to discoverable topics.
- `tests/learning-catalog.browser.cjs`: all eight Get Started selections, four-criterion cards and reset flows; Undo history preserved; new written fundamentals have no unrelated MP3; strategy and tool topics are discoverable; ordinary lesson load buttons load exact ball centers; all 37 starter URLs return successfully; the physical Undo sheet uses the original pre-shot positions; desktop and 390px phone layouts fit; no browser page errors or missing local requests in that flow.
- The same browser test installs the actual service worker, turns the network off, follows a deep link to a drill sheet, renders its diagram/contracts, and changes to a physical-fundamentals lesson offline. The query-string practice route falls back to the cached practice page rather than the main application.
- `tests/practice-layouts.test.cjs`: all 29 prior native setup files, 85 prior bindings, narrated exact drill coordinates, ball spacing, round trips, and prior audio pacing checks passed.
- Guide start/autoplay/mode tests and resource navigation tests passed.
- Full-rack geometry/dispatch, six/seven-ball and straight-pool layouts, and inline script parsing passed.
- Practice-tool geometry tests and real browser checks for rolling-reference conditions, counter persistence/default/collapse, and phone placement passed.
- JavaScript syntax and `git diff --check` passed.

## Existing focused-tour regression observation

The legacy `focused-get-started.browser.cjs` was also exercised in an isolated copy with only screenshot output paths adjusted and a longer allowance for its current completion recording. Its four-table-size shot predictions, first-shot execution, Shot 2 continuation, Undo/download history, and eight native recordings reached their checks successfully. Its final phone step failed because the script blindly toggles Get Started twice after completion; the current `closeOnEnd` completion already closes it. No completion or audio behavior was changed in this work. This legacy script is not counted as a fully passing test. The new browser test independently checks the current phone Guide and lesson reset flows.

## Practical limits

- This was software/source review, not physical-table validation or a measurement of student improvement.
- Existing table defaults, physics, shot execution, source MP3s, and starter files remain unchanged.
- Added written criteria are supplemental notes, not newly recorded narration. Five new fundamentals explicitly show audio pending.
- The manual practice record is printable. It does not automatically track physical makes/misses, judge cue delivery, referee a game, or supply a verified strategy solver.
- Setup coordinates are derived from each source file. On a differently sized physical table, preserve diamond fractions, retain actual ball and target sizes, and recheck ball-width offsets and alignment.
- Existing coordinate-drill narration opens expanded on the practice sheet so its exact sequence and constraints are included when printed.
- Browser checks used an isolated headless Chromium. Android hardware performance and physical stroke execution were not measured.
- Native Windows/Android installer packages and production were not rebuilt or published in this change.
