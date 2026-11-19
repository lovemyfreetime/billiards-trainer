# Conditional shot chances

This first model compares direct pockets and estimates an already verified bank/kick route. It is not fitted to Railbird's dataset and is not a measured personal make rate. The video description identifies cue/object distances, cut, pocket, speed and player as relevant variables. Its full transcript was not accessible during this implementation; do not claim it was reviewed or its aggregate rates reproduced.

## Direct pockets

The model evaluates six physical mouth centers using the Trainer's mouth dimensions (110 mm corners, 120 mm sides), ball radius, clear cue/object corridors and a valid ghost-ball contact. It projects each mouth perpendicular to object-ball travel and subtracts the ball diameter. This is a conservative, ideal opening calculation; it does not reproduce facing rebounds, shelf capture or slow rail-assisted entries.

The cue-ball ray is intersected with the object ball expanded by one cue-ball radius. A central finite difference gives the sensitivity of the object-ball departure angle to cue heading. Multiplying that sensitivity by object-ball travel and the assumed angular aim spread gives lateral uncertainty at the pocket. A 0.04-ball-radius floor represents residual lateral placement uncertainty. The centered normal probability within the usable opening gives the conditional percentage. Candidates sort by the unrounded probability; labels round to 5 percentage points. Alternatives are independent choices, not mutually exclusive outcomes that sum to 100.

Default aim standard deviation: **0.15 degrees**, a reference assumption, not a claim about average, professional or individual accuracy. The optional input changes this parameter. The comparison assumes adequate pace and compensated cut-induced throw. It does not predict scratch avoidance, position play, reach/stance difficulty or a player's intent. Current automatic guidance still offers aim only; it never silently replaces manual stroke controls or a prepared Shot 2.

## Banks and kicks

Only a complete, reached, non-scratching route from the existing full-physics solver receives an estimate. No additional solver search runs while drawing. The estimate propagates angular aim variance over route length and independent angular cushion variance over each remaining path length. Bank shots also propagate cue-to-object collision sensitivity. Default cushion standard deviation is **0.35 degrees**, scaled by rebound geometry and side spin; this is an explicit reference assumption, not a measured cloth/cushion model.

Kick contact uses the two-ball-radius contact corridor and its offset from the final approach line. Bank/kick pocketing uses the final pocket aperture. A location drill uses the existing 0.35-radius destination tolerance. Contact, reach-zone and pocketing outcomes are labelled separately. A percentage represents the whole selected route, not a per-rail success probability. Unsolved, changed, unsupported or scratching routes receive no fabricated percentage. Comparing different bank destinations currently requires selecting and calculating each route with the existing tool.

The nominal bank/kick trajectory uses the existing simulation's speed, friction, spin and collisions. The uncertainty estimate is analytical; it does not rerun every perturbed shot through the full simulator and cannot establish a calibrated real-table probability. Personal/table calibration against actual makes and misses remains future work. Skill transfer through repetition and psychological benefit require user trials.

## Presentation and performance

Green plus “Best” identifies the highest estimated direct-pocket probability, even when all options are difficult. Amber/red distinguish other feasible options; blocked/unsupported direct routes use text/dashes. Colours do not replace text. Labels are optional, remain still and disappear during playback. Reduced motion removes camera/cue approach and control pulsing. Camera inspection does not invalidate the small geometry cache. At most 90 direct options exist for 15 object balls; route uncertainty is linear in at most four rebounds.

## Sources reviewed

- Video page/description/chapters: Railbird AI, [What makes a pool shot hard? Over a million tracked shots](https://www.youtube.com/watch?v=z5EvQbElQoE), 2026-11-16. Full video/transcript review remains incomplete.
- Dr. Dave, [Cut Shot Margin For Error](https://drdavepoolinfo.com/FAQ/cut/margin-for-error/).
- Dr. Dave, [Pocket Effective Size and Center](https://drdavepoolinfo.com/faq/pocket/size-and-center/).

These sources motivate the variables and limitations. The numerical reference spreads and the model are this implementation's stated assumptions, not coefficients copied or statistically validated from those sources.
