# Private photo collection audit — 28 October 2026

The actual app pipeline was run against 111 supplied files: 108 still images and one midpoint frame extracted from each of three short videos. Original byte lengths were checked; originals, source URLs, names, crops and detailed results remain private. No user photographs are included in this repository.

## Changes

- Auto rack inference is informational. It no longer suppresses balls 10–15 because a partial rack resembles 9-ball. Explicit user-selected rack restrictions remain.
- Appearance adjustments are bounded multiplicative support. They cannot invent large scores from weak model evidence or overpower a clear learned winner with a fixed conventional palette.
- Four full-image detector rotations are retained. Up to two focused table views are added when the outlined table's bounding rectangle occupies less than 75% of the image. Candidates map back to native source pixels before shared NMS and identity checks.
- Identity crops have less surrounding cloth/neighbor context (12% padding). This helped some crowded examples but is not universally better.
- Corner sensing retains the original accepted fit. If that fails, it tries brighter cloth masks with additional pocket/rail requirements. The 9% minimum region safeguard remains; small ambiguous regions still require manual alignment.
- The app reports Auto rack output as a hint and states that all ball numbers remain available.

Existing ONNX weights are unchanged. This is a local preprocessing and inference-policy improvement, not model retraining or a local LLM integration. No paid inference API was used.

## Results and scope

All 111 cases completed without recorded analysis errors. An automatic outline was offered in 42 cases before and 57 after. The 15 additional outlines were visually inspected and follow the intended table, but several need cushion-edge refinement. These counts are accepted suggestions, not a corner-accuracy percentage; some previously accepted fits remain wrong.

134 candidate identities were visually reviewed in 14 selected problem photos, excluding uncertain labels and known false candidates from identity totals. Reference locations come from the baseline candidates, so this sample cannot measure full-table recall or all missed balls.

| Outcome on the 134 reference candidates | Before | After |
| --- | ---: | ---: |
| Correct identity | 57 | 80 |
| Incorrect assigned identity | 42 | 27 |
| Unassigned / review | 35 | 26 |
| Reference location not matched | 0 | 1 |

The development subset contains 83 references in 10 photos (38 → 51 correct). Four other photos, including related frames, contain 51 verification references (19 → 29 correct). This is a small, error-focused comparison, not a large independent accuracy benchmark. Visually proposed labels still need user confirmation where evidence is ambiguous.

Additional marked-region tests held calibration constant: on a distant-table photo, four of six known reference locations were found before and five after; correct identities rose from one to three. On a cropped half-table photo, nine of ten known references were found in both runs, with eight versus nine correct identities. A shadow duplicate and a missed ball near a pocket remain.

## Limitations and regressions

This release does not approach guaranteed identification. One broadcast-frame example fell from 13 to 10 correct identities among its 15 reviewed references. Crowded crops, alternate ball colors, partial tables and rail occlusions remain difficult. The added focused views can increase analysis time; timings from concurrent audit jobs are not a controlled speed benchmark.

54 supplied cases still require manual table-region alignment before the normal app will analyze balls. Some are deliberately partial-table, rack-closeup or table-spot photographs. Ball detection/identification was not scored for those rejected outlines as though they had been analyzed. Comprehensive ball-by-ball labels across the full collection, matched corner ground truth, and independent held-out scenes are required before any overall accuracy or model-retraining claim.

## Verification

All photo unit/flow checks passed: evidence bounds and Auto rack behavior, calibration, exposure assistance, corner sensing (15 generated green/blue/red scenes plus rejection controls), custom crops, cloth/spot rejection, thumbnails, review navigation, and zoom/pan mappings. The 111-case app run used the actual local ONNX engine when an outline was accepted; zero-detection runs used the app's existing hybrid fallback and are recorded as such. Offline and native content inventories were regenerated together.
