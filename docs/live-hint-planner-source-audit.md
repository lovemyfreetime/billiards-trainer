# Live four-ball hint planner: source audit and implementation design

Date: 2026-10-07. Status: source-level feasibility audit; external projects have not been built or benchmarked. No hint engine has been installed in the trainer yet.

## Conclusion

Build a deterministic, rolling four-ball beam search using Billiards Trainer's own simulator. Use the audited projects as algorithm references rather than replacing the physics engine or importing a pretrained policy. Four-ball search means the current legal object ball plus the next three, while every other live ball remains in the simulated collision state.

## Audited sources

### Pooltool
Revision: 81040e931facada508bbab2e53ab820295bbd90e.
[Potting geometry](https://github.com/ekiefl/pooltool/blob/81040e931facada508bbab2e53ab820295bbd90e/pooltool/ai/pot/core.py), [aiming](https://github.com/ekiefl/pooltool/blob/81040e931facada508bbab2e53ab820295bbd90e/pooltool/ai/aim/core.py), [simulation](https://github.com/ekiefl/pooltool/blob/81040e931facada508bbab2e53ab820295bbd90e/pooltool/evolution/event_based/simulate.py), [nine-ball rules](https://github.com/ekiefl/pooltool/blob/81040e931facada508bbab2e53ab820295bbd90e/pooltool/ruleset/nine_ball.py).
Useful: ghost-ball geometry, angle-adjusted pocket targets, swept-path obstruction and jaw checks, event-based simulation, separate legality evaluation. The inspected aiming/potting modules do not provide a multi-shot position planner. Some potting documentation lags the code: obstruction checks are actually present. Precision estimates are proxies and need simulation validation.
Apache-2.0. Its V0 strike parameter is cue-stick impact speed; the trainer's speed is cue-ball launch speed. Numerical settings cannot be transferred directly.

### tailuge/billiards
Revision: 83589b7d29bb59b523a7d6709132d2a3ddefff77.
[Worker](https://github.com/tailuge/billiards/blob/83589b7d29bb59b523a7d6709132d2a3ddefff77/src/worker.ts), [aim calculator](https://github.com/tailuge/billiards/blob/83589b7d29bb59b523a7d6709132d2a3ddefff77/src/network/bot/aimcalculator.ts), [ClawBreak](https://github.com/tailuge/billiards/blob/83589b7d29bb59b523a7d6709132d2a3ddefff77/src/network/bot/strategies/clawbreak.ts), [FarJaw](https://github.com/tailuge/billiards/blob/83589b7d29bb59b523a7d6709132d2a3ddefff77/src/network/bot/strategies/thefarjaw.ts).
Useful: browser-worker rollout interface, optional trajectory recording, simulation performance techniques. The inspected bots choose a target/pocket geometrically and use fixed default powers; they are not four-ball coaches. With trajectory recording disabled, the inspected worker needs an explicit final-state output for planning. It also needs a settled-versus-budget-expired status. Synchronous worker search cancellation requires worker termination or cooperative execution.
GPL-3.0: direct incorporation requires a license compatibility decision. Implement the architecture independently.

### LukasSeglias/billiard-ai
Revision: 43e61ae0a3182490d88d7777debba2fff316bfef.
[Search implementation](https://github.com/LukasSeglias/billiard-ai/blob/43e61ae0a3182490d88d7777debba2fff316bfef/lib/billiard_search/src/billiard_search.cpp), [state types](https://github.com/LukasSeglias/billiard-ai/blob/43e61ae0a3182490d88d7777debba2fff316bfef/lib/billiard_search/include/billiard_search/type.hpp).
Strongest reference for sequential planning: construct routes backward from pockets, simulate forward, rebuild the next table state, apply game callbacks, then search another shot.
Important distinction: BREAKS is 2 in the inspected implementation; MAX_SEARCH_DEPTH=3 controls route construction, not a three-shot horizon. Velocity variants are coarse 1000 mm/s increments. Inspected BallState has position/velocity/acceleration/rolling state but no angular-spin state. It cannot directly supply independent follow/draw and English recommendations.
No license file found in the recursive tree examined; obtain permission before copying code.

### yongjin-shin/billiards-rl
Revision: bd4870c10f4a41808378a8d8fb062bd60d4a7f31.
[Environment](https://github.com/yongjin-shin/billiards-rl/blob/bd4870c10f4a41808378a8d8fb062bd60d4a7f31/simulator.py), [benchmark](https://github.com/yongjin-shin/billiards-rl/blob/bd4870c10f4a41808378a8d8fb062bd60d4a7f31/benchmark.py).
Useful: curriculum training and repeatable evaluation concepts. The inspected action is angle plus speed, with no spin action. The environment rewards any newly pocketed object ball rather than enforcing lowest-ball-first nine-ball legality. Scratch handling differs by task. A trained policy from this environment is not a drop-in nine-ball position coach.
No license file found in the examined tree.

### tomasz-pawlaczyk/Poolgame-AI-shot-prediction
Revision: a7a803177c63ccb51f715c6920ba650fc341f76a.
[Candidate generation/ranking](https://github.com/tomasz-pawlaczyk/Poolgame-AI-shot-prediction/blob/a7a803177c63ccb51f715c6920ba650fc341f76a/poollib/shots_calculations.py), [Shot](https://github.com/tomasz-pawlaczyk/Poolgame-AI-shot-prediction/blob/a7a803177c63ccb51f715c6920ba650fc341f76a/poollib/Shot.py), [Table](https://github.com/tomasz-pawlaczyk/Poolgame-AI-shot-prediction/blob/a7a803177c63ccb51f715c6920ba650fc341f76a/poollib/Table.py).
Useful: direct/bank/kick candidate generation with mirrored geometry and segment obstruction checks. Candidate loops construct 90 candidates before filtering. Actual ranking uses cut angle and path length with indirect-shot penalties; it is not the README's advertised weighted formula. Shot objects do not simulate the cue ball's eventual position or English. Fixed image-space geometry must not become the trainer's pocket geometry.
No license file found in the examined tree.

## Trainer integration

Current index.html simulate(makeFrames=false) already returns finalBalls, pocketEvents and firstBallContact. It reads global S, always builds sampled paths, and uses dt=1/600 with a 20-second cap. This is sufficient for an initial adapter, but production search should extract a pure simulator:

simulateShot(tableState, shotControls, physicsSnapshot, options)
 -> finalState, orderedEvents, settled, terminationReason, optionalPaths

Use the same implementation for preview, Execute Shot and search. Disable paths/frames for search. A time cap is an incomplete result, not a valid resting state. Include all relevant physical settings in the snapshot/cache key. Test extraction against existing execution before optimizing.

## Search

1. Freeze the complete live table and calibration into a versioned snapshot.
2. Determine the legal target and enumerate pocket/ghost-ball candidates. Filter obvious blocked paths, but retain full collision validation.
3. Sample coarse speed, follow/draw, side spin and small aim corrections. Respect the existing tip-offset limits and UI conventions. Keep normal elevation fixed initially; jump/masse search is a later extension.
4. Simulate every retained candidate. Reject scratches, illegal first contact, absent required cushion/pot events and unfinished simulations.
5. Carry each complete resulting table into the next ply. Recompute the lowest live ball, including unexpected extra pots and nine-ball terminal wins.
6. Keep a diverse beam of promising states for up to four shots. Reward legal progress, easy next shots, positional tolerance and controllable strokes. Penalize scratches, narrow windows, awkward next shots and unnecessary complexity.
7. Refine promising controls, then perturb aim, power and tip placement for the finalists. Report sampled robustness, not an uncalibrated real-world success percentage.
8. Show the first shot of the best verified branch. Replan after the student's actual execution; never advance to the predicted next state blindly.

Start with direct pots. Add banks/kicks after the direct-shot benchmark passes. If no verified pot/position route is found within the budget, report that honestly and optionally offer a separately labeled safety search. Beam search is approximate, not proof of the optimal runout.

## Live behavior and marker zones

Increment tableVersion when a ball, calibration, game rule or relevant control constraint changes. Invalidate the displayed hint immediately. Debounce drag input, cancel obsolete work, and accept results only if their tableVersion and physics version still match. Run search in a worker so Android and Windows controls remain responsive. Hover reveals cached results; it does not start a fresh heavy search on every pointer move.

An accepted hint includes target ball, pocket, exact control values, readable lag/feel speed, cue-ball landing position, a tolerance zone and a short explanation of the next-ball plan. Construct the zone from tested first-shot outcomes whose continuations remain acceptable; do not merely draw an arbitrary circle around one predicted landing point. A conservative circle may summarize a noncircular tested region.

Use an owned hint marker with the existing marker rendering and size interaction. Do not move or erase instructor markers. Resizing/moving a practice target triggers reanalysis; distinguish the instructor's desired region from the planner's verified region. Markers remain nonphysical.

## Acceptance cases and implementation order

First extract the physics adapter and compare final states/events with Execute Shot on fixed layouts: straight pot, cut, follow/draw, English rail, scratch, secondary collision and long unsettled shot.
Then verify a greedy trap: the easiest first pot leaves no second shot, while another route completes the four-ball horizon. Verify lowest-ball legality, early nine-ball win, extra pots, clustered blockers and unexpected ball movement.
Then add worker cancellation/version checks, including moving a blocker during search and changing calibration before completion. Verify hint markers never affect collisions.
Finally benchmark candidate throughput, time to first useful hint and refined result time on actual Windows and Android devices. Choose beam width and budgets from those measurements; no latency promise is justified yet.

Training is optional later. Log simulated state/action/outcome examples and train a candidate ranker to reduce search cost. Continue verifying finalists with physics. Do not transfer a policy trained with another engine's geometry, speed units or rules without validation.
