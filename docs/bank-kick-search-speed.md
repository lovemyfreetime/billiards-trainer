# Bank/Kick search speed

The solver now batches cooperative checkpoints into approximately 8 ms work slices instead of waiting for a browser timer after every checkpoint. Angle evaluations are cached within each fixed-speed/spin attempt; duplicate angles no longer rerun physics. Single-rail routes first test the geometric seed (or refinement hint), accepting only after the full ordinary simulator confirms arrival and no scratch; otherwise the existing search runs. Speed/spin limits, pocket reserve refinement and full-scene verification remain.

Same-machine Chromium comparison for the screenshot-like right/top layout:

| Goal | Previous | Updated |
| --- | ---: | ---: |
| Object contact | 3.397 s | 2.546 s |
| Cue to marked location | 5.813 s | 2.838 s |

These are local measurements, not device guarantees. Difficult searches retain the 30-second deadline. Tests passed: arrival regression, one–four rail cue-only routes with real 2D/3D clicks and phone touches, complete routing regression including actual shot execution, selection/candidate unit checks, and explicit-run/cancel/no-rerun/pocket-reserve performance checks. The final performance run measured a 30.4 ms maximum search slice. Offline/native manifests regenerated together.
