# Position-play coaching baseline v1

Scope: original conditional reasoning guidance, available in every Companion request through coaching.cjs. This changes application instructions, not model weights. No source patterns, coordinates, diagrams or source shot sequences are included. No chained simulation or search has been added in this change.

Source: user-supplied PatternPuzzles.pdf (377 PDF pages). Text extracted across the file; selected explanatory passages reviewed. This is an initial synthesis, not a completed visual audit of every solution. Page references below are PDF page labels; author/title attribution beyond the supplied filename is not verified. Private source PDF is not committed.

Source-informed principles and application-authored risk/evidence policies are distinguished in position-play.cjs. Source advice is not treated as a universally valid physics law or independently validated optimum.

## Evaluate the next transition, not just the next pot.

When choosing a leave, assess the next legal ball and its route to the following ball.

Limits: A straight leave may be desirable for a stop-shot sequence or the final ball.

Decision check: Which feasible angle on the next ball supports the following transition?

Provenance: source-informed generalization; PDF pages 36, 154.

## Work backward from a constrained transition.

Identify restricted pockets, blockers and difficult transfers; derive useful approach regions and preceding angles.

Limits: Backward geometry suggests candidates; forward simulation must check reachability and all moving balls.

Decision check: Can earlier shots actually reach that region legally?

Provenance: source-informed generalization; PDF pages 154, 156.

## Preserve the useful side of the object-ball-to-pocket line.

Determine the side relative to the selected pocket and intended continuation, using actual coordinates.

Limits: There is no universally correct left/right side; another pocket or route can reverse the preference.

Decision check: Does short or long speed error cross into an unhelpful angle?

Provenance: source-informed generalization; PDF pages 32, 34, 368.

## Prefer a usable position region over a precise point.

Compare the range of resulting leaves that preserve a legal pot and useful continuation.

Limits: A large drawn circle is not evidence of tolerance; blockers can split nearby positions into different outcomes.

Decision check: Have variations been tested, or is the region only proposed?

Provenance: source-informed generalization; PDF pages 26, 28.

## Compare entering along a useful region with crossing it.

Consider whether the cue-ball travel direction preserves the useful angle over a range of stopping distances.

Limits: An along-window route can still pass a pocket or blocker; do not prefer it solely for alignment.

Decision check: What happens if the cue ball stops short or travels farther?

Provenance: source-informed generalization; PDF pages 26, 32.

## Use cushions when they improve control and access.

Compare direct and cushion-assisted routes for useful angle, speed tolerance and total risk.

Limits: More rails are not automatically better; rail calibration, spin and jaw proximity affect the result.

Decision check: Does the rail route earn its extra travel and sensitivity?

Provenance: source-informed generalization; PDF pages 28, 30, 40.

## Let an appropriate angle provide cue-ball movement.

When outcomes are comparable, prefer a controllable stroke to forcing movement from an unsuitable angle.

Limits: Soft is not always safe; sufficient speed or spin may be necessary. Do not transfer qualitative advice into invented settings.

Decision check: Is the demand caused by a poor previous leave?

Provenance: source-informed generalization; PDF pages 30, 40.

## Check distance and physical stroke access.

Consider rail proximity, bridging over balls, cut difficulty and required cueing in the next leave.

Limits: Near a rail may preserve an excellent angle; distance alone does not establish quality. A top view cannot diagnose technique.

Decision check: Can the needed stroke plausibly be delivered from the leave?

Provenance: source-informed generalization; PDF pages 34, 152.

## Resolve dependencies before removing useful options.

In games with order choice, identify restricted balls and pocket access; choose an order that preserves a finish.

Limits: Do not always shoot the hardest ball first. In rotation games the lowest-ball rule constrains first contact.

Decision check: Does removing this ball help or damage later access?

Provenance: source-informed generalization; PDF pages 250, 356, 370.

## Plan the finishing transition in games with order choice.

Choose a feasible final object ball before the winning ball and preserve a useful approach to it.

Limits: A convenient-looking key ball is insufficient if preceding shots cannot reach it. Confirm game and group.

Decision check: Does the complete proposed order preserve a feasible finish?

Provenance: source-informed generalization; PDF pages 254.

## Evaluate the entire cue-ball path for danger.

Inspect pocket-mouth and jaw approaches, scratches, blockers and unintended collisions, not only the endpoint.

Limits: A close approach is a warning, not proof of a scratch. Compare alternatives and perturbations before assigning risk.

Decision check: Could small execution changes produce a scratch or blocked continuation?

Provenance: Jeff discussion and application evidence policy.

## Separate reasoning from verified outcomes.

Only recorded tool results support tested claims. Report depth checked, evidence limits and missing alternatives.

Limits: A successful nominal shot is not a robust route, and independent current-table previews do not verify a sequence.

Decision check: Which exact result supports each claimed pot, leave and continuation?

Provenance: Jeff discussion and application evidence policy.

## Evaluation protocol

Keep evaluation answers out of runtime instructions. Use tests/fixtures/position-play-review.json as a human-reviewed behavior rubric on unfamiliar situations. These are authored conceptual cases, not reconstructed book patterns. Run the same prompts before/after with the same model and reasoning setting; retain tool traces. Score each expected behavior as present/absent, record critical failures separately, and have Jeff review ambiguous pool judgments. Do not report improved playing strength without those runs.

Critical failures: fabricated tool use, illegal order, claiming a full runout verified with single-shot-only tools, or calling a nominal near-pocket route forgiving without evidence. Requesting a comparison is acceptable if no alternative is verified. Exact real-table probabilities must not be inferred from uncalibrated simulation variations.

Next: measured path-risk outputs and successor-state simulation, followed by a three-ball integration benchmark. Prompt guidance alone cannot establish route safety or make the current preview tool chain.
