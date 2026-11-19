# Billiards Trainer strategy rules

The planner gives priority to legal, repeatable position and uses its configured table physics to verify each suggested shot. Distance and angle targets are preferences. A layout can require a longer leave, a rail, spin, or contact with a third ball.

## Rules used by the planner

| Rule | How the planner uses it |
| --- | --- |
| Start from the game's legal target | Rotation starts with the lowest live number. Group play starts with the assigned suit, then the 8. Open-table patterns evaluate the group established by the first pot. |
| Keep planning after the first pot | Carry every surviving ball's simulated resting position into the next shot. Prefer a completed route over a shorter branch. |
| Work back from the money ball | Group play evaluates which remaining ball can leave the cue ball well for the 8. Rotation retains the legal order and compares pockets and approaches for that sequence. |
| Leave a useful angle on the key ball | Favor a moderate cut around 20° when the cue ball still needs to travel. Prefer a near-straight finish when no leave is needed. Penalize cuts beyond 40° while retaining a recovery route when it is the available way to finish. |
| Choose the useful side of the shot line | Score the natural cue-ball exit toward open positions behind the following ball along its pocket lines. Use the simulated route to compare both sides when a position can be reached by crossing the line. Report the side selected. |
| Keep a comfortable shooting distance | Prefer roughly ¾ to 2 diamonds, centered near 1¼ diamonds. Penalize crowding and long shots while allowing an open pocket or better angle to compensate. |
| Leave breathing room around the cue ball | Prefer at least ¾ of a diamond center to center from the nearest surviving ball, even when it is outside the next shot line. Penalize close leaves and ones that become crowded under slight aim or speed error. A tight leave remains available when it is needed to finish the rack. |
| Keep the leave off the cushions | Prefer at least ½ diamond from the resting cue-ball center to the nearest cushion nose. Score clearance after aim and pace changes. Keep tighter leaves available when the rack calls for one. |
| Use the broad part of the position zone | Probe available shots at positions around the simulated leave. Prefer approaches along the next shot line when those nearby positions also work. |
| Leave an insurance shot | Reward a leave with several viable legal balls in group play. In rotation an alternate pocket can help, with the same legal object ball. |
| Plan around groups of balls | Spot close object-ball pairs involving a ball needed in the current game. Include extra follow, draw, speed, and side-spin trials when clusters are present. |
| Open trouble balls during a scoring shot | Reward a simulated pot that separates a surviving cluster, creates a pocket route, and leaves a workable next shot. Favor routes that also leave insurance. |
| Use a relay ball to open the next shot | For a trapped or rail-side next ball, probe scoring strokes whose post-contact cue path approaches the target or a nearby relay. Refine promising speed and spin. Chronological contacts can establish a chain such as cue ball → 9 → 2, or cue ball → scoring ball → 2. Give the chain credit when it improves access to the next legal ball. |
| Bank the scoring ball while drawing into trouble | For a trapped or rail-side next ball, also try an ordinary one-cushion bank to a pocket with draw for the cue-ball route. Verify the scoring ball’s rail and pocket separately from the contact chain that opens the next shot. |
| Use the scoring ball to open the next shot | Retain a kiss candidate off a clustered next ball even when the scoring ball has a direct pot available. Verify the intended hit, pot, pocket, and resulting leave in the simulator. |
| Avoid making another cluster | Penalize unintended new tight pairs even when the same stroke frees a different pair. |
| Preserve clear lanes | Check the cue-ball route to the ghost ball and the object-ball route toward the pocket. Carry any changes from collision into subsequent shots. |
| Avoid contact with extra balls | Score extra collisions as a cost. A light nudge receives a smaller penalty if the cue ball still leaves a close, open shot. The planner keeps a verified route when contact is the way out. |
| Control the pace | Sample different speeds and retest leading offensive strokes at ±5% speed. Penalize deterioration from the nominal leave as well as a difficult leave or missed pocket. |
| Protect a scoring shot with a two-way leave | Probe either side of the aim on shortlisted strokes. Give a small ranking advantage when a legal miss leaves the opponent hooked, on an edge, or a long low-percentage shot. The made ball, position and speed checks still apply. Straight pool is excluded. |
| Fine-tune the stroke into the finishing window | On a two-ball finish, compare extra forward routes and refine promising strokes in small speed, follow/draw, and sidespin steps. The planner respects any stroke controls the player locks. |
| Prefer natural travel | Compare follow, draw, and left/right spin. Simpler settings, shorter paths, and fewer rails have a scoring advantage when they give comparable shape. |
| Use a rail when it improves shape | A rail route can outrank a shorter path when it offers a better leave or better speed tolerance. |
| Shortlist pockets and position zones in 9-ball | If there is one practical pocket within three diamonds of the object ball, favor it. Display the opening if its margin is strong. Rank the next pocket by how easily the cue ball can reach the next shot line about three-quarters to two diamonds behind the ball, using the previous ball's position as an initial estimate. The actual simulated leave controls the final choice. Longer pockets and leaves remain eligible in the full search. |
| Favor corners along the cushion for a rail ball | Within a quarter diamond of the cushion, shortlist the two corners on the nearest rail if their direct lines are playable. Other pockets remain available. The Bank & Kick tool checks its own rebound geometry, legal first contact and intended pocket. |
| Verify the opening and next leave | Test a small set of strokes, with extra speed and spin options for longer routes. Require the opening pot and a consistent next pocket through small aim and speed changes. Simulate the second pot when its geometric margin is modest. Use the full search when the early pass finds no reliable shot. |
| Search longer cushion routes when shape is poor | For the two leading direct shots on the best partial route, expand a simulated pot with targeted speed, follow, and sidespin changes. Add only candidates with two to four cue-ball cushions after object-ball contact. Cap the added work at 16 stroke trials per step. Use the usual pot, scratch, leave, and accuracy checks to rank them. |
| Leave a usable bridge and cue stroke | Penalize leaving the cue ball near the cushion, especially with the butt of the cue pointed over that cushion. Also penalize a ball close behind the cue ball in the next stroke's line. |
| Check the simulation rather than guess | Reject scratch, wrong first contact, loss of a surviving ball, wrong pocket, and shots that fail to settle. |
| Recognize a combination | Work back through two ghost balls. Favor small gaps, full transfer and a short final pocket route. Probe aim and speed for throw and verify which object ball caused the pot. |
| Recognize a cue-ball carom | Use the approximate stun tangent and rolling departure to seed routes where the cue ball deflects from the legal first ball into the ball to be pocketed. Retest with the simulator as speed and follow change the actual departure. |
| Recognize an object-ball kiss | Look for the pocketed ball to deflect from a nearby ball. Use the physical trajectory and collision sequence to verify the kiss, including close ball pairs. |
| Search a bank kiss or bank combination | Consider each cushion and possible receiving ball near a pocket even when a direct shot is available. Estimate the rebound from cushion geometry and the table settings. Try speed and aim around the geometric route, then verify that the first object ball hits the named cushion before the intended second ball. |
| Improve the next legal ball during the scoring shot | Compare the actual new position to the shot from the same cue-ball leave with that object ball still in its old position. Reward increased pocket access for the next legal ball, regardless of which kind of shot moved it. |
| Offer a cushion-assisted alternative for review | A nominally successful bank kiss or combination with a next-shot option can appear under **Bank route**. The app shows how many of five tests held when aim and speed were varied. The standard planner requires all five tests for an indirect route to advance. |
| Reassess position after a multi-ball pot route | Require the called pocket, a legal first ball and a continuation that holds under aim and speed error. On a legal early 9, end the route. Keep the direct pot and safety in the comparison. |
| Have a defensive alternative | In 8-ball and 9-ball, look for a safety if the attack is weak or stalls. An incomplete six-shot forecast on a larger rack can still be a strong offensive start. |
| Defend against legal targets | In 9-ball evaluate visibility of the lowest ball. In 8-ball evaluate all balls of the opponent's group, or the 8 when their group is clear. On an open table use both groups. |
| Hide the full ball and both edges | Sample center and edge contact lanes. Prefer a full hook, then an edge-only leave. Where the opponent can see the ball, require longer distance and low direct pot potential. |
| Take away straightforward kicks | Prefer hooks with fewer geometrically clear one-cushion replies. This is a screening heuristic for the opponent's reply. |
| Check the foul conditions | Require a legal first contact, every ball to stay in play, and a qualifying rail after contact on the attempted safety. Apply a conservative cushion check when a ball starts frozen to it. |
| Test an available one-cushion escape | If a direct-contact safety does not hold, try one-cushion kicks that hit a legal ball and leave a difficult return. |
| Leave margin for execution | Verify the proposed safety at nominal aim and speed, then four combinations of aim error and ±5% speed. A recommendation requires all five shots to preserve a protective, legal leave. |
| Keep control with the player | Show **Use Safety** when defense is favored. Applying it sets the controls. The player chooses when to shoot. |
| Compare a deliberate foul as a last resort | When the offense stalls and neither a direct nor a kick safety holds, test nudges that tie up the opponent's legal target. Check pocket and early-9 lanes from sampled ball-in-hand placements. A foul that holds in all five tests is labeled **Use Foul**. With no other plan, **Review Foul** can identify a narrowly playable option and show its test count. A 9-ball player must check their consecutive foul count. |

## Professional rules for extending the search

These are part of the documented rule base. Each requires additional candidate generation, game state, or opponent modeling before it can drive a recommendation.

| Rule | Evidence the planner needs |
| --- | --- |
| Plan a two-way shot | Simulated makes preserve position, and realistic misses leave a difficult reply. Score the outcomes separately. |
| Clear a pocket deliberately | Model an opponent's ball or an obstacle blocking a pocket, then compare routes that open the pocket without helping the opponent. |
| Preserve a ball that controls a pocket in 8-ball | Measure which opponent balls can use that pocket before and after removal. Keep the blocker until the finish when its defensive value is high. |
| Pick the suit with the easier finish on an open table | Compare complete group routes with adequate search time for both, including how the last ball connects to the 8. |
| Move a trouble ball only as far as needed | Measure touch-speed tolerance, which pockets open, and whether a loose ball might roll into another cluster. |
| Delay a breakout when surrounding traffic makes it risky | Identify the shot that clears the traffic while keeping both a breakout ball and an insurance ball available. |
| Protect the breakout on a miss | Simulate a failed pot at both pocket jaws and measure how many useful opponent routes the broken cluster would create. |
| Use an object ball for a deliberate carom or brake | Compare the before/after cue direction and speed and verify the same controlled contact under input error. The current planner classifies the resulting shape and verifies the pot. |
| Prefer a stop-shot chain when the table offers one | Look for consecutive layouts with useful stop angles, rather than reward draw or stop independently of the next shot. |
| Use the center of the table as an option when shape is uncertain | Check real next-ball pocket choices, rails and scratch lines. The center is helpful only when it opens the sequence. |
| See the scratch before choosing the route | Penalize near misses at pocket jaws and routes whose wider speed or tip-error envelope can reach a pocket. The current planner already rejects simulated scratches. |
| Avoid running into or crossing a narrow window | Compare tested position zones along the actual path, including overshoot and crossing the angle that sends the cue ball the wrong way. |
| Account for cushion, cloth and player accuracy | Use calibrated table settings and measure uncertainty in pace, aim, tip offsets and cushion rebound. The current tolerances are fixed except for the user's aim-error setting. |
| Control one ball on a safety when possible | Compare the tolerance of a broad cue-ball hide against a plan that needs both moving balls to finish precisely. |
| Take away the return safety | In assigned-group 8-ball, compare up to three verified safeties against simulated opponent replies. Sample legal direct and indirect pots, thin hits and one-rail escapes. Check the two least favorable turn-ending leaves for a counter-safety or a scoring breakout. An opposing-group ball that drops is removed from the layout before evaluating the next inning. |
| Tuck the cue ball behind a blocker | Measure the cover zone and compare jump clearance, frozen-ball contact, and cushion escapes. Current visibility checks are on the table plane. |
| In rotation, leave the object ball clear of easy rail access | Evaluate whether rail proximity actually opens a kick path or gives the opponent an available target. |
| Improve your next inning during defense | Evaluate opening your own trouble ball, leaving your opponent tied up, and making a future ball-in-hand runout easier. |
| Keep the cue ball off the rail on offense and use it strategically on defense | Verify the required elevation and bridge for both players on the intended reply. Current offense scoring estimates this from geometry. |
| Account for match state in 9-ball | Use the actual inning and foul count to evaluate a push-out, two-foul pressure, and a stronger three-foul safety. |
| Evaluate ball in hand as a separate decision | Choose a legal placement and score attack, breakout and safety from several candidate cue-ball positions. |
| Expand the offensive search to rail-first and bank routes | Add banks, rail-first kisses, longer chains and combinations involving more than two object balls. Verify position and whether the miss leaves a safe reply. |
| Account for declared safeties and game-specific pots | A called 8-ball safety may include a legal pot. A legal 9-ball pot ordinarily continues the inning. The current recommendation searches dry safeties. |
| Adapt to the opponent | Compare offensive and defensive rack equity using measured potting, kicking and safety performance. Current **Use Safety** is a relative recommendation based on geometry and simulator tolerance. |

## Research

- Professional Billiard Instructors Association, pattern play and safety curriculum. [Instructor manual](https://drdavepoolinfo.com/resource_files/PBIA_Instructor_Manual.pdf)
- Tor Lowry, natural angles, position windows, and full-table pattern practice. [Pattern Puzzles](https://www.zerox-billiards.com/pattern-puzzles) · [Position windows](https://www.youtube.com/watch?v=E9rb1GZxhaQ)
- Dave Alciatore and Darren Appleton, choosing the useful side, entering the shape zone, and planning the angle on the ball before the finish. [Position play principles](https://drdavepoolinfo.com/resource_files/position_play_principles.pdf) · [Three-ball position drill](https://www.billiardsdigest.com/showinstruction.php?id=323)
- Darren Appleton, working backward from the 8, keeping insurance, and choosing the defensive leave by the opponent's response. [Pattern play](https://www.billiardsdigest.com/showinstruction.php?id=132) · [Safety](https://www.billiardsdigest.com/showinstruction.php?id=325)
- Dave Alciatore, two-way offense and defensive cover. [Safeties You Must Master](https://drdavepoolinfo.com/bd_articles/2020/sept20.pdf)
- Dave Alciatore and Bob Jewett, defensive routes and ball-in-hand opportunities. [Safety strategy](https://drdavepoolinfo.com/faq/safety/strategy/) · [8-ball](https://drdavepoolinfo.com/faq/strategy/8-ball/) · [9-ball](https://drdavepoolinfo.com/faq/strategy/9-ball/)
- Dave Alciatore and Bob Jewett, the intentional 9-ball foul that ties up the lowest ball and the reply with ball in hand. [Ball-in-hand options](https://drdavepoolinfo.com/bd_articles/2018/may18.pdf)
- Dave Alciatore, reference directions and changes with speed. [Cue-ball lines](https://drdavepoolinfo.com/faq/cue-ball-control/lines/) · [Speed effects](https://drdavepoolinfo.com/faq/cue-ball-control/speed/)
- Dave Alciatore and Bob Jewett, combination aiming, small-gap and frozen-ball throw, cue-ball deflections, and object-ball kisses. [Combination aiming](https://drdavepoolinfo.com/faq/combination/aiming/) · [Small gaps](https://drdavepoolinfo.com/faq/combination/small-gap/) · [Carom and kiss aiming](https://drdavepoolinfo.com/faq/30-90-rules/carom/) · [Two important kiss shots](https://drdavepoolinfo.com/resource_files/trcd/CueTimes%20PDFs/910%20Two%20Important%20Kiss%20Shots.pdf)
- Dave Alciatore, cushion response and composed rail/contact shots. [Bank and kick effects](https://drdavepoolinfo.com/faq/bank-kick/effects/) · [Rail-first carom and kiss examples](https://www.youtube.com/watch?v=k6qsxYm-_Fw)
- World Pool-Billiards Association, legal targets, frozen cushions and safeties. [Rules of play](https://www.wpapool.com/wp-content/uploads/2026/01/2026.01.02-WPA-Rules.pdf)
