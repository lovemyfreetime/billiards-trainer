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


## Second research pass — 2026-10-07

Scope: examined planning-related source in seven additional repositories, read the relevant PickPocket/CueCard papers, and checked primary pocket-acceptance and dataset references. These are source findings, not execution benchmarks. No external engine was installed or run and no trainer runtime code changed.

### Stronger planning research

[PickPocket: Running the Table (AAAI 2006)](https://cdn.aaai.org/AAAI/2006/AAAI06-156.pdf) explicitly varies speed and both tip offsets to generate different position outcomes. It precomputes shot difficulty using four geometry variables and distinguishes corner/side pockets. It compares four-ply probability-weighted search with two-ply noisy sampling; the latter performed better in its experiments. This does not establish that four-shot lookahead is unhelpful in our nine-ball task, but it makes robust continuation testing essential. Generate our own lookup data, tied to our physics and noise assumptions; their values do not transfer.

[CueCard: Analysis of a Winning Computational Billiards Player](https://ai.stanford.edu/~shoham/www%20papers/AASBilliardsAAMAS2009.pdf) samples stroke variations and clusters similar resulting table states before expanding continuations. This reduces duplicate work while preserving more than one possible leave. Its study found that spending a fixed budget on more samples versus deeper search is a genuine tradeoff, not an automatic win for depth. It also tested a faster simulator against the reference simulator before using it. These are architectural references; a public complete CueCard planner was not located in this pass.

### New source audits

**cny123222/AI3603-Billiards** — revision b04878e6e41c916e64255aed4b9d5f6a2511ab7d.
[Greedy agent](https://github.com/cny123222/AI3603-Billiards/blob/b04878e6e41c916e64255aed4b9d5f6a2511ab7d/agents/greedy_agent.py), [basic agent](https://github.com/cny123222/AI3603-Billiards/blob/b04878e6e41c916e64255aed4b9d5f6a2511ab7d/agents/basic_agent_pro.py), simulation_engine.py.
Useful implementation examples: staged noisy trials, scratch/foul accounting, angle refinement, bank/kick/combo candidates, and offensive/defensive selection. The inspected force optimizer binary-searches for a minimum potting speed, then adds 15%; it does not optimize a four-shot route. Binary search assumes sufficiently monotonic pot success, which our speed-dependent jaws, throw and rail paths may violate: use a coarse feasible-speed scan plus local refinement instead. The basic agent's main geometric candidates set a=b=0; accepting spin parameters does not prove systematic position-play spin search. Its rules and opponent-ball penalties are eight-ball-specific. No root license found in examined tree. Do not copy code without resolving permission.

**therealMrFunGuy/clubhouse-agent-protocol** — revision 1d204ca34c242ca7f1c72c09488c25eb29d44526.
[Search example](https://github.com/therealMrFunGuy/clubhouse-agent-protocol/blob/1d204ca34c242ca7f1c72c09488c25eb29d44526/examples/pool-search-agent/agent.mjs), [simulator interface](https://github.com/therealMrFunGuy/clubhouse-agent-protocol/blob/1d204ca34c242ca7f1c72c09488c25eb29d44526/packages/pool-sim/src/index.ts).
Especially useful JavaScript/TypeScript reference for calling the same physics/rules layer during search and execution. The wrapper clones input balls. Example search tests 240 angles × 3 powers × 3 side-spin values, holding vertical spin at zero. It ranks one-shot outcomes with a small nearest-legal-ball bonus; that bonus does not check next-shot pocketability. No multishot recursion in the inspected example. The package exposes eight/nine-ball rule APIs; full rule correctness was not audited. Package LICENSE is MIT. Its server/protocol/payment integration is unrelated to the trainer; only the local simulation architecture is relevant. Author timing comments are not our benchmarks.

**ekiefl/FastFiz** — revision 6c6df412c8eed82fc6a70732aeffe9b64c8eaa38.
[AI template](https://github.com/ekiefl/FastFiz/blob/6c6df412c8eed82fc6a70732aeffe9b64c8eaa38/FastFiz-0.2/AI/AI.cpp), FastFiz/Noise.cpp.
Historical simulation/noise reference. Crucial distinction: the included AI's otherShot() sets DEC_CONCEDE. This source distribution is not the complete CueCard runout agent. Potential offline comparison tool; not a reason to replace the working trainer engine.

**carrotdan/ai-billiard-system** — revision df48dfed15f0d144afaa762c17d86e35454cd8a1.
[Shot scoring](https://github.com/carrotdan/ai-billiard-system/blob/df48dfed15f0d144afaa762c17d86e35454cd8a1/physics_n_trajectory_simulation/shot_scoring.py).
Inspected compute_position_value combines collision clearance and distance from pockets at the cue-path endpoint. It does not evaluate potting the next legal ball. compute_pocket_probability is a weighted heuristic, not empirically calibrated probability. Camera/projector integration is potentially useful for a future task, but does not fill our four-ball-planning gap. No license file found in examined tree.

**moeinalva/pool-ai-trainer** — revision ac2c65e3b3ff3a87549f7e6af9e463ccfad0beb6.
[Notebook](https://github.com/moeinalva/pool-ai-trainer/blob/ac2c65e3b3ff3a87549f7e6af9e463ccfad0beb6/src/pool_ai_trainer.ipynb).
Source uses geometric candidates and computes power as min(100, int(distance-to-ghost × 1.1)). This is not calibrated physical power or multi-shot English selection. Useful teaching-interface example, low priority for planner development.

**skoo1/Four-Ball_Billiards_ThreeJS** — revision 036052d6edc05122f7806ac0f38e3c9ed7213801.
[Controller](https://github.com/skoo1/Four-Ball_Billiards_ThreeJS/blob/036052d6edc05122f7806ac0f38e3c9ed7213801/controller.py).
Has headless simulation/observation interfaces. Inspected AI scans angles in two passes with nominal power 0.6, then adds random aim/power errors. Four-ball here means carom game balls, not four-shot pool lookahead. Reference for simulator interfaces only.

**taichi-dev/difftaichi** — revision 9f4ee522a0a01e6b1aae1d3551c7fd1f6ed56081.
[Billiards example](https://github.com/taichi-dev/difftaichi/blob/9f4ee522a0a01e6b1aae1d3551c7fd1f6ed56081/examples/billiards.py).
Optimizes initial cue-ball position and velocity by differentiating a target-position loss through ball collisions. The inspected example lacks pockets, angular spin and cloth dynamics. Changing cue-ball position is also unavailable during ordinary play. Interesting inverse-control research; not an immediate substitute for our engine or discrete pocket/route search.

### Physics and data gaps

[Dr. Dave's primary pocket-size/center resource](https://drdavepoolinfo.com/faq/pocket/size-and-center/) documents that effective pocket acceptance and ideal target vary with approach angle and speed. Implication: enumerate feasible pocket-entry offsets and validate them with our actual jaw geometry; do not always aim at the geometric center or assume more power always improves pot success. The simulator's own pocket behavior still needs validation.

[Billiards Sports Analytics: Datasets and Tasks](https://arxiv.org/html/2407.19686v1) addresses break layouts, trajectories and layout retrieval/generation. It may help build varied benchmarks, but it is not established here as a labeled dataset mapping nine-ball layouts to optimal speed/English and four-shot runs. No suitable ready-to-use expert stroke dataset was verified in this pass.

### Revised design decisions

1. Keep the rolling four-shot objective. Allocate substantial computation to noisy first-shot outcomes and their continuations; do not blindly spend the budget on idealized depth.
2. Add a skill/tolerance profile for aim, speed and tip-placement perturbations. Initially describe results as simulator robustness; real-player probabilities require calibration.
3. Maintain multiple plausible resulting layouts. Cluster only compatible states: same remaining balls/legal status, similar positions, and similar next-shot access. Never merge a scratch with a legal outcome or average across a blocker boundary.
4. Search speed and follow/draw/English jointly with small aim adjustments and pocket-entry offsets. Prefer simpler controls when performance is comparable. Revalidate the full result after each refinement.
5. Distinguish cue-ball arrival spread from the useful position region. A marker should represent an area from which the required next ball and continuation remain playable. Nearby points may be separated by an obstruction or wrong-side angle.
6. Return progressively refined hints with explicit depth achieved. Show a verified one/two-shot result while a four-shot search is incomplete; do not label it a completed four-shot plan.
7. Benchmark three alternatives under equal time budgets: ideal four-shot beam; shallow robust sampling; hybrid four-shot beam with clustered noisy continuations. Measure legal pot rate, four-ball completion, scratches, positional tolerance and latency.
8. Add failure cases: nearest-ball position but blocked pocket; rail-adjacent cue restricting stroke; overhit jaw rejection; narrow position window; legal extra pot changing ball order; clustered balls; stale result after a manual move.

Priority: own-engine pure simulation/rules interface, candidate refinement, robust continuation search, then marker UI. Lookup tables and learned rankers are accelerators after correctness, keyed to geometry and calibration. Remaining unknowns are device throughput, adequacy of our pocket/rail physics under search, and calibration of difficulty estimates. The new evidence improves the design; it does not yet establish a finished or tested planner.
