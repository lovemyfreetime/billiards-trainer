# Private sequence search — development milestone

## What is implemented

The Companion can use `simulate_shot({stateId, shot})` with `root` or a returned private state ID. The browser retains the complete successor state, including every moved/pocketed physical ball and unchanged nonphysical markers. Each session freezes the actual table and calibration at Send. Simulations use the native `simulate(false)` implementation, the same solver used by preview/Execute, with no alternate physics model. The live state is restored in a `finally` block after every call. Search never animates Execute or writes table, history or Trainer storage.

The native solver now reports settled versus its existing 20-second time limit. An unfinished or scratched state does not receive a reusable successor ID. The integration changes output metadata, not the existing integration step, collision response, pocket geometry or stopping thresholds.

`search_runout({game:'9-ball', maxSimulations:360})` runs local batches for **one to three remaining object balls**. A legal early 9 can terminate a sequence; when the 9 is absent, clearing the supplied subset is explicitly a practice completion. The search is not enabled for full racks, 8-ball, 10-ball or last-pocket variants. It rejects object-ball IDs above 9. Legality covers first contact with the lowest active ball, scratches/off-table outcomes, required pot/rail events, settled output and an early 9. Breaks, push-outs and consecutive-foul history are outside scope. Never infer a complete tournament rules engine from this validator.

Candidate generation uses direct-pocket ghost geometry, swept blocker filtering, native squirt compensation, and a diverse coarse grid of speed, follow/draw and side spin. Normal elevation is fixed at 3 degrees. Beam width is three; similar leaves are pruned only when remaining identities and object-ball positions also agree. There is no bank/kick/combination generator, although a legal incidental early 9 can be recognized. Up to two distinct opening candidates are retained for inspection.

Every selected nominal sequence is replayed from root. Every successor ball state is compared with the search result before the sequence is labeled `nominal_sequence_replayed`. The model cannot create the recorded route cards merely by describing a successful runout.

## Risk and comparison

Cue-ball edge proximity is measured along the sampled path against native pocket-mouth and jaw segments. It is a geometric proxy, **not** exact pocket acceptance, collision clearance certification or scratch probability. It is used alongside pot progress, stroke demands and nearest-next-ball distance in an explicitly heuristic ranking. This is not yet a learned expert ranker or exhaustive next-angle optimization. Depth contributes through actual successful continuations, rather than a promise that every selected leave is ideal.

Finalists receive independent one-factor trials: aim ±0.003 radians (about 0.17 degrees), speed ±4%, follow/draw ±0.04 in the app's fraction units. These trial counts measure legal pots and scratches from nominal starting states. They do **not** establish whole-sequence robustness, next-position tolerance or a player's real-world runout odds. Side-spin error and cloth/rail parameter variations are not sampled in this milestone. A route with no observed scratch in these few trials is not automatically safe.

Budgets are 60–600 native simulations per search and 12 seconds wall time, with a per-message session cap of 1,400 simulations. The search yields to the browser every six calls for cancellation and progress. Each native call remains synchronous; cancellation cannot interrupt the middle of a single native shot. Search is currently on the browser thread, not a worker; device latency and responsiveness require further testing. No single AI request is made per simulation: the model requests the local batch and receives a result.

## Review interface

Recorded plans are saved alongside the reply. Expand a route, then a shot to inspect CB number, intended pocket, actual recorded pots, exact app settings, the native strike badge, simulated starting layout, sampled cue-ball route and predicted stopping outline. Layout diagrams are hypothetical simulation states, not reports of physical play. The source snapshot and native settings remain available.

Applying the opening is an explicit player action. It checks current ball identities/positions, table dimensions and shared calibration against the original message. If those changed, the card asks for a fresh search. Applying uses the ordinary Shot 1 action and native badge; Execute remains manual. Previous table restores the pre-application state. Intermediate starting layouts can be loaded explicitly for exploration; that is not verification that the physical shot happened.

## Validation

The original browser test covers existing desktop/phone Hub behavior. A new real-browser native-engine test uses an authored layout, unrelated to the source book: CB (0.7,0.6), 1 (0.3,0.2), 2 (1.27,0.2), 9 (2.2,1.05), in meters on the default table. It requires a three-shot finish, replays exact controls, checks successive layouts, tests root branching, cancellation, unknown-state rejection, time-limit rejection and stale-apply blocking, and confirms unchanged Trainer state/history/storage after search.

On this container's headless Chromium, an observed 360-budget run used 346 simulations in about two seconds and returned a three-shot 9-ball finish plus a distinct early-9 alternative. The first route's 18 independent perturbations produced 16 legal pots and zero scratches. These are single-layout simulator observations, not general strength or Windows/Android latency claims. Tests must be rerun after any solver or search change; exact counts and chosen candidates can change.

There have been **no signed-in model evaluation calls** for this milestone. Provider routing is checked with fixture model responses; shot search and replay use the real native engine. This establishes the engine/UI integration, not reliable live model tool choice or advanced pool judgment.

Commands:

```sh
node --test tests/companion.test.cjs tests/position-play.test.cjs tests/companion-search.test.cjs
CHROMIUM_EXECUTABLE_PATH=/tmp/chromium CHROMIUM_SINGLE_PROCESS=1 node tests/companion.browser.cjs
CHROMIUM_EXECUTABLE_PATH=/tmp/chromium CHROMIUM_SINGLE_PROCESS=1 node tests/companion-search.browser.cjs
```

## Next engineering work

Broaden the held-out layout benchmark and evaluate actual model explanations. Add continuation-aware robustness (including side-spin/calibration perturbations) before reporting position windows or runout probabilities. Move batch work into a worker or extract a pure solver after parity checks. Improve candidate generation and ranking before expanding depth or game formats. Preserve the distinction between a nominal verified finish and the most forgiving route found within a finite search.

This milestone is on development/practice-companion only. It does not update the production site, build Windows installers, publish APKs or automatically change existing downloaded development copies.
