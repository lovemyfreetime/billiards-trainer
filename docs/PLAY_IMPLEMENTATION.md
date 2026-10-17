# Play catalog build

Open `index.html?play=1`, the trainer's Play launcher, or Play in Zen's experience menu. This build belongs on `development/interactive-guide`; do not merge to production as part of this work.

All twenty games are selectable in both on-screen and real-table modes. `play-engine.js` contains the original four; `play-catalog.js` supplies the remaining sixteen. The in-app Rules view is the exact implemented house version; `PLAY_GAMES.md` holds the broader design direction.

## Included

- Shared on-screen table with the existing physics, aim/speed/follow/side controls, scratch detection and automatic scoring.
- Real-table scorekeeper with simple results for Killer/Poker and numbered multi-ball reporting for Cutthroat/Ghost.
- Five-round Poker with pass-and-peek private hands, draw-two/keep-one for successful pots, five-card evaluation, tied winners, and deterministic deck recycling.
- Killer lives and break retries; Cutthroat scratch revivals; Ghost lowest-first runouts and race to five.
- Per-action Undo including coordinates, pending private choices, deck state, result and player turn. Up to 45 saved actions; this is action history, not permission to redeal for luck.
- Browser save/resume, visible storage failures, optional turn speech, pause, rules and Train/Play/Zen links.
- Minimal table artwork shared with Zen, with a short aim indicator rather than trainer prediction overlays.

## Verification

Run pure game tests with `node tests/play-engine.test.cjs`. Run the browser flow test from the repository root with `CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node tests/play-flow.browser.cjs` and an installed Playwright package. The browser script starts and stops its own local static server; it uses isolated browser storage and blocks service workers for repeatable UI tests.

The browser flow covers full Killer/Poker games, Undo across elimination/results/private choices, reload, Cutthroat revival, an actual physics-driven pot, exact coordinate restoration, Train handoff and phone layout. Existing focused geometry, action-history, portable-file and Zen rendering tests also pass.

The broader existing Node suite has one pre-existing failure in `phone-play.test.cjs` at “First gameplay interaction enters native fullscreen.” The phone-play source/test are unchanged; running the HEAD version of that test reproduces the same failure. No unrelated fullscreen repair is included.

## Boundaries

Same-device privacy is pass-and-peek, not protection from a determined person with browser access. Undo cannot erase a player's knowledge of a revealed card. No paired phones, voice-command input, automatic physical-table vision, shot clock, share-card export or challenge-link generation is included in this first build. Audio is optional browser turn speech, not new recorded narration.

In real-table mode the room reports fouls. For Killer/Poker it can report Rack Empty when necessary rather than entering every ball number. Mandatory spot/rack steps wait for Table Ready. The engine knows scores and inventory; only the simulation can report real on-screen first-contact and rail facts automatically.

## Expanded table view

On-screen games have an Expand Table button on the table. It hides the game chrome and lets the same live canvas occupy the full window. Game View restores the scores and instructions without changing gameplay. Execute Shot and Undo remain available; Shot Controls opens an optional slider panel. Escape returns to game view. Poker card choices and match results return to game view automatically. Real-table scoring does not gain extra controls.

Expanded portrait tables rotate vertically. Rendering dimensions and pointer coordinates use the same rotation; the browser test verifies a cue-ball drag lands at the expected physical coordinate. `tests/play-expanded.browser.cjs` also covers view switching without state changes, actual simulated shooting, Undo, portrait slider bounds and unchanged real-table mode.


## Full catalog implementation

The new games are Kelly Pool, Secret Bounty, Twenty-One, Cribbage Pool, Billiards Bingo, Turf War, Battleship Billiards, Golf Pool, Undercover Saboteur, H-O-R-S-E, Equalizer, Bowliards, Ring Game, Three-Ball, Speed Pool and High-Low. The catalog has a name/style search and a scrollable list.

Private pass-and-peek views handle secret numbers, blackjack cards, saboteur roles, votes and fleet placement. Fleet placement offers shuffled valid arrangements and an explicit lock. Enemy attacks reveal only previously attacked cells. Votes do not reveal correctness until the final result. Public scores never display secret assignments. Saved state necessarily contains secrets on this shared offline device.

Bingo and HORSE use nine authored shot tasks, with a chosen pocket, route requirements for banks/kicks, and cue finish zones for draw/follow. HORSE currently uses this bank rather than a freeform shot editor. The same normalized layout resets for every attempt. Real-table mode shows a diagram and coordinates; a witness reports whether the full task succeeded. These first task layouts and Equalizer allowances should be tuned through playtesting.

Equalizer offers visible per-player miss allowances at setup (0–2) and one optional cue-ball reset per layout. Golf has six sequential pocket targets and a ten-stroke cap. Turf uses pocket capture and round-end ownership scoring. Ring and High-Low enforce the required first contact in the simulation; people referee it at a real table.

Bowliards uses free, non-scoring breaks, visit totals, standard strike/spare bonus arithmetic and tenth-frame bonus visits. Three-Ball counts breaks and foul penalties, with a six-stroke cap. Speed uses two attempts per player, ten-second foul penalties and the best valid attempt. Simulation time stops at the last drop; real-table mode has Start/Penalty/Finish buttons. Pausing, hiding the page, or reloading an active timed attempt marks it interrupted and ineligible. This is casual table-side timing, not certified competition timing.

Every action uses the existing state/table snapshot Undo path, including private choices, fleet locks, votes, attacks, scene resets and finishing a timed run. Returning from expanded table view is automatic for tasks, fleet setup, attacks, votes, card choices and results.

Additional verification:

- `node tests/play-catalog.test.cjs`: complete matches for every new game, tied Bingo, secret reassignment, crib obligations, fleet completion, private voting, route validation, 300/150/90 bowling scores and interrupted timers.
- `CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node tests/play-catalog.browser.cjs`: each new game in both modes, private reveal gates, Undo, expansion, actual solver pocket reporting, and phone catalog.

Equipment: standard table and cues; fifteen balls for general games, nine for Ring, ten for Bowliards, three for Three-Ball/Equalizer and one for Golf/Bingo/HORSE layouts. The app replaces cards, tally peas, score sheets, fleet boards, timers and role slips. A triangle rack works for the triangular racks; nine-ball can be arranged manually if no diamond rack is available.
