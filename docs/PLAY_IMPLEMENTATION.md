# Play — real-table game room

Open `play.html` (legacy `index.html?play=1` redirects to it). Work stays on `development/interactive-guide`; production is separate.

Play is now a dedicated real-table scorekeeper on every device. It has no playable table, canvas, cue controls, speed/spin sliders, or table expansion button. Trainer and Zen remain the places for on-screen shooting. Optional collapsed setup diagrams remain for games whose real-table shots need a layout reference.

## Games and controls

All twenty house games remain available: Kelly Pool, Secret Bounty, Cutthroat, Poker Pool, Twenty-One, Cribbage Pool, Bingo, Killer, Turf War, Battleship, Golf, Undercover Saboteur, HORSE, Ghost Runout, Equalizer, Bowliards, Ring Game, Three-Ball, Speed Pool and High-Low. In-app Rules are the exact implemented version; `PLAY_GAMES.md` records the broader design direction.

The engines own rules and deterministic state. `play-presentation.js` owns four colored families and vector symbols. On desktop, selecting a game updates a preview and Start Game opens player setup. Phones, touch tablets and small windows skip the preview: tapping a tile opens setup directly. Limits are sourced from the engine. There is no screen/real mode choice: every new Play session is real-table mode.

Players report made balls, misses and fouls. Numbered games offer multi-ball selection; Turf/Golf also report pockets. The app owns turn order, scores, lives, card dealing, target assignment, private roles, votes, fleet attacks, bowling bonuses and match results. Real shots, first-contact legality, bank/kick routes and cue finish zones are witnessed by the room.

Private views use a pass-to-player screen before revealing numbers, cards, roles, fleets or voting controls. Public status inspection omits secrets. Privacy is shared-device pass-and-peek; device storage contains the complete game.

Speed Pool has Start, Penalty and Finish controls. A witness verifies clearance; every foul adds ten seconds. Pausing, hiding or reloading an active run marks it interrupted and ineligible. HORSE currently uses an authored shot bank rather than a freeform editor. Equalizer offers visible miss allowances and one cue-ball reset per layout.

## Device layout

The shell has a wrapping header, bounded player grid, one scrolling game panel, and a persistent Undo/navigation footer. No table consumes space. The catalog has a bounded, independently scrollable game grid. Phones and touch tablets have no selected-game preview panel. Narrow portrait phones use a two-column scrolling list; landscape and wider screens use denser grids. Small screens scroll the same twenty readable choices. The dedicated Play entry does not load Trainer CSS, phone controls, native fullscreen startup or orientation locks. Its own viewport helper tracks visible browser height and keyboard/orientation resizing without overriding intentional pinch zoom.

An open dialog is reopened above native fullscreen's top layer without replacing its contents, preserving setup and private screens on first interaction.

## Save and Undo

The existing storage key remains `billiardsPlaySession-v1`; its current payload version is 2. It stores game state and up to 45 state snapshots, without simulated table snapshots. Version-1 sessions migrate to real mode, including all Undo entries. Scores, turn order, pending cards, target numbers, votes and game progress are preserved. A live timed run is marked interrupted on reload. Play does not restore or manipulate the Trainer/Zen layout when scoring or using Undo.

## Verification

- `node tests/play-engine.test.cjs` and `node tests/play-catalog.test.cjs`: all original and additional game rules, deterministic full matches, foul precedence, ties, private reassignment, bowling and timing.
- `CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node tests/play-flow.browser.cjs`: original four real-table games, full Poker showdown, private choice/Undo, elimination/reload, Cutthroat revival, Ghost inventory, unchanged Trainer layout and no simulated table.
- `... node tests/play-catalog.browser.cjs`: sixteen additional real-table games, fleet placement, target privacy, Undo and catalog.
- `... node tests/play-room.browser.cjs`: nine device shapes from 360×640 and 640×360 through 1440×960, immediate roster visibility, scroll access to the final game, always-visible preview/start, search, scorekeeper controls, and version-1 session/Undo migration.

The former expansion tests were retired with the removed feature. Browser scripts start/stop local servers and block service workers for repeatable checks; the development deployment is also checked live.


## Android isolation and density

`play.html` is a standalone entry containing only Play's engines, symbols, styles and viewport helper. It shares the same origin and saved-session key, preserving existing game state and Undo. The old query route redirects before loading the Trainer. Train and Zen links explicitly return to the root app. Browser-default font sizes cannot inflate inherited Play controls: the Play root/dialog and component typography are explicitly scoped; the broad inherited-font shorthand was replaced with font-family inheritance.

Compact tiles retain full game names for accessibility, prevent player counts wrapping, and bound visible names to two lines. Portrait phone choices scroll; larger/landscape grids fit more choices without oversized hero content. Setup remains one tap away. The catalog dialog itself has no giant keyboard-focus frame; interactive controls retain focus indicators.

`tests/play-android.browser.cjs` uses Android Chrome/Samsung user agents, touch/mobile contexts, 360–1280 CSS-pixel widths, portrait/landscape, DPR 2, and an injected 32px browser-default font. It checks isolation from Trainer resources, measured typography, tap-target bounds, readable player counts, access to every game, one-tap setup, scoring and Undo. These are browser emulations, not physical-device tests.
