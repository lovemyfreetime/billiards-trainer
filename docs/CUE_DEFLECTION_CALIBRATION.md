# Cue deflection calibration — October 22, 2026

Jeff reported excessive cue-ball deflection in roughly 50–100 real-table comparisons, across two cloth/rail conditions and three cues. One cue is advertised as low-deflection; two are not. This supports reducing the built-in response, but does not measure any individual shaft's true squirt angle.

The October 6 rebuild replaced the older `2.35 * |side|^1.28` degree response with the TP A.31 rigid-impact equation. It increased initial squirt at moderate UI English. The October 14 shaft selector exposed ratios 20.151 and 29.158 without changing the Standard default.

This release retains that equation, tip-offset mapping, speed independence of initial squirt, spin generation, swerve, cloth friction, ball collision/throw, and cushion response. Only the named shaft response parameters change:

| Setting | Previous ball/end-mass ratio | Revised ratio | Squirt at +44% right / −90% draw, before → after |
| --- | ---: | ---: | ---: |
| Standard (default) | 20.151 | 35 | 1.304° → 0.800° |
| Low-deflection | 29.158 | 50 | 0.943° → 0.575° |

At 44% side with no vertical offset, the pre-October 6 curve gave about 0.822°. Standard now gives about 0.801°, bringing moderate-English response near that earlier baseline while retaining the physical equation's smooth near-linear shape. These revised presets are provisional practical calibration choices informed by the reported over-deflection, not independently measured population averages or proof of a particular cue's performance.

## Existing data

Saved named presets automatically adopt the revised values, including legacy states with a recognized ratio but no preset label. Explicit Custom ratios remain unchanged, including 20.151, 29.158, and 35. Unrecognized finite ratios remain Custom. Restored session and undo snapshots normalize before preview simulation, so they cannot silently reinstate an obsolete named preset. Migration does not change positions, aim, speed, follow/draw, sidespin, cloth or rails. Both shots and Zen share the calibration.

## Validation and limits

`tests/cue-deflection.test.cjs` retains the independent original 2.50° / 1.80° reference benchmarks at 0.453R lateral tip offset; those tests still use explicit historical ratios. It also covers zero offset, sign, left/right symmetry, increasing squirt with offset, both presets, migration idempotence, and Custom preservation. Browser checks exercise both shots, saved-state reload, shot execution/undo and the screenshot-derived safety.

The safety reconstruction estimates ball and aim coordinates from a screenshot on an assumed 100 × 50 inch playing surface. It is a reproducible diagnostic, not a measured reproduction of Tor's stroke. Reducing deflection changes the 7's first departure toward the pre-rebuild result. A successful software check cannot establish that the full safety, especially the cue-ball hide and exact cushion contacts, matches the video.

A future quantitative shaft calibration should measure early cue-ball deviation with a near-level cue and known offset/distance, separating initial squirt from subsequent swerve. Then validate object-ball contact, cushion approach/rebound and cue-ball leave together on recorded shots. Do not fit every component to a single final-ball position.

Primary background (does not prescribe the new 35/50 presets):

- https://drdavepoolinfo.com/technical_proofs/new/TP_A-31.pdf
- https://drdavepoolinfo.com/faq/squirt/published-data/
- https://drdavepoolinfo.com/faq/squirt/endmass/

## Reusable video comparison

`guide/layouts/zero-x-safety-low.billiards.json` loads the estimated screenshot geometry as a Low-deflection session with the original 2.48 m/s, −90% draw, +44% side and 3° cue elevation. The exact shaft model and cloth coefficients remain unconfirmed; cloth brand/wear is not a measured friction value.

With aim, positions and speed held fixed, diagnostics give:

| Preset generation | Initial squirt magnitude | Overlap | 7 initial departure angle from table-length axis |
| --- | ---: | ---: | ---: |
| Previous Standard | 1.304° | 32.6% | 24.5° |
| Previous Low | 0.943° | 44.1% | 16.5° |
| Revised Standard | 0.800° | 47.6% | 14.5° |
| Revised Low | 0.575° | 55.2% | 9.6° |

Revised Low produces a straighter short-rail return, but the original 2.48 m/s still does not reproduce the video's full finish. Increasing only speed to 2.55 m/s lengthens the 7's travel from about 1.01 m to 1.49 m in this estimated setup. This is a sensitivity check, not a measurement of Tor's speed and not evidence of a complete match. The comparison fixture intentionally keeps the original speed for review.
