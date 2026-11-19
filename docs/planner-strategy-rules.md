# Billiards Trainer strategy rules

The planner gives priority to legal, repeatable position and uses its configured table physics to verify each suggested shot. Distance and angle targets are preferences. A layout can require a longer leave, a rail, spin, or contact with a third ball.

## Rules used by the planner

| Rule | How the planner uses it |
| --- | --- |
| Start from the game's legal target | Rotation starts with the lowest live number. Group play starts with the assigned suit, then the 8. Open-table patterns evaluate the group established by the first pot. |
| Keep planning after the first pot | Carry every surviving ball's simulated resting position into the next shot. Prefer a completed route over a shorter branch. |
| Work back from the money ball | Group play evaluates which remaining ball can leave the cue ball well for the 8. Rotation retains the legal order and compares pockets and approaches for that sequence. |
| Leave a useful angle on the key ball | Score the next cut and the cue ball's natural direction toward the following ball. Prefer room to move through a useful angle. |
| Choose the useful side of the shot line | Evaluate the expected exit direction against the following target. Report the side of the shot line on the selected route. |
| Keep a comfortable shooting distance | Prefer a leave from roughly ¾ to 2 diamonds. Penalize crowding and long shots, with room for a better angle or an open pocket when spacing goals conflict. |
| Use the broad part of the position zone | Probe available shots at positions around the simulated leave. Prefer approaches along the next shot line when those nearby positions also work. |
| Leave an insurance shot | Reward a leave with several viable legal balls in group play. In rotation an alternate pocket can help, with the same legal object ball. |
| Plan around groups of balls | Spot close object-ball pairs involving a ball needed in the current game. Include extra follow, draw, speed, and side-spin trials when clusters are present. |
| Open trouble balls during a scoring shot | Reward a simulated pot that separates a surviving cluster, creates a pocket route, and leaves a workable next shot. Favor routes that also leave insurance. |
| Avoid making another cluster | Penalize unintended new tight pairs even when the same stroke frees a different pair. |
| Preserve clear lanes | Check the cue-ball route to the ghost ball and the object-ball route toward the pocket. Carry any changes from collision into subsequent shots. |
| Avoid contact with extra balls | Score extra collisions as a cost. A light nudge receives a smaller penalty if the cue ball still leaves a close, open shot. The planner keeps a verified route when contact is the way out. |
| Control the pace | Sample different speeds and retest leading offensive strokes at ±5% speed. A route that holds its pot and shape when speed changes earns more confidence. |
| Prefer natural travel | Compare follow, draw, and left/right spin. Simpler settings, shorter paths, and fewer rails have a scoring advantage when they give comparable shape. |
| Use a rail when it improves shape | A rail route can outrank a shorter path when it offers a better leave or better speed tolerance. |
| Leave a usable bridge and cue stroke | Penalize leaving the cue ball near the cushion, especially with the butt of the cue pointed over that cushion. Also penalize a ball close behind the cue ball in the next stroke's line. |
| Check the simulation rather than guess | Reject scratch, wrong first contact, loss of a surviving ball, wrong pocket, and shots that fail to settle. |
| Have a defensive alternative | In 8-ball and 9-ball, look for a safety if the attack is weak or stalls. An incomplete six-shot forecast on a larger rack can still be a strong offensive start. |
| Defend against legal targets | In 9-ball evaluate visibility of the lowest ball. In 8-ball evaluate all balls of the opponent's group, or the 8 when their group is clear. On an open table use both groups. |
| Hide the full ball and both edges | Sample center and edge contact lanes. Prefer a full hook, then an edge-only leave. Where the opponent can see the ball, require longer distance and low direct pot potential. |
| Take away straightforward kicks | Prefer hooks with fewer geometrically clear one-cushion replies. This is a screening heuristic for the opponent's reply. |
| Check the foul conditions | Require a legal first contact, every ball to stay in play, and a qualifying rail after contact on the attempted safety. Apply a conservative cushion check when a ball starts frozen to it. |
| Test an available one-cushion escape | If a direct-contact safety does not hold, try one-cushion kicks that hit a legal ball and leave a difficult return. |
| Leave margin for execution | Verify the proposed safety at nominal aim and speed, then four combinations of aim error and ±5% speed. A recommendation requires all five shots to preserve a protective, legal leave. |
| Keep control with the player | Show **Use Safety** when defense is favored. Applying it sets the controls. The player chooses when to shoot. |

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
| Take away the return safety | Search the opponent's likely legal defensive replies as well as pots, including thin hits, escapes and containing safeties. |
| Tuck the cue ball behind a blocker | Measure the cover zone and compare jump clearance, frozen-ball contact, and cushion escapes. Current visibility checks are on the table plane. |
| In rotation, leave the object ball clear of easy rail access | Evaluate whether rail proximity actually opens a kick path or gives the opponent an available target. |
| Improve your next inning during defense | Evaluate opening your own trouble ball, leaving your opponent tied up, and making a future ball-in-hand runout easier. |
| Keep the cue ball off the rail on offense and use it strategically on defense | Verify the required elevation and bridge for both players on the intended reply. Current offense scoring estimates this from geometry. |
| Account for match state in 9-ball | Use the actual inning and foul count to evaluate a push-out, two-foul pressure, and a stronger three-foul safety. |
| Evaluate ball in hand as a separate decision | Choose a legal placement and score attack, breakout and safety from several candidate cue-ball positions. |
| Evaluate bank, combination and carom finishes when direct play stalls | Verify a legal target and called pocket, then compare position and miss outcomes against other options. |
| Account for declared safeties and game-specific pots | A called 8-ball safety may include a legal pot. A legal 9-ball pot ordinarily continues the inning. The current recommendation searches dry safeties. |
| Adapt to the opponent | Compare offensive and defensive rack equity using measured potting, kicking and safety performance. Current **Use Safety** is a relative recommendation based on geometry and simulator tolerance. |

## Research

- Professional Billiard Instructors Association, pattern play and safety curriculum. [Instructor manual](https://drdavepoolinfo.com/resource_files/PBIA_Instructor_Manual.pdf)
- Tor Lowry, natural angles, position windows, and full-table pattern practice. [Pattern Puzzles](https://www.zerox-billiards.com/pattern-puzzles) · [Position windows](https://www.youtube.com/watch?v=E9rb1GZxhaQ)
- Darren Appleton, working backward from the 8, keeping insurance, and choosing the defensive leave by the opponent's response. [Pattern play](https://www.billiardsdigest.com/showinstruction.php?id=132) · [Safety](https://www.billiardsdigest.com/showinstruction.php?id=325)
- Dave Alciatore and Bob Jewett, defensive routes and ball-in-hand opportunities. [Safety strategy](https://drdavepoolinfo.com/faq/safety/strategy/) · [8-ball](https://drdavepoolinfo.com/faq/strategy/8-ball/) · [9-ball](https://drdavepoolinfo.com/faq/strategy/9-ball/)
- Dave Alciatore, reference directions and changes with speed. [Cue-ball lines](https://drdavepoolinfo.com/faq/cue-ball-control/lines/) · [Speed effects](https://drdavepoolinfo.com/faq/cue-ball-control/speed/)
- World Pool-Billiards Association, legal targets, frozen cushions and safeties. [Rules of play](https://www.wpapool.com/wp-content/uploads/2026/01/2026.01.02-WPA-Rules.pdf)
