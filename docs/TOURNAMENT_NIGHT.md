# Tournament Night in Billiards Play

Entry points: the Play header and Games catalog open `tournament.html`. This feature is part of the public live app at https://lovemyfreetime.github.io/billiards-trainer/tournament.html. Publish requested app changes to the public repository main branch by default, per the user’s October 19 instruction.

## Supported event sizes and formats

- 2–256 entries, with any integer field size. Singles count individual players; fixed doubles count pairs (up to 512 people).
- 1–64 numbered tables, independent of field size.
- Single elimination, full double elimination, balanced round-robin groups into single-elimination playoffs, and equal-chip survivor events.
- Elimination draws fill the next power-of-two chart with byes. Byes do not count as played matches or losses.
- Random draws shuffle once. Seeded draws use roster order and distribute seeds through a standard bracket seed order.
- Double elimination defaults to a reset final when the one-loss finalist beats the undefeated finalist. The optional one-match final is explicitly disclosed.
- Group rankings use match wins, rack differential, racks won, then original draw order. The director must approve standings before generating playoffs. Qualifiers are seeded by finishing position and group order; this first version does not promise group-rematch avoidance.
- Chip events use equal initial chips, lose one chip per match loss, retain the winner for the next contest, and queue surviving losers at the back. The director still confirms table assignments. When all tables are busy, surviving winners can wait for the next available opponent.

## Director workflow

Enter player names one per line, or fixed doubles partners separated by `|`. Create the draw, call ready matches to free tables, and enter final race scores. Calls reject occupied tables or entries already playing. A ready match may also be scored at the desk without a table assignment, provided neither entry is already playing another match.

The director can release assignments and undo actions in reverse order. To change an earlier result, undo its subsequent actions first. The audit history retains original actions and undo operations. This avoids silently changing opponents in matches that have already been played.

Saved events and templates use browser localStorage. Templates omit results and optionally include the roster. Export JSON to move or restore an event; imports create a separate event and retain earlier activity as a record, without restoring prior undo actions. CSV exports contain every match and guard spreadsheet formula interpretation. Browser printing supports the current view.

## TV and sharing boundaries

Open TV View creates a separate read-only page in the same browser profile/origin. It refreshes using BroadcastChannel and storage events, with a polling fallback. Connect that display to a TV via extended-desktop HDMI. Table cards show confirmed pairings and race targets; this release records final match scores rather than per-rack live scoring.

A spectator snapshot URL includes a compressed, read-only copy of the event in its fragment, excluding the audit log. It works without localStorage on a second device that can access the app. It is explicitly labeled as a snapshot and never claims cross-device live updates. Large fields may produce URLs that some messengers truncate. A local event with the same ID takes precedence on the director's computer and stays live there. The public live app and spectator links require no account sign-in.

There is no tournament backend in this repository. Cross-device live spectator synchronization, authenticated player phone scoring, and recurring season standings remain future work. A shared service needs separate director authorization, read-only spectator access, score confirmation/conflict handling, and durable event storage. Do not expose editing privileges through a spectator URL or silently use a third-party public relay.

## Verification

Run from repository root:

```sh
node tests/tournament-engine.test.cjs
node --test tests/play-engine.test.cjs tests/play-catalog.test.cjs tests/resource-navigation.test.cjs tests/background-update-session.test.cjs
```

The tournament engine suite simulates complete single/double events at every field size 2–70 and selected larger sizes through 256, verifies both final paths, two-loss elimination, byes, random/seeding behavior, table conflicts, groups, chips, scores, imports, and immutable updates.

For browser verification, make Playwright and Chromium available. The test starts its own local server; an existing server can optionally be specified with `TOURNAMENT_TEST_URL`. Run:

```sh
node tests/tournament-browser.cjs
```

Optional `TOURNAMENT_CHROMIUM_PATH` and `TOURNAMENT_CHROMIUM_ARGS` select an available compatible browser binary. The browser workflow uses fictional player names and isolated browser contexts, covering the Play entry point, 37-player draw, calls, scoring, TV updates, undo/reload, activity, templates, JSON round-trip, remote snapshot, doubles, phone layout and print output.

Verified in the implementation session: all engine assertions and four existing regression suites passed; the full browser workflow passed with headless Chromium at desktop, 1920×1080 spectator, and 390×844 phone sizes. Group and chip events were completed through the director UI. Cross-device snapshots were checked in an isolated browser context.
