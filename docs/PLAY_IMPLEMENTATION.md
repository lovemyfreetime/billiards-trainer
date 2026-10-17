# Play first playable build

Open `index.html?play=1`, the trainer's Play launcher, or Play in Zen's experience menu. This build belongs on `development/interactive-guide`; do not merge to production as part of this work.

Four selectable games: Killer, Poker Pool, Cutthroat and Ghost Runout. All use our house rules. `PLAY_GAMES.md` holds the twenty-game direction; the other sixteen are designs, not selectable unfinished placeholders.

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
