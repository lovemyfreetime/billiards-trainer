# Position-play coaching specification v2

## Result and scope

The initial 12-item outline has been replaced by **61 source-informed conditional principles and 8 application safeguards**. These are distinct decision aids, not 69 independent scientific laws or a claim of advanced playing strength. Closely related aids are grouped to avoid presenting a flat checklist to players.

Source: user-supplied **Zero-X Billiards, Pattern Puzzles**, 377 PDF pages. Branding confirmed visually; individual authorship and edition not independently verified. Page references use PDF page numbers (matching the visible footer on reviewed pages), not puzzle IDs. No source diagrams, coordinates, ball-by-ball solutions or substantial copied prose are included in the repository.

## Review coverage

All 377 pages were inventoried visually on 16 contact sheets. All available explanatory text was read across the file; the first six image-based pages required OCR and visual checking. Selected diagrams were enlarged to interpret notation, exceptions and specialist techniques. This is a comprehensive logic review, **not a pixel-level reconstruction or physics validation of every diagram**.

Page inventory: 1–6 introduction and reading instructions; 7–24 half-table question/answer pairs; 25–132 rotation pairs; 133–134 defensive diagrams; 135–164 further rotation pairs; 165–284 8-ball pairs; 285–286 strategic questions/answers; 287–322 further 8-ball pairs; 323–338 last-pocket pairs; 339–376 further 8-ball pairs; 377 resources. There are 183 pattern question/answer page pairs; half-table pages contain two exercises per pair. The eight defensive diagram examples and three strategic scenarios are separate interludes, not additional offensive pattern pairs.

The machine-readable audit, `docs/position-play-page-review.json`, records a review note and review depth for every page. References under a principle are representative supporting passages, not a claimed exhaustive occurrence count. Repeated explanations elsewhere are recorded in the page ledger rather than multiplied into invented new rules.

## What diagram interpretation changed

- **Page 8:** the center divider separates two constrained exercises, not a physical rail or a single combined rack.
- **Pages 2–6:** numbered cue-ball symbols identify successive shot positions; their numbers must not be confused with numbered object balls. Red strike dots are qualitative contact cues, not calibrated speed or spin percentages. The rotation rail key omits shots that do not strike rails, so a missing entry is not a missing ball or shot.
- **Pages 26–28:** the alternatives concern how an approach preserves the useful continuation angle over different stopping distances, not simply shortest travel.
- **Pages 34, 172 and 222:** a geometrically useful leave can restrict the physical stroke needed next. Rail distance cannot be judged independently of that stroke.
- **Pages 166 and 200:** proximity to the winner does not determine the key ball, and a restricted ball can be a legitimate final predecessor.
- **Page 244:** a secondary-ball contact is presented as a conditional recovery, not permission to ignore other balls' movement.
- **Pages 262, 278 and 320:** side spin can check a rebound or create overrun. Its sign alone does not establish whether it helps position.
- **Pages 323–338:** the winning-ball pocket is coupled to the last group-ball pocket by the exercise variant. That constraint must not leak into standard 8-ball.
- **Page 340:** recovery branches differ with the actual leave, including an advanced pocket-entry offset. This is a possibility to validate, not guaranteed pocket acceptance.
- **Page 342:** cushion contact before a hanging object ball changes the cue-ball exit. This is distinct from banking the object ball.
- **Pages 133–134 and 285–286:** defensive diagrams and intentional-foul examples serve a different objective from completing a legal offensive run. The latter concede ball in hand and must never be represented as legal continuations.

## Important limits of the source

The source says pattern puzzles exclude combinations and object-ball banks (page 6); that does not describe every defensive interlude. It grants ball in hand for the 8-ball puzzles (page 3), restricts the half-table exercises to no side spin and no crossing the dividing line (page 5), and treats difficulty meters as relative to their puzzle family (page 3). None of those conditions is a universal rule for real play.

The author reports testing the examples, but that is source-reported testing, not our own replication or proof of optimality. Equipment and stroke variation are explicitly acknowledged (page 5). This review cannot establish exact Trainer settings, real-player probabilities, a complete safety system, break planning, jump/masse strategy or a full banking/combination curriculum.

## How this reaches the Companion

A compact decision process is included in every request. The complete conditional cards are available through the existing `trainer.app_help` tool, with their exceptions and source-page references. They are marked non-actionable coaching reference, not Guide lessons. This avoids sending the entire catalog on every turn. It does not change model weights, add chained simulation or remove the existing preview limits.

Use the process: identify the player's goal and actual rules → locate bottlenecks → work backward to useful approach angles → compare reachable routes and error outcomes → verify with available tools → explain the decisive tradeoff. The model must state when its tool cannot verify a sequence. Do not make the player read or complete this internal checklist.

## Principle families

| Family | Decision aids |
|---|---:|
| Assessment | 7 |
| Angles | 8 |
| Windows | 7 |
| Stroke | 9 |
| Rails | 7 |
| Ordering | 8 |
| Adaptation | 5 |
| Learning | 6 |
| Defence | 4 |
| Application safeguards | 8 |

## Assessment

### transition-first: Identify the transition that constrains the run

**Use:** Before selecting the opening, locate the transfer with the fewest viable approaches and plan earlier leaves to support it.

**Conditions and exceptions:** A difficult pot and a difficult position transfer are different problems; do not assume the visibly hardest pot is the bottleneck.

**Check:** Which later transfer removes the most options?

**Basis:** source-informed conditional abstraction; PDF pages 36, 74, 102, 150, 154.

### multiple-bottlenecks: Track more than one bottleneck

**Use:** Identify separate early and late constraints so solving the first does not sacrifice the second.

**Conditions and exceptions:** Do not force every layout into one key-shot explanation.

**Check:** What must remain possible after the first problem is solved?

**Basis:** source-informed conditional abstraction; PDF pages 124, 132, 148, 156.

### restricted-pockets: Count usable pockets before choosing position

**Use:** When a ball has limited pocket access, work from its feasible pocket and approach region.

**Conditions and exceptions:** An apparent opening in a drawing is not a measured clearance.

**Check:** Which pockets remain feasible after accounting for blockers?

**Basis:** source-informed conditional abstraction; PDF pages 24, 70, 82, 176, 214.

### position-problem: An easy pot can be a difficult position ball

**Use:** Treat pocketing ease and the ability to leave the next angle as separate attributes.

**Conditions and exceptions:** Do not call a hanging ball an automatic position solution.

**Check:** Can this easy ball actually send the cue ball where it is needed?

**Basis:** source-informed conditional abstraction; PDF pages 84, 90, 198.

### open-is-not-easy: Open balls still require a connected plan

**Use:** Evaluate the connections between open balls and the remaining obstacles before declaring a run easy.

**Conditions and exceptions:** Do not invent complications where a simple stop-shot chain works.

**Check:** Does each open pot lead to a useful subsequent shot?

**Basis:** source-informed conditional abstraction; PDF pages 194, 202, 218, 270, 376.

### isolated-ball: Recognize an isolated ball as an access problem

**Use:** Check how the cue ball can enter and leave an isolated ball's area without relying on nearby linking balls.

**Conditions and exceptions:** Isolation alone does not prove difficulty; examine available angles and pockets.

**Check:** What shot provides a practical bridge to this area?

**Basis:** source-informed conditional abstraction; PDF pages 358.

### backward-dependencies: Work backward through necessary approach angles

**Use:** Start with a constrained finish or transition, identify its useful approach, and work backward to reachable predecessor leaves.

**Conditions and exceptions:** Backward reasoning generates candidates; it does not verify forward reachability.

**Check:** Can the preceding shot reach the required approach without disturbing the plan?

**Basis:** source-informed conditional abstraction; PDF pages 150, 174, 206, 230.

## Angles

### continuation-angle: Plan the angle on the next ball for the ball after it

**Use:** Choose a leave that supports the following transfer rather than merely exposing the next pot.

**Conditions and exceptions:** The final ball may need no further movement.

**Check:** What can the cue ball do after pocketing the next ball?

**Basis:** source-informed conditional abstraction; PDF pages 36, 84, 112, 136.

### reference-line: Use the selected pocket line as a geometric reference

**Use:** Define the object-ball-to-intended-pocket line and identify the useful cue-ball side relative to the desired continuation.

**Conditions and exceptions:** Left and right depend on orientation and pocket choice; never memorize them as universal labels.

**Check:** Which actual side of this selected line supports the route?

**Basis:** source-informed conditional abstraction; PDF pages 60, 140, 146, 368.

### deliberate-crossing: Cross a pocket line deliberately when the next route needs it

**Use:** Recognize when an earlier shot must carry the cue ball across a later pocket line to create the necessary departure angle.

**Conditions and exceptions:** Crossing too far can replace one unsuitable angle with another.

**Check:** How much crossing preserves a makeable pot and usable departure?

**Basis:** source-informed conditional abstraction; PDF pages 12, 16, 20, 144, 338.

### preserve-side: Avoid an unintended pocket-line crossing

**Use:** Treat the pocket line as a boundary when crossing it would reverse or complicate the next route.

**Conditions and exceptions:** Another pocket or recovery route may make the other side usable.

**Check:** What continuation is lost if the leave crosses this boundary?

**Basis:** source-informed conditional abstraction; PDF pages 162, 276, 300, 322, 376.

### intentional-straight: Straight position can be the correct objective

**Use:** Use straight or nearly straight leaves when controlled stop, follow or draw supports the planned sequence.

**Conditions and exceptions:** Avoid treating straightness as always good or always bad.

**Check:** Does straight position simplify this transfer or remove needed movement?

**Basis:** source-informed conditional abstraction; PDF pages 192, 212, 284, 310, 362.

### small-angle: Preserve a small angle for controlled local movement

**Use:** Prefer a manageable small angle when only modest lateral travel or a short transfer is needed.

**Conditions and exceptions:** A small angle may demand excessive force for a distant transfer.

**Check:** How much angle is sufficient for the actual movement required?

**Basis:** source-informed conditional abstraction; PDF pages 18, 20, 98, 318.

### travel-angle: Create sufficient angle for a substantial transfer

**Use:** Set up enough angle to reach a distant region using a controllable stroke and suitable cushions.

**Conditions and exceptions:** More angle can increase pot difficulty; do not maximize angle independently.

**Check:** Does the angle reduce forcing without making the pot unreasonably difficult?

**Basis:** source-informed conditional abstraction; PDF pages 22, 58, 86, 94, 120.

### contact-thickness: Reassess route and speed when contact thickness changes

**Use:** Recognize that a thicker or thinner hit changes cue-ball departure and retained motion; recheck both clearance and distance.

**Conditions and exceptions:** Do not infer exact energy transfer from an uncalibrated image.

**Check:** Does the changed cut still clear the blocker and reach the region?

**Basis:** source-informed conditional abstraction; PDF pages 28, 44.

## Windows

### region-not-dot: Seek a useful region rather than a single stopping point

**Use:** Judge leaves by the range of positions preserving the next pot and continuation.

**Conditions and exceptions:** A drawn region is a hypothesis until its continuations have been checked.

**Check:** Which nearby outcomes remain useful?

**Basis:** source-informed conditional abstraction; PDF pages 3, 26, 28, 74, 108.

### along-window: Prefer an approach that travels along the useful region

**Use:** Compare travel direction through the landing region; an aligned approach may preserve the angle over a larger stopping range.

**Conditions and exceptions:** The aligned route can be worse if its path encounters pockets or blockers.

**Check:** Does short or long travel still leave the intended continuation?

**Basis:** source-informed conditional abstraction; PDF pages 26, 74, 100, 108.

### short-side: Evaluate the consequence of coming up short

**Use:** Compare routes by the quality of plausible short leaves, not only the ideal endpoint.

**Conditions and exceptions:** The tolerable error direction depends on the layout.

**Check:** Does a slightly short leave become straight, blocked or wrong-sided?

**Basis:** source-informed conditional abstraction; PDF pages 26, 32, 116, 138, 182.

### long-side: Evaluate the consequence of going too far

**Use:** Inspect long leaves for line crossing, lost angle or excess travel after a cushion.

**Conditions and exceptions:** Long is not always worse than short; compare actual recovery options.

**Check:** What changes first as the cue ball passes the intended region?

**Basis:** source-informed conditional abstraction; PDF pages 26, 60, 122, 278, 320.

### speed-sensitive-count: Reduce the number of precision-speed demands in a sequence

**Use:** Compare whole routes by how many transitions depend on narrowly judged stopping distances.

**Conditions and exceptions:** A longer route with several sensitive cushion contacts can be worse than a short precise shot.

**Check:** How many shots in this plan require unusually narrow speed control?

**Basis:** source-informed conditional abstraction; PDF pages 3, 5, 56, 176.

### short-local: Exploit a short controlled move when it removes a larger speed demand

**Use:** Consider a small follow, draw or hold move that preserves the following angle and avoids a delicate longer roll.

**Conditions and exceptions:** Short movement is not inherently easier if it needs a very thin cut or awkward stroke.

**Check:** Does this local move simplify both the current and following shot?

**Basis:** source-informed conditional abstraction; PDF pages 56, 196, 258, 308.

### stroke-room: Include physical cueing room in the useful region

**Use:** Leave space from a cushion when the next shot requires accessible low contact or a level stroke.

**Conditions and exceptions:** A rail-adjacent leave may be suitable for a different stroke or continuation.

**Check:** Can the intended next tip position and stroke be delivered from this leave?

**Basis:** source-informed conditional abstraction; PDF pages 34, 172, 222.

## Stroke

### impact-state: Distinguish tip location from cue-ball state at impact

**Use:** Reason about sliding, rolling or residual backspin at object-ball contact rather than predicting solely from the tip badge.

**Conditions and exceptions:** Distance, speed, cloth and initial spin affect the state; exact values need simulation or observation.

**Check:** What spin state is needed when the cue ball reaches the object ball?

**Basis:** source-informed conditional abstraction; PDF pages 6, 10, 48.

### low-not-draw: A low strike need not produce backward travel

**Use:** Allow below-center contact to create stun or controlled forward/lateral movement when appropriate.

**Conditions and exceptions:** Do not promise that every soft low strike kills the ball; impact state and geometry matter.

**Check:** Is the desired outcome draw, stun or reduced forward motion?

**Basis:** source-informed conditional abstraction; PDF pages 6, 16, 18, 178.

### draw-survival: Retain enough draw to reach contact when draw is needed

**Use:** Account for travel to the object ball before prescribing a draw-dependent route.

**Conditions and exceptions:** A tip diagram alone does not quantify surviving backspin.

**Check:** Will the proposed launch conditions preserve the required backspin at contact?

**Basis:** source-informed conditional abstraction; PDF pages 10, 160.

### stun-reference: Use the sliding departure as a reference before modifying it

**Use:** Compare the sliding cue-ball departure with the required route and adjust the impact state when needed.

**Conditions and exceptions:** Ideal tangent geometry is a starting approximation, not proof of the full trajectory.

**Check:** Does the sliding route point toward a useful cushion or region?

**Basis:** source-informed conditional abstraction; PDF pages 48, 68, 170.

### stop-link: Use stop shots to connect compatible positions

**Use:** Recognize sequences where holding the cue ball after a pot naturally exposes the next required angle.

**Conditions and exceptions:** A stop requires appropriate alignment and impact state; low spin alone does not ensure it.

**Check:** Does holding this position preserve the next shot rather than stall the plan?

**Basis:** source-informed conditional abstraction; PDF pages 158, 192, 310, 330, 362.

### kill-control: Use controlled hold shots to preserve a useful nearby angle

**Use:** Consider limiting cue-ball motion when larger travel would lose an already useful connection.

**Conditions and exceptions:** Do not imply that the cue ball can be held arbitrarily on any cut.

**Check:** How much movement is geometrically unavoidable and still acceptable?

**Basis:** source-informed conditional abstraction; PDF pages 16, 18, 186, 226, 344.

### follow-angle: Use controlled forward travel to create an angle

**Use:** Use a measured forward move when it deliberately establishes the next useful side or cut.

**Conditions and exceptions:** Too much follow can cross the wrong boundary or approach a pocket.

**Check:** What is the acceptable forward range before the angle becomes unhelpful?

**Basis:** source-informed conditional abstraction; PDF pages 20, 118, 274, 322.

### small-draw: Use a small draw move to create rather than force an angle

**Use:** Compare a short backward move with longer position routes when it sets up a manageable continuation.

**Conditions and exceptions:** Short draw still depends on distance, stroke access and retained spin.

**Check:** Does the draw distance create the needed angle without excessive precision?

**Basis:** source-informed conditional abstraction; PDF pages 106, 196, 258, 308, 374.

### angle-before-force: Improve the incoming angle before demanding more power

**Use:** When alternatives are comparable, choose the previous leave that permits controlled motion instead of forcing a poor angle.

**Conditions and exceptions:** Some transfers genuinely require speed; soft is not an unconditional objective.

**Check:** Is the force requirement a consequence of an avoidable earlier leave?

**Basis:** source-informed conditional abstraction; PDF pages 30, 40, 50, 52, 84, 130.

## Rails

### cushion-window: Use a cushion to reshape the position approach

**Use:** Compare a cushion-assisted approach with a direct stopping route when the rebound preserves a wider useful range.

**Conditions and exceptions:** Cushions add calibration and spin sensitivity; the source's confidence is not a guarantee.

**Check:** Does the rebound improve the region enough to justify extra uncertainty?

**Basis:** source-informed conditional abstraction; PDF pages 26, 28, 66, 80, 108.

### rail-target: Treat the cushion contact location as an intermediate target

**Use:** Connect a feasible cushion-contact region to the desired outgoing direction.

**Conditions and exceptions:** A precise diamond or contact point from a diagram is not transferable to an arbitrary table.

**Check:** How wide is the acceptable cushion-contact region?

**Basis:** source-informed conditional abstraction; PDF pages 38, 58, 110, 126, 180.

### running-spin: Use running spin for suitable rebound and travel demands

**Use:** Consider side spin that assists the intended cushion route when angle alone is insufficient.

**Conditions and exceptions:** Running spin is defined relative to the cushion approach, not a universal left/right setting.

**Check:** Which rebound and travel changes are needed at each cushion?

**Basis:** source-informed conditional abstraction; PDF pages 40, 46, 78, 90.

### spin-overrun: Avoid running spin that carries the ball beyond position

**Use:** Compare reduced or absent side spin when extra cushion travel would flatten the next angle or overshoot the region.

**Conditions and exceptions:** Do not simply remove spin without checking the changed rebound direction.

**Check:** Does the added spin improve the route or merely increase overrun?

**Basis:** source-informed conditional abstraction; PDF pages 122, 278, 320.

### reverse-control: Use reverse spin selectively to hold or reshape a rebound

**Use:** Consider a checking rebound when it helps preserve the required angle and travel distance.

**Conditions and exceptions:** Reverse can affect direction and speed together; it is not a universal brake.

**Check:** What useful angle is preserved and what new miss risk is introduced?

**Basis:** source-informed conditional abstraction; PDF pages 262, 340.

### spin-angle-trim: Use small spin changes to adjust a rebound direction

**Use:** Consider a modest side-spin adjustment when it corrects the outgoing route without unnecessary extra travel.

**Conditions and exceptions:** A small tip change can have a large effect; no fixed percentage follows from qualitative wording.

**Check:** Is the adjustment changing the needed direction, distance or both?

**Basis:** source-informed conditional abstraction; PDF pages 98, 292, 338.

### multi-rail-options: Keep multi-rail routes among alternatives

**Use:** Do not discard a longer cushion route solely because it has more rails; it may provide a natural angle and forgiving approach.

**Conditions and exceptions:** Do not prefer extra rails automatically or ignore accumulated error and pocket approaches.

**Check:** Which route has the better combined pot, path and continuation margin?

**Basis:** source-informed conditional abstraction; PDF pages 54, 86, 88, 96, 114, 256.

## Ordering

### order-dependencies: Choose order by connections rather than isolated pot ease

**Use:** In order-choice play, compare how one ball's leave makes another accessible and preserves the finish.

**Conditions and exceptions:** Rotation first-contact requirements restrict these choices.

**Check:** Which order creates the simplest chain of feasible transfers?

**Basis:** source-informed conditional abstraction; PDF pages 194, 218, 282, 312.

### early-problem: Use a good opportunity to address a restricted ball

**Use:** Consider resolving a ball while a useful approach or predecessor remains available.

**Conditions and exceptions:** Hardest-first is not a rule; a linking shot may be needed before the problem ball.

**Check:** What useful access disappears if this ball is deferred?

**Basis:** source-informed conditional abstraction; PDF pages 188, 208, 250, 272, 316.

### delayed-problem: A problem ball may be appropriate late or last

**Use:** Allow a restricted ball later when the preceding chain reaches it well and it provides a workable finish.

**Conditions and exceptions:** Deferring the problem is justified only by a feasible approach and exit.

**Check:** Why does delaying this ball improve the complete chain?

**Basis:** source-informed conditional abstraction; PDF pages 200, 238, 266, 282, 298, 320.

### key-not-nearest: The ball nearest the winner need not be the key ball

**Use:** Select the final object ball by reachable approach and useful exit to the winner, not distance alone.

**Conditions and exceptions:** A nearby ball can still be excellent if the required leave is accessible.

**Check:** Can the candidate key ball be reached and used without a fragile transfer?

**Basis:** source-informed conditional abstraction; PDF pages 166, 168, 198, 232, 240, 242.

### finish-first: Plan access to the winning ball before committing to order

**Use:** Choose a feasible finish and arrange the final predecessor and its incoming angle accordingly.

**Conditions and exceptions:** An attractive finish is insufficient if the opening cannot connect to it.

**Check:** Which earlier shot establishes the key ball's useful angle?

**Basis:** source-informed conditional abstraction; PDF pages 174, 176, 206, 216, 230, 254.

### clear-pocket: Remove a pocket obstruction as a prerequisite

**Use:** Recognize when another ball must be removed to open a needed pocket or position route.

**Conditions and exceptions:** Removing a ball may also remove a useful connection; check the complete updated layout.

**Check:** What access opens and what option disappears after the clearance?

**Basis:** source-informed conditional abstraction; PDF pages 306, 370.

### sequence-economy: Limit unnecessary movement when connections remain sound

**Use:** Compare compact controlled chains against larger transfers when their finish and risk are comparable.

**Conditions and exceptions:** Shortest total distance alone does not establish the best pattern.

**Check:** Can the same useful angles be retained with less demanding movement?

**Basis:** source-informed conditional abstraction; PDF pages 196, 258, 310, 362.

### opponent-obstacles: Preserve awareness of opponent balls throughout the route

**Use:** Account for opponent balls blocking pots and cue-ball corridors even when all own balls are open.

**Conditions and exceptions:** Do not assume an opponent ball stays untouched if the simulated path contacts it.

**Check:** Does each transfer retain a clear path around the remaining balls?

**Basis:** source-informed conditional abstraction; PDF pages 218, 224, 232, 376.

## Adaptation

### pocket-switch: Reconsider the next pocket when the leave differs

**Use:** Compare another legal pocket when it gives a better continuation from the actual leave.

**Conditions and exceptions:** A pocket switch changes its reference line and all downstream angles.

**Check:** Does the new pocket restore a workable chain?

**Basis:** source-informed conditional abstraction; PDF pages 108, 136, 162.

### conditional-recovery: Keep more than one continuation for plausible leaves

**Use:** Describe recovery branches tied to observed angle or position rather than blindly repeating the nominal controls.

**Conditions and exceptions:** A recovery suggestion remains provisional until tested from that actual state.

**Check:** Which branch matches the cue ball's actual position?

**Basis:** source-informed conditional abstraction; PDF pages 42, 60, 92, 162, 212, 284, 296.

### controlled-cannon: An intentional secondary contact can be a recovery option

**Use:** Consider using a secondary ball to limit travel only when the resulting table and legality are understood.

**Conditions and exceptions:** Unintended contact is not equivalent; it may alter the finish or create a foul.

**Check:** What happens to both balls after contact and is the continuation still valid?

**Basis:** source-informed conditional abstraction; PDF pages 244.

### pocket-entry: Pocket-entry variation can create an otherwise unavailable route

**Use:** Consider a feasible entry offset when it changes cue-ball departure usefully.

**Conditions and exceptions:** This reduces pot margin; pocket geometry and speed must validate it. It is an advanced option, not a default fix.

**Check:** Does the recovered position justify the narrower pot margin?

**Basis:** source-informed conditional abstraction; PDF pages 340.

### rail-first-hanger: A rail-first approach to a hanger can change the cue-ball exit

**Use:** Consider cushion-before-object contact when a near-pocket ball offers a useful alternate exit.

**Conditions and exceptions:** This is not an object-ball bank; confirm clearance, first object contact and applicable rules.

**Check:** Does the rail-first route produce a useful exit with adequate pot margin?

**Basis:** source-informed conditional abstraction; PDF pages 342.

## Learning

### ball-in-hand-scope: Distinguish setup freedom from an ongoing rack

**Use:** When a drill grants ball in hand, choose an opening that establishes the pattern; preserve actual cue-ball position during an ongoing run.

**Conditions and exceptions:** Book exercises granting ball in hand do not grant it in a player's live game.

**Check:** Is placement freedom actually part of this situation?

**Basis:** source-informed conditional abstraction; PDF pages 3.

### constraint-practice: Use constraints to isolate cue-ball control

**Use:** Offer optional practice limiting side spin or table area to develop rolling and sliding control.

**Conditions and exceptions:** The source's half-table restriction is an exercise condition, not a general strategic rule.

**Check:** Which constraint teaches the intended skill without confusing normal play?

**Basis:** source-informed conditional abstraction; PDF pages 5.

### graduated-help: Reveal a small useful hint before the entire explanation when wanted

**Use:** Offer the opening idea or a decisive transition as optional scaffolding, then let the player explore.

**Conditions and exceptions:** Direct questions deserve direct answers; do not force guessing or conceal requested help.

**Check:** Does the player want exploration, a hint or an explanation?

**Basis:** source-informed conditional abstraction; PDF pages 5.

### difficulty-context: Interpret difficulty relative to task family

**Use:** Distinguish task length and type from within-family difficulty; do not compare source skill meters as absolute ratings.

**Conditions and exceptions:** No player rating or success percentage follows from a printed difficulty gauge.

**Check:** What aspect of the task is demanding for this player?

**Basis:** source-informed conditional abstraction; PDF pages 3.

### equipment-transfer: Treat source spin illustrations as qualitative starting guidance

**Use:** Account for cue, table, stroke and starting-position differences before transferring settings.

**Conditions and exceptions:** The author reports testing the patterns; that does not calibrate exact Trainer inputs or real-table guarantees.

**Check:** Which conditions differ from the demonstration?

**Basis:** source-informed conditional abstraction; PDF pages 5, 6.

### last-pocket-rule: Last-pocket play changes the finishing constraint

**Use:** When that variant is selected, plan the final group-ball pocket jointly with the required winning-ball pocket.

**Conditions and exceptions:** Do not impose this exercise rule on standard 8-ball; verify the selected variant.

**Check:** Does the complete finish obey the chosen same-pocket constraint?

**Basis:** source-informed conditional abstraction; PDF pages 323, 324, 330, 332, 338.

## Defence

### dual-ball-control: A defensive option must consider both balls' destinations

**Use:** From the defensive diagrams, assess cue-ball separation and the legal target ball's resulting access together.

**Conditions and exceptions:** The diagrams show candidates, not universally successful safeties or computed opponent odds.

**Check:** What reasonable return does the opponent retain?

**Basis:** diagram-supported inference; PDF pages 133, 134.

### opponent-outlook: A legal hit alone may not solve the strategic problem

**Use:** Compare the likely opponent opportunity after a difficult escape with alternatives, rather than treating contact as the only goal.

**Conditions and exceptions:** Do not invent opponent runout probabilities or claim a foul is harmless.

**Check:** What changes in the opponent's practical options after this choice?

**Basis:** source-informed conditional abstraction; PDF pages 285, 286.

### foul-cost: A deliberate foul is a separately labeled strategic tradeoff

**Use:** If discussing the source's tie-up choices, explicitly identify the foul and ball-in-hand concession and compare legal options first.

**Conditions and exceptions:** Confirm the actual rules and any consecutive-foul penalty before recommending; never label it a legal runout continuation.

**Check:** Does the obstruction created plausibly justify the known penalty under these rules?

**Basis:** source-informed conditional abstraction; PDF pages 286.

### separate-objective: Keep defence separate from offensive pattern verification

**Use:** When no attractive offensive route is established, distinguish a safety search from a runout claim.

**Conditions and exceptions:** A failed bounded runout search is not proof that no runout exists.

**Check:** Which objective is being evaluated and what evidence supports it?

**Basis:** source-informed conditional abstraction; PDF pages 133, 134, 285, 286.

## Application safeguards

### full-path-risk: Inspect the full cue-ball path, not only the endpoint.

**Use:** Inspect scratch risk along the full cue-ball trajectory, including side-pocket mouths, jaws, blockers and unintended collisions; compare tested alternatives.

**Conditions and exceptions:** A close visual pass is a warning, not measured scratch probability.

**Check:** What observed or computed evidence supports this statement?

**Basis:** application-authored safeguard.

### robustness-evidence: Distinguish nominal success from tolerance.

**Use:** Perturb plausible aim, speed and tip placement before calling a route forgiving.

**Conditions and exceptions:** An arbitrary drawn region and one nominal success do not establish tolerance.

**Check:** What observed or computed evidence supports this statement?

**Basis:** application-authored safeguard.

### recorded-tool-evidence: Only recorded tool results support verification.

**Use:** Tie computed claims to actual tool inputs, results and starting snapshot.

**Conditions and exceptions:** Do not invent tests or retract genuine evidence merely because the recommendation was poor.

**Check:** What observed or computed evidence supports this statement?

**Basis:** application-authored safeguard.

### actual-successors: Preserve every ball in successor states.

**Use:** Chain verified final states without repositioning balls; replan from actual results after execution.

**Conditions and exceptions:** Current preview_shot cannot chain; independent previews do not prove a runout.

**Check:** What observed or computed evidence supports this statement?

**Basis:** application-authored safeguard.

### budget-honesty: Describe search coverage precisely.

**Use:** Report checked depth, alternatives and budget limits.

**Conditions and exceptions:** Best found is not a global optimum; no solution found is not impossibility.

**Check:** What observed or computed evidence supports this statement?

**Basis:** application-authored safeguard.

### source-boundary: Do not overgeneralize this source.

**Use:** Separate pattern-play abstractions, defensive diagrams, drill constraints and app safeguards.

**Conditions and exceptions:** The source excludes banks/combinations from pattern puzzles; defensive interludes include other objectives.

**Check:** What observed or computed evidence supports this statement?

**Basis:** application-authored safeguard.

### visual-uncertainty: Use diagrams as evidence with uncertainty.

**Use:** Check labels, ball roles, route keys and text together; explain ambiguity instead of fabricating calibrated values.

**Conditions and exceptions:** Cue-ball numbers can denote shot sequence; black obstacle symbols need not be the 8 ball.

**Check:** What observed or computed evidence supports this statement?

**Basis:** application-authored safeguard.

### low-friction-coaching: Match the explanation to the player request.

**Use:** Give the decisive reason and an optional next cue; expand when requested.

**Conditions and exceptions:** Do not dump the principle catalog or require logging and interrogation.

**Check:** What observed or computed evidence supports this statement?

**Basis:** application-authored safeguard.

## Evaluation and implementation priorities

The review rubric contains authored unfamiliar conceptual cases, not source patterns. Its answers remain outside runtime context. These cases have not yet been run against a signed-in model; code tests check integration, not coaching ability.

1. Evaluate wrong-side versus easy-pot traps, straight-stop exceptions, and early-versus-late problem-ball decisions.
2. Evaluate short/long error consequences, spin overrun, stroke access, and rail-route tradeoffs.
3. Evaluate rule scope: ball in hand, rotation, standard 8-ball and last-pocket variants.
4. Evaluate diagram interpretation and evidence honesty, including refusal to call independent previews a chained runout.
5. Add measured path clearance and successor-state simulation before claiming robust route verification.

For model evaluations, hold model and reasoning setting constant, capture retrieved cards and tool traces, compare before/after on held-out situations, and ask an experienced player to review uncertain judgments. Score specific behaviors, not persuasive wording. Any fabricated test, illegal continuation or unsupported full-runout claim is a critical failure. No extra paid model calls were made during this extraction.

## Page-by-page review notes

These notes summarize reasoning, not the actual patterns. A question page inherits its paired explanation's topic; it is not a separate independent teaching claim. Full-page visual means an enlarged rendering was inspected; contact-sheet visual is an overview, not calibrated geometric inspection.

| PDF page | Type | Review depth | General lesson / finding |
|---:|---|---|---|
| 1 | front matter | text plus contact-sheet visual | Contents and section navigation. |
| 2 | front matter | text/OCR plus full-page visual | Notation, setup, solution symbols and cue-ball strike indicators. |
| 3 | front matter | text/OCR plus full-page visual | Within-family difficulty, pattern flow and ball-in-hand scope. |
| 4 | front matter | text/OCR plus full-page visual | Rail-sequence notation and distinction between cue-ball order and object-ball identity. |
| 5 | front matter | text/OCR plus full-page visual | Variable equipment, optional hints and restricted half-table practice. |
| 6 | front matter | text/OCR plus full-page visual | Low tip does not imply draw; route notation and pattern-puzzle scope. |
| 7 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 8. Compare opening angle and proximity to reduce precision demands in constrained practice. |
| 8 | pattern explanation | text/OCR plus full-page visual | Compare opening angle and proximity to reduce precision demands in constrained practice. |
| 9 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 10. Maintain the useful side of a pocket line and enough spin at contact. |
| 10 | pattern explanation | text plus contact-sheet visual | Maintain the useful side of a pocket line and enough spin at contact. |
| 11 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 12. Distinguish deliberately crossing a reference line from approaching on its useful side. |
| 12 | pattern explanation | text plus contact-sheet visual | Distinguish deliberately crossing a reference line from approaching on its useful side. |
| 13 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 14. Create a chain of modest angles rather than isolated easy pots. |
| 14 | pattern explanation | text plus contact-sheet visual | Create a chain of modest angles rather than isolated easy pots. |
| 15 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 16. Combine deliberate line crossing with controlled hold shots. |
| 16 | pattern explanation | text plus contact-sheet visual | Combine deliberate line crossing with controlled hold shots. |
| 17 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 18. Use small angles and near-line leaves to connect alternative routes. |
| 18 | pattern explanation | text plus contact-sheet visual | Use small angles and near-line leaves to connect alternative routes. |
| 19 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 20. Plan sequential reference-line relationships rather than only the next position. |
| 20 | pattern explanation | text plus contact-sheet visual | Plan sequential reference-line relationships rather than only the next position. |
| 21 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 22. Create sufficient angle for transfers requiring substantial cue-ball travel. |
| 22 | pattern explanation | text plus contact-sheet visual | Create sufficient angle for transfers requiring substantial cue-ball travel. |
| 23 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 24. Work from limited pocket access and preserve the next useful side. |
| 24 | pattern explanation | text plus contact-sheet visual | Work from limited pocket access and preserve the next useful side. |
| 25 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 26. Compare the stopping tolerance of direct and cushion-assisted approaches. |
| 26 | pattern explanation | text/OCR plus full-page visual | Compare the stopping tolerance of direct and cushion-assisted approaches. |
| 27 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 28. Evaluate landing tolerance alongside contact thickness and blocker clearance. |
| 28 | pattern explanation | text plus contact-sheet visual | Evaluate landing tolerance alongside contact thickness and blocker clearance. |
| 29 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 30. An earlier leave can reduce later power requirements. |
| 30 | pattern explanation | text plus contact-sheet visual | An earlier leave can reduce later power requirements. |
| 31 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 32. Choose an approach whose short outcomes still preserve an angle. |
| 32 | pattern explanation | text plus contact-sheet visual | Choose an approach whose short outcomes still preserve an angle. |
| 33 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 34. Preserve both the useful line side and cueing space away from a cushion. |
| 34 | pattern explanation | text plus contact-sheet visual | Preserve both the useful line side and cueing space away from a cushion. |
| 35 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 36. A makeable next ball is insufficient without its continuation angle. |
| 36 | pattern explanation | text plus contact-sheet visual | A makeable next ball is insufficient without its continuation angle. |
| 37 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 38. Compare a narrow draw landing with a cushion-target alternative. |
| 38 | pattern explanation | text plus contact-sheet visual | Compare a narrow draw landing with a cushion-target alternative. |
| 39 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 40. An appropriate angle and running spin can enable a controlled longer transfer. |
| 40 | pattern explanation | text plus contact-sheet visual | An appropriate angle and running spin can enable a controlled longer transfer. |
| 41 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 42. Recognize danger boundaries and alternate recovery strokes for short leaves. |
| 42 | pattern explanation | text plus contact-sheet visual | Recognize danger boundaries and alternate recovery strokes for short leaves. |
| 43 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 44. Contact thickness changes cue-ball route and travel distance together. |
| 44 | pattern explanation | text plus contact-sheet visual | Contact thickness changes cue-ball route and travel distance together. |
| 45 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 46. Use a feasible alternative angle when blockers prevent the ideal approach. |
| 46 | pattern explanation | text plus contact-sheet visual | Use a feasible alternative angle when blockers prevent the ideal approach. |
| 47 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 48. Compare sliding departure with a modified impact state to establish the next angle. |
| 48 | pattern explanation | text plus contact-sheet visual | Compare sliding departure with a modified impact state to establish the next angle. |
| 49 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 50. A cushion-adjacent approach can simplify movement when the subsequent stroke permits it. |
| 50 | pattern explanation | text plus contact-sheet visual | A cushion-adjacent approach can simplify movement when the subsequent stroke permits it. |
| 51 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 52. More suitable angle can replace forced position with controlled travel. |
| 52 | pattern explanation | text plus contact-sheet visual | More suitable angle can replace forced position with controlled travel. |
| 53 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 54. Retain multi-rail alternatives when an open table permits them. |
| 54 | pattern explanation | text plus contact-sheet visual | Retain multi-rail alternatives when an open table permits them. |
| 55 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 56. A short local move can replace a delicate longer roll. |
| 56 | pattern explanation | text plus contact-sheet visual | A short local move can replace a delicate longer roll. |
| 57 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 58. Plan the opening transfer with its intermediate cushion target and later continuation. |
| 58 | pattern explanation | text plus contact-sheet visual | Plan the opening transfer with its intermediate cushion target and later continuation. |
| 59 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 60. Select the useful line side before shooting and keep a recovery for excessive travel. |
| 60 | pattern explanation | text plus contact-sheet visual | Select the useful line side before shooting and keep a recovery for excessive travel. |
| 61 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 62. Repeated cushion-assisted transfers can preserve useful approach angles. |
| 62 | pattern explanation | text plus contact-sheet visual | Repeated cushion-assisted transfers can preserve useful approach angles. |
| 63 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 64. Maintain orientation-specific line relationships through successive shots. |
| 64 | pattern explanation | text plus contact-sheet visual | Maintain orientation-specific line relationships through successive shots. |
| 65 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 66. A cushion return can establish the necessary side of the following pocket line. |
| 66 | pattern explanation | text plus contact-sheet visual | A cushion return can establish the necessary side of the following pocket line. |
| 67 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 68. Use departure geometry to connect a planned cushion contact to the next angle. |
| 68 | pattern explanation | text plus contact-sheet visual | Use departure geometry to connect a planned cushion contact to the next angle. |
| 69 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 70. Limited pocket access constrains the preceding shot's leave. |
| 70 | pattern explanation | text plus contact-sheet visual | Limited pocket access constrains the preceding shot's leave. |
| 71 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 72. Connect natural departure angles with controlled strokes. |
| 72 | pattern explanation | text plus contact-sheet visual | Connect natural departure angles with controlled strokes. |
| 73 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 74. Work backward from a later transition and approach its region along a useful direction. |
| 74 | pattern explanation | text plus contact-sheet visual | Work backward from a later transition and approach its region along a useful direction. |
| 75 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 76. Use an opening cushion route to establish a controlled subsequent departure. |
| 76 | pattern explanation | text plus contact-sheet visual | Use an opening cushion route to establish a controlled subsequent departure. |
| 77 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 78. Suitable angle and side spin can reduce the stroke needed for a long transfer. |
| 78 | pattern explanation | text plus contact-sheet visual | Suitable angle and side spin can reduce the stroke needed for a long transfer. |
| 79 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 80. Compare an end-cushion return with a precise short forward crossing. |
| 80 | pattern explanation | text plus contact-sheet visual | Compare an end-cushion return with a precise short forward crossing. |
| 81 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 82. A restricted pocket creates a multi-shot dependency chain. |
| 82 | pattern explanation | text plus contact-sheet visual | A restricted pocket creates a multi-shot dependency chain. |
| 83 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 84. An easier next pot can produce a harder following transfer. |
| 84 | pattern explanation | text plus contact-sheet visual | An easier next pot can produce a harder following transfer. |
| 85 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 86. Plan the angle needed for an end-to-end transfer several shots in advance. |
| 86 | pattern explanation | text plus contact-sheet visual | Plan the angle needed for an end-to-end transfer several shots in advance. |
| 87 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 88. A wider route can outperform a narrow direct position attempt. |
| 88 | pattern explanation | text plus contact-sheet visual | A wider route can outperform a narrow direct position attempt. |
| 89 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 90. A hanging ball can still be the principal position problem. |
| 90 | pattern explanation | text plus contact-sheet visual | A hanging ball can still be the principal position problem. |
| 91 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 92. Choose an approach that lowers execution demands and adjust for changed angles. |
| 92 | pattern explanation | text plus contact-sheet visual | Choose an approach that lowers execution demands and adjust for changed angles. |
| 93 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 94. Prioritize a later high-angle leave before selecting earlier position shots. |
| 94 | pattern explanation | text plus contact-sheet visual | Prioritize a later high-angle leave before selecting earlier position shots. |
| 95 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 96. Create enough angle to clear a nearby object ball without unwanted contact. |
| 96 | pattern explanation | text plus contact-sheet visual | Create enough angle to clear a nearby object ball without unwanted contact. |
| 97 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 98. Small rebound adjustments can establish the next useful angle. |
| 98 | pattern explanation | text plus contact-sheet visual | Small rebound adjustments can establish the next useful angle. |
| 99 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 100. Approaching along the useful angle is a candidate-selection preference. |
| 100 | pattern explanation | text plus contact-sheet visual | Approaching along the useful angle is a candidate-selection preference. |
| 101 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 102. An apparently late problem can determine earlier approach regions. |
| 102 | pattern explanation | text plus contact-sheet visual | An apparently late problem can determine earlier approach regions. |
| 103 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 104. Include a narrow inter-ball corridor in the preceding angle decision. |
| 104 | pattern explanation | text plus contact-sheet visual | Include a narrow inter-ball corridor in the preceding angle decision. |
| 105 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 106. Near-line position followed by a small draw can unlock a constrained transfer. |
| 106 | pattern explanation | text plus contact-sheet visual | Near-line position followed by a small draw can unlock a constrained transfer. |
| 107 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 108. Changing the intended pocket can enlarge the usable position window. |
| 108 | pattern explanation | text plus contact-sheet visual | Changing the intended pocket can enlarge the usable position window. |
| 109 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 110. An intermediate cushion-contact region supports a later high-angle leave. |
| 110 | pattern explanation | text plus contact-sheet visual | An intermediate cushion-contact region supports a later high-angle leave. |
| 111 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 112. Track separate early and late transition constraints. |
| 112 | pattern explanation | text plus contact-sheet visual | Track separate early and late transition constraints. |
| 113 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 114. Evaluate a chain of multi-rail approaches instead of dismissing longer routes. |
| 114 | pattern explanation | text plus contact-sheet visual | Evaluate a chain of multi-rail approaches instead of dismissing longer routes. |
| 115 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 116. An underhit leave can flatten a later angle; compare a different cushion route. |
| 116 | pattern explanation | text plus contact-sheet visual | An underhit leave can flatten a later angle; compare a different cushion route. |
| 117 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 118. Create line crossing deliberately while preserving a natural following transfer. |
| 118 | pattern explanation | text plus contact-sheet visual | Create line crossing deliberately while preserving a natural following transfer. |
| 119 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 120. A difficult opening transfer can unlock an otherwise connected sequence. |
| 120 | pattern explanation | text plus contact-sheet visual | A difficult opening transfer can unlock an otherwise connected sequence. |
| 121 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 122. Too much running spin can overshoot the useful angle. |
| 122 | pattern explanation | text/OCR plus full-page visual | Too much running spin can overshoot the useful angle. |
| 123 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 124. Plan for two distinct positional bottlenecks in one run. |
| 124 | pattern explanation | text plus contact-sheet visual | Plan for two distinct positional bottlenecks in one run. |
| 125 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 126. Cushion approach and modest spin adjustment establish successive useful line sides. |
| 126 | pattern explanation | text plus contact-sheet visual | Cushion approach and modest spin adjustment establish successive useful line sides. |
| 127 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 128. Controlled local movement can set up a later larger transfer. |
| 128 | pattern explanation | text plus contact-sheet visual | Controlled local movement can set up a later larger transfer. |
| 129 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 130. Compare angles by the power and precision demanded on the next shot. |
| 130 | pattern explanation | text plus contact-sheet visual | Compare angles by the power and precision demanded on the next shot. |
| 131 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 132. Use near-line draw and deliberate side selection to address multiple constraints. |
| 132 | pattern explanation | text plus contact-sheet visual | Use near-line draw and deliberate side selection to address multiple constraints. |
| 133 | defensive diagram interlude | text/OCR plus full-page visual | Visual comparison of cue-ball and target-ball separation; no detailed prose explanation supplied. |
| 134 | defensive diagram interlude | text/OCR plus full-page visual | Visual comparison of cue-ball and target-ball separation; no detailed prose explanation supplied. |
| 135 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 136. Choose the next pocket for continuation quality rather than convenience alone. |
| 136 | pattern explanation | text plus contact-sheet visual | Choose the next pocket for continuation quality rather than convenience alone. |
| 137 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 138. Compare opening pockets by the quality of short position outcomes. |
| 138 | pattern explanation | text plus contact-sheet visual | Compare opening pockets by the quality of short position outcomes. |
| 139 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 140. Establish a useful reference-line side before a longer transfer. |
| 140 | pattern explanation | text plus contact-sheet visual | Establish a useful reference-line side before a longer transfer. |
| 141 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 142. Preserve several successive line-side dependencies. |
| 142 | pattern explanation | text plus contact-sheet visual | Preserve several successive line-side dependencies. |
| 143 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 144. Identify the opening bottleneck and a deliberate later line crossing. |
| 144 | pattern explanation | text plus contact-sheet visual | Identify the opening bottleneck and a deliberate later line crossing. |
| 145 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 146. Connect multiple angle dependencies rather than planning one leave at a time. |
| 146 | pattern explanation | text plus contact-sheet visual | Connect multiple angle dependencies rather than planning one leave at a time. |
| 147 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 148. Separate two bottlenecks and route around an obstacle between them. |
| 148 | pattern explanation | text plus contact-sheet visual | Separate two bottlenecks and route around an obstacle between them. |
| 149 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 150. Determine a later approach region before selecting the opening route. |
| 150 | pattern explanation | text plus contact-sheet visual | Determine a later approach region before selecting the opening route. |
| 151 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 152. Compare distance, blockers and next-shot quality together. |
| 152 | pattern explanation | text plus contact-sheet visual | Compare distance, blockers and next-shot quality together. |
| 153 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 154. A key middle transfer determines earlier angle requirements. |
| 154 | pattern explanation | text plus contact-sheet visual | A key middle transfer determines earlier angle requirements. |
| 155 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 156. Near-neighbor balls constrain access while a later finish creates another dependency. |
| 156 | pattern explanation | text plus contact-sheet visual | Near-neighbor balls constrain access while a later finish creates another dependency. |
| 157 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 158. A stop shot can preserve the next angle without additional travel. |
| 158 | pattern explanation | text plus contact-sheet visual | A stop shot can preserve the next angle without additional travel. |
| 159 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 160. Compare draw-dependent rebound with an alternative approach direction. |
| 160 | pattern explanation | text plus contact-sheet visual | Compare draw-dependent rebound with an alternative approach direction. |
| 161 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 162. Adapt pocket choice when the actual leave differs from the preferred angle. |
| 162 | pattern explanation | text plus contact-sheet visual | Adapt pocket choice when the actual leave differs from the preferred angle. |
| 163 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 164. A visually awkward cut can increase position precision demands. |
| 164 | pattern explanation | text plus contact-sheet visual | A visually awkward cut can increase position precision demands. |
| 165 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 166. The ball nearest the winner is not necessarily a usable final predecessor. |
| 166 | pattern explanation | text plus contact-sheet visual | The ball nearest the winner is not necessarily a usable final predecessor. |
| 167 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 168. Do not preserve the nearest ball automatically when another finish connects better. |
| 168 | pattern explanation | text plus contact-sheet visual | Do not preserve the nearest ball automatically when another finish connects better. |
| 169 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 170. Stop and stun can form a simple connected finish. |
| 170 | pattern explanation | text plus contact-sheet visual | Stop and stun can form a simple connected finish. |
| 171 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 172. Leave cueing clearance when the following shot requires low contact. |
| 172 | pattern explanation | text/OCR plus full-page visual | Leave cueing clearance when the following shot requires low contact. |
| 173 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 174. Plan the final transition before committing to the first ball. |
| 174 | pattern explanation | text plus contact-sheet visual | Plan the final transition before committing to the first ball. |
| 175 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 176. A restricted winning-ball pocket governs predecessor selection. |
| 176 | pattern explanation | text plus contact-sheet visual | A restricted winning-ball pocket governs predecessor selection. |
| 177 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 178. Resolve restricted balls while creating the angle for a later substantial transfer. |
| 178 | pattern explanation | text plus contact-sheet visual | Resolve restricted balls while creating the angle for a later substantial transfer. |
| 179 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 180. Use a specific cushion approach to navigate a restricted ball near opponents. |
| 180 | pattern explanation | text plus contact-sheet visual | Use a specific cushion approach to navigate a restricted ball near opponents. |
| 181 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 182. Compare order and pocket choices by recovery from a short leave. |
| 182 | pattern explanation | text plus contact-sheet visual | Compare order and pocket choices by recovery from a short leave. |
| 183 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 184. Address multiple restrictions while preserving winning-ball access. |
| 184 | pattern explanation | text plus contact-sheet visual | Address multiple restrictions while preserving winning-ball access. |
| 185 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 186. Controlled hold position can link a restricted ball to the finish. |
| 186 | pattern explanation | text plus contact-sheet visual | Controlled hold position can link a restricted ball to the finish. |
| 187 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 188. Use a current access opportunity before a ball becomes a run stopper. |
| 188 | pattern explanation | text plus contact-sheet visual | Use a current access opportunity before a ball becomes a run stopper. |
| 189 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 190. Resolve an early restriction without losing the route to the winner. |
| 190 | pattern explanation | text plus contact-sheet visual | Resolve an early restriction without losing the route to the winner. |
| 191 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 192. Intentional straight position can establish the following useful angle. |
| 192 | pattern explanation | text plus contact-sheet visual | Intentional straight position can establish the following useful angle. |
| 193 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 194. Open balls still require a connected order. |
| 194 | pattern explanation | text plus contact-sheet visual | Open balls still require a connected order. |
| 195 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 196. Prefer a compact chain when it preserves the necessary angles. |
| 196 | pattern explanation | text plus contact-sheet visual | Prefer a compact chain when it preserves the necessary angles. |
| 197 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 198. Select a reachable key ball rather than a superficially convenient one. |
| 198 | pattern explanation | text plus contact-sheet visual | Select a reachable key ball rather than a superficially convenient one. |
| 199 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 200. A restricted ball can appropriately serve as the final predecessor. |
| 200 | pattern explanation | text/OCR plus full-page visual | A restricted ball can appropriately serve as the final predecessor. |
| 201 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 202. Create a later high angle through simple earlier links. |
| 202 | pattern explanation | text plus contact-sheet visual | Create a later high angle through simple earlier links. |
| 203 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 204. Cushion proximity can enable a controlled lateral move to the winner. |
| 204 | pattern explanation | text plus contact-sheet visual | Cushion proximity can enable a controlled lateral move to the winner. |
| 205 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 206. Choose the final predecessor by its useful exit and reachable entry. |
| 206 | pattern explanation | text plus contact-sheet visual | Choose the final predecessor by its useful exit and reachable entry. |
| 207 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 208. Address balls before their available approaches deteriorate. |
| 208 | pattern explanation | text plus contact-sheet visual | Address balls before their available approaches deteriorate. |
| 209 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 210. Resolve an early restriction while protecting later line-side requirements. |
| 210 | pattern explanation | text plus contact-sheet visual | Resolve an early restriction while protecting later line-side requirements. |
| 211 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 212. Preserve both straight-stop and angled-cushion recovery options. |
| 212 | pattern explanation | text plus contact-sheet visual | Preserve both straight-stop and angled-cushion recovery options. |
| 213 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 214. Restricted winning-ball access requires a suitable final predecessor angle. |
| 214 | pattern explanation | text plus contact-sheet visual | Restricted winning-ball access requires a suitable final predecessor angle. |
| 215 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 216. Choose a key ball and the side of its pocket line together. |
| 216 | pattern explanation | text plus contact-sheet visual | Choose a key ball and the side of its pocket line together. |
| 217 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 218. Opponent balls can complicate an otherwise open layout. |
| 218 | pattern explanation | text plus contact-sheet visual | Opponent balls can complicate an otherwise open layout. |
| 219 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 220. Resolve connected problem areas through a deliberate order. |
| 220 | pattern explanation | text plus contact-sheet visual | Resolve connected problem areas through a deliberate order. |
| 221 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 222. Keep cueing room for a draw-dependent next shot. |
| 222 | pattern explanation | text plus contact-sheet visual | Keep cueing room for a draw-dependent next shot. |
| 223 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 224. Plan open balls around remaining opponent-ball obstacles. |
| 224 | pattern explanation | text plus contact-sheet visual | Plan open balls around remaining opponent-ball obstacles. |
| 225 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 226. A controlled hold shot can preserve an existing useful angle. |
| 226 | pattern explanation | text plus contact-sheet visual | A controlled hold shot can preserve an existing useful angle. |
| 227 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 228. Preserve a key-ball approach through preceding cushion transfers. |
| 228 | pattern explanation | text plus contact-sheet visual | Preserve a key-ball approach through preceding cushion transfers. |
| 229 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 230. The angle on the key ball matters as much as its identity. |
| 230 | pattern explanation | text plus contact-sheet visual | The angle on the key ball matters as much as its identity. |
| 231 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 232. Compare plausible key balls rather than accept the obvious-looking one. |
| 232 | pattern explanation | text plus contact-sheet visual | Compare plausible key balls rather than accept the obvious-looking one. |
| 233 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 234. Find a workable finishing connection before optimizing early order. |
| 234 | pattern explanation | text plus contact-sheet visual | Find a workable finishing connection before optimizing early order. |
| 235 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 236. Several restricted balls and the winning ball create competing dependencies. |
| 236 | pattern explanation | text plus contact-sheet visual | Several restricted balls and the winning ball create competing dependencies. |
| 237 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 238. A preparatory linking shot can be better than shooting the problem ball immediately. |
| 238 | pattern explanation | text plus contact-sheet visual | A preparatory linking shot can be better than shooting the problem ball immediately. |
| 239 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 240. Reject a last-ball candidate with no practical exit to the winner. |
| 240 | pattern explanation | text plus contact-sheet visual | Reject a last-ball candidate with no practical exit to the winner. |
| 241 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 242. An exacting finish can justify using a different ball order. |
| 242 | pattern explanation | text plus contact-sheet visual | An exacting finish can justify using a different ball order. |
| 243 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 244. Conditional secondary contact can be considered for a changed leave. |
| 244 | pattern explanation | text/OCR plus full-page visual | Conditional secondary contact can be considered for a changed leave. |
| 245 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 246. An open group can conceal difficult access to the winning ball. |
| 246 | pattern explanation | text plus contact-sheet visual | An open group can conceal difficult access to the winning ball. |
| 247 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 248. Resolve multiple restrictions while retaining an end-to-end connection. |
| 248 | pattern explanation | text plus contact-sheet visual | Resolve multiple restrictions while retaining an end-to-end connection. |
| 249 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 250. Use an available early approach to a problem ball and preserve later access. |
| 250 | pattern explanation | text plus contact-sheet visual | Use an available early approach to a problem ball and preserve later access. |
| 251 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 252. A relatively flat angle may be intentional when the continuation uses draw. |
| 252 | pattern explanation | text plus contact-sheet visual | A relatively flat angle may be intentional when the continuation uses draw. |
| 253 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 254. Compare complete orders for a workable final predecessor. |
| 254 | pattern explanation | text plus contact-sheet visual | Compare complete orders for a workable final predecessor. |
| 255 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 256. Long cushion routes remain candidates when supported by the needed angles. |
| 256 | pattern explanation | text plus contact-sheet visual | Long cushion routes remain candidates when supported by the needed angles. |
| 257 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 258. Small local moves can maintain a connected sequence through open balls. |
| 258 | pattern explanation | text plus contact-sheet visual | Small local moves can maintain a connected sequence through open balls. |
| 259 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 260. Resolve an early restricted ball while preserving successive angle relationships. |
| 260 | pattern explanation | text plus contact-sheet visual | Resolve an early restricted ball while preserving successive angle relationships. |
| 261 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 262. Side spin can check speed and change rebound direction together. |
| 262 | pattern explanation | text/OCR plus full-page visual | Side spin can check speed and change rebound direction together. |
| 263 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 264. Work around several restrictions by preserving connecting angles. |
| 264 | pattern explanation | text plus contact-sheet visual | Work around several restrictions by preserving connecting angles. |
| 265 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 266. A problem ball need not be removed first when it forms a good finish. |
| 266 | pattern explanation | text plus contact-sheet visual | A problem ball need not be removed first when it forms a good finish. |
| 267 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 268. A stop shot can simplify a chain containing several restricted balls. |
| 268 | pattern explanation | text plus contact-sheet visual | A stop shot can simplify a chain containing several restricted balls. |
| 269 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 270. Open balls still benefit from deliberate order and return angles. |
| 270 | pattern explanation | text plus contact-sheet visual | Open balls still benefit from deliberate order and return angles. |
| 271 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 272. Prioritize restricted access while keeping two later transfers reachable. |
| 272 | pattern explanation | text plus contact-sheet visual | Prioritize restricted access while keeping two later transfers reachable. |
| 273 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 274. Near-line position can connect simple strokes to a larger finishing transfer. |
| 274 | pattern explanation | text plus contact-sheet visual | Near-line position can connect simple strokes to a larger finishing transfer. |
| 275 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 276. Avoid crossing a useful boundary while linking an early problem to the finish. |
| 276 | pattern explanation | text plus contact-sheet visual | Avoid crossing a useful boundary while linking an early problem to the finish. |
| 277 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 278. Omitting unnecessary running spin can prevent excessive rebound travel. |
| 278 | pattern explanation | text/OCR plus full-page visual | Omitting unnecessary running spin can prevent excessive rebound travel. |
| 279 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 280. Use a stop shot to preserve the next useful departure. |
| 280 | pattern explanation | text plus contact-sheet visual | Use a stop shot to preserve the next useful departure. |
| 281 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 282. Shooting every problem ball immediately can damage the remaining connections. |
| 282 | pattern explanation | text plus contact-sheet visual | Shooting every problem ball immediately can damage the remaining connections. |
| 283 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 284. Plan different continuations for near-line and angled leaves. |
| 284 | pattern explanation | text plus contact-sheet visual | Plan different continuations for near-line and angled leaves. |
| 285 | strategic question | text plus contact-sheet visual | Separate legal defence and intentional-foul tie-up choices; penalties and alternatives require explicit evaluation. |
| 286 | strategic answer | text/OCR plus full-page visual | Separate legal defence and intentional-foul tie-up choices; penalties and alternatives require explicit evaluation. |
| 287 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 288. Short backward and controlled hold moves preserve connecting angles. |
| 288 | pattern explanation | text plus contact-sheet visual | Short backward and controlled hold moves preserve connecting angles. |
| 289 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 290. Resolving one restriction can create the route to the next. |
| 290 | pattern explanation | text plus contact-sheet visual | Resolving one restriction can create the route to the next. |
| 291 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 292. Small side spin can straighten the rebound toward a useful reference line. |
| 292 | pattern explanation | text plus contact-sheet visual | Small side spin can straighten the rebound toward a useful reference line. |
| 293 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 294. Preserve line side while drawing away from an opponent-ball obstruction. |
| 294 | pattern explanation | text plus contact-sheet visual | Preserve line side while drawing away from an opponent-ball obstruction. |
| 295 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 296. Retain a draw recovery when a preferred angled leave becomes straight. |
| 296 | pattern explanation | text plus contact-sheet visual | Retain a draw recovery when a preferred angled leave becomes straight. |
| 297 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 298. A restricted final predecessor is acceptable when the approach chain supports it. |
| 298 | pattern explanation | text plus contact-sheet visual | A restricted final predecessor is acceptable when the approach chain supports it. |
| 299 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 300. Avoid line crossing on separate transfers within one sequence. |
| 300 | pattern explanation | text plus contact-sheet visual | Avoid line crossing on separate transfers within one sequence. |
| 301 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 302. Use earlier open balls to establish access to a later restriction. |
| 302 | pattern explanation | text plus contact-sheet visual | Use earlier open balls to establish access to a later restriction. |
| 303 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 304. Plan both deliberate crossing and cushion separation before a later transfer. |
| 304 | pattern explanation | text plus contact-sheet visual | Plan both deliberate crossing and cushion separation before a later transfer. |
| 305 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 306. Clear an obstruction before trying to use the blocked ball's pocket. |
| 306 | pattern explanation | text plus contact-sheet visual | Clear an obstruction before trying to use the blocked ball's pocket. |
| 307 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 308. Small forward and backward moves can build the key-ball approach. |
| 308 | pattern explanation | text plus contact-sheet visual | Small forward and backward moves can build the key-ball approach. |
| 309 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 310. Multiple stop and hold shots can simplify a connected pattern. |
| 310 | pattern explanation | text plus contact-sheet visual | Multiple stop and hold shots can simplify a connected pattern. |
| 311 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 312. Prefer orders in which each leave creates the next practical connection. |
| 312 | pattern explanation | text plus contact-sheet visual | Prefer orders in which each leave creates the next practical connection. |
| 313 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 314. Resolve early access while preserving a later cushion-assisted finish. |
| 314 | pattern explanation | text plus contact-sheet visual | Resolve early access while preserving a later cushion-assisted finish. |
| 315 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 316. Use an early opportunity for the restricted ball, then connect the open balls. |
| 316 | pattern explanation | text plus contact-sheet visual | Use an early opportunity for the restricted ball, then connect the open balls. |
| 317 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 318. Controlled rolling links can establish a useful final angle. |
| 318 | pattern explanation | text plus contact-sheet visual | Controlled rolling links can establish a useful final angle. |
| 319 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 320. Use a restricted finishing ball while controlling spin-induced overrun. |
| 320 | pattern explanation | text/OCR plus full-page visual | Use a restricted finishing ball while controlling spin-induced overrun. |
| 321 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 322. Keep deliberate line-side constraints across several successive transfers. |
| 322 | pattern explanation | text plus contact-sheet visual | Keep deliberate line-side constraints across several successive transfers. |
| 323 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 324. Same-pocket finishing constraints change the key-ball and winning-ball plan. |
| 324 | pattern explanation | text plus contact-sheet visual | Same-pocket finishing constraints change the key-ball and winning-ball plan. |
| 325 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 326. Line crossing and near-line leaves establish a last-pocket finish. |
| 326 | pattern explanation | text plus contact-sheet visual | Line crossing and near-line leaves establish a last-pocket finish. |
| 327 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 328. Open balls do not remove the same-pocket finishing dependency. |
| 328 | pattern explanation | text plus contact-sheet visual | Open balls do not remove the same-pocket finishing dependency. |
| 329 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 330. Stop-shot links can support a last-pocket finishing angle. |
| 330 | pattern explanation | text plus contact-sheet visual | Stop-shot links can support a last-pocket finishing angle. |
| 331 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 332. Resolve a restriction while preserving the final shared-pocket relationship. |
| 332 | pattern explanation | text plus contact-sheet visual | Resolve a restriction while preserving the final shared-pocket relationship. |
| 333 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 334. Line-side choices must support the variant-specific final connection. |
| 334 | pattern explanation | text plus contact-sheet visual | Line-side choices must support the variant-specific final connection. |
| 335 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 336. Small local links can establish the same-pocket final predecessor. |
| 336 | pattern explanation | text plus contact-sheet visual | Small local links can establish the same-pocket final predecessor. |
| 337 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 338. Rebound-direction adjustment can support a constrained same-pocket finish. |
| 338 | pattern explanation | text/OCR plus full-page visual | Rebound-direction adjustment can support a constrained same-pocket finish. |
| 339 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 340. Choose different recovery controls for angled versus straight leaves; entry offsets need validation. |
| 340 | pattern explanation | text/OCR plus full-page visual | Choose different recovery controls for angled versus straight leaves; entry offsets need validation. |
| 341 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 342. A rail-first approach to a hanger can create a different exit route. |
| 342 | pattern explanation | text/OCR plus full-page visual | A rail-first approach to a hanger can create a different exit route. |
| 343 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 344. Controlled hold position can provide the key ball's useful angle. |
| 344 | pattern explanation | text plus contact-sheet visual | Controlled hold position can provide the key ball's useful angle. |
| 345 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 346. Preserve either near-line or slightly crossed-line recovery options. |
| 346 | pattern explanation | text plus contact-sheet visual | Preserve either near-line or slightly crossed-line recovery options. |
| 347 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 348. Stop shots can preserve useful angles within a multi-problem sequence. |
| 348 | pattern explanation | text plus contact-sheet visual | Stop shots can preserve useful angles within a multi-problem sequence. |
| 349 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 350. A stop-shot link can connect the opening to a later restricted ball. |
| 350 | pattern explanation | text plus contact-sheet visual | A stop-shot link can connect the opening to a later restricted ball. |
| 351 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 352. Controlled hold motion can establish the final useful angle. |
| 352 | pattern explanation | text plus contact-sheet visual | Controlled hold motion can establish the final useful angle. |
| 353 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 354. Near-line and small-draw links can simplify a multi-problem sequence. |
| 354 | pattern explanation | text plus contact-sheet visual | Near-line and small-draw links can simplify a multi-problem sequence. |
| 355 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 356. Address a ball before its remaining approaches become difficult. |
| 356 | pattern explanation | text plus contact-sheet visual | Address a ball before its remaining approaches become difficult. |
| 357 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 358. An isolated ball requires deliberate entry and exit planning. |
| 358 | pattern explanation | text plus contact-sheet visual | An isolated ball requires deliberate entry and exit planning. |
| 359 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 360. Near-line leaves and controlled local moves create later travel angles. |
| 360 | pattern explanation | text plus contact-sheet visual | Near-line leaves and controlled local moves create later travel angles. |
| 361 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 362. Several consecutive stop shots can be the most connected route. |
| 362 | pattern explanation | text plus contact-sheet visual | Several consecutive stop shots can be the most connected route. |
| 363 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 364. Holding position can establish a useful angle toward a restricted ball. |
| 364 | pattern explanation | text plus contact-sheet visual | Holding position can establish a useful angle toward a restricted ball. |
| 365 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 366. Natural departure angles can navigate around another ball. |
| 366 | pattern explanation | text plus contact-sheet visual | Natural departure angles can navigate around another ball. |
| 367 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 368. Preserve a chain of side-of-line dependencies to the finish. |
| 368 | pattern explanation | text plus contact-sheet visual | Preserve a chain of side-of-line dependencies to the finish. |
| 369 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 370. Opening a needed pocket is a prerequisite rather than an optional pot. |
| 370 | pattern explanation | text/OCR plus full-page visual | Opening a needed pocket is a prerequisite rather than an optional pot. |
| 371 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 372. Small rolling links can connect two restricted regions. |
| 372 | pattern explanation | text plus contact-sheet visual | Small rolling links can connect two restricted regions. |
| 373 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 374. Kill shots and small draw can preserve successive useful angles. |
| 374 | pattern explanation | text plus contact-sheet visual | Kill shots and small draw can preserve successive useful angles. |
| 375 | pattern question diagram | text plus contact-sheet visual | Visual setup paired with explanation on PDF page 376. Opponent balls still constrain cue-ball routes in an open own-ball layout. |
| 376 | pattern explanation | text plus contact-sheet visual | Opponent balls still constrain cue-ball routes in an open own-ball layout. |
| 377 | resource page | text plus contact-sheet visual | Promotional/resource material; no additional playing principle extracted. |
