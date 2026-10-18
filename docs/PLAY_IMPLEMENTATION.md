# Play — real-table game room

Open `index.html?play=1`. Work stays on `development/interactive-guide`; production is separate.

Play is now a dedicated real-table scorekeeper on every device. It has no playable table, canvas, cue controls, speed/spin sliders, or table expansion button. Trainer and Zen remain the places for on-screen shooting. Optional collapsed setup diagrams remain for games whose real-table shots need a layout reference.

## Games and controls

All twenty house games remain available: Kelly Pool, Secret Bounty, Cutthroat, Poker Pool, Twenty-One, Cribbage Pool, Bingo, Killer, Turf War, Battleship, Golf, Undercover Saboteur, HORSE, Ghost Runout, Equalizer, Bowliards, Ring Game, Three-Ball, Speed Pool and High-Low. In-app Rules are the exact implemented version; `PLAY_GAMES.md` records the broader design direction.

The engines own rules and deterministic state. `play-presentation.js` owns four colored families and vector symbols. Selecting a game updates a preview; Start Game opens player setup. Limits are sourced from the engine. There is no screen/real mode choice: every new Play session is real-table mode.

Players report made balls, misses and fouls. Numbered games offer multi-ball selection; Turf/Golf also report pockets. The app owns turn order, scores, lives, card dealing, target assignment, private roles, votes, fleet attacks, bowling bonuses and match results. Real shots, first-contact legality, bank/kick routes and cue finish zones are witnessed by the room.

Private views use a pass-to-player screen before revealing numbers, cards, roles, fleets or voting controls. Public status inspection omits secrets. Privacy is shared-device pass-and-peek; device storage contains the complete game.

Speed Pool has Start, Penalty and Finish controls. A witness verifies clearance; every foul adds ten seconds. Pausing, hiding or reloading an active run marks it interrupted and ineligible. HORSE currently uses an authored shot bank rather than a freeform editor. Equalizer offers visible miss allowances and one cue-ball reset per layout.

## Device layout

The shell has a wrapping header, bounded player grid, one scrolling game panel, and a persistent Undo/navigation footer. No table consumes space. The catalog has a bounded, independently scrollable game grid. On phones, tablets and short windows its selected-game preview is a compact bottom bar or sidebar; it cannot push the roster below the viewport. Small screens scroll the same twenty readable choices. Native fullscreen remains supported, but Play never forces landscape orientation.

An open dialog is reopened above native fullscreen's top layer without replacing its contents, preserving setup and private screens on first interaction.

## Save and Undo

The existing storage key remains `billiardsPlaySession-v1`; its current payload version is 2. It stores game state and up to 45 state snapshots, without simulated table snapshots. Version-1 sessions migrate to real mode, including all Undo entries. Scores, turn order, pending cards, target numbers, votes and game progress are preserved. A live timed run is marked interrupted on reload. Play does not restore or manipulate the Trainer/Zen layout when scoring or using Undo.

## Verification

- `node tests/play-engine.test.cjs` and `node tests/play-catalog.test.cjs`: all original and additional game rules, deterministic full matches, foul precedence, ties, private reassignment, bowling and timing.
- `CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node tests/play-flow.browser.cjs`: original four real-table games, full Poker showdown, private choice/Undo, elimination/reload, Cutthroat revival, Ghost inventory, unchanged Trainer layout and no simulated table.
- `... node tests/play-catalog.browser.cjs`: sixteen additional real-table games, fleet placement, target privacy, Undo and catalog.
- `... node tests/play-room.browser.cjs`: nine device shapes from 360×640 and 640×360 through 1440×960, immediate roster visibility, scroll access to the final game, always-visible preview/start, search, scorekeeper controls, and version-1 session/Undo migration.

The former expansion tests were retired with the removed feature. Browser scripts start/stop local servers and block service workers for repeatable checks; the development deployment is also checked live.
