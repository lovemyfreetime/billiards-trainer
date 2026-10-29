# Local photo recognition update

The photo importer now supplements the existing ONNX detector/classifier with a small local color-family and stripe classifier. It measures both a larger ball-body region and the center, helping distinguish a white stripe end from a cue ball. No customer image needs a paid API call.

## Changes

- Two 80-tree classifiers learn color family and solid/stripe structure from 90 crop features. Their combined asset is about 300 KB. The existing ONNX weights are unchanged.
- Related-image-group cross-validation selected 65% supplemental visual evidence and 35% normalized neural evidence. The learned mixture is not followed by a second palette adjustment. A strong neural cue-ball vote is preserved only when the measured body is largely white/neutral and contains little saturated color.
- Rotation duplicates merge before the detector candidate quota. Final review ranking keeps assigned identities ahead of unresolved high-scoring shadows; the review list stays bounded to 16 candidates.
- Enhanced recognition runs automatically. The analysis toolbar has no recognition, rack, or lighting selectors; rack interpretation uses Auto and lighting uses the original image. Saved-image controls are accessible from Photos. The action toolbar stays on one row across screen sizes.

## Evidence and limits

Training used 150 visually reviewed reference crops in eight related-image groups. Some reference numbers are inferred from color/stripe appearance where digits are hidden; these are not independent human-certified labels. These data were previously used for development/verification and are now all development data. They are not counted as held-out evaluation here.

Grouped out-of-fold pre-assignment top-1 results improved from 95/150 to 110/150; mean log loss improved from 1.232 to 0.948. These values do not measure complete-table detection or final global assignments.

The complete tested browser pipeline produced:

| Evaluation set | Correct before | Correct after | Wrong before | Wrong after |
|---|---:|---:|---:|---:|
| Four additional rack layouts, 59 labeled balls | 36 | 53 | 9 | 0 |
| Two broadcasts, another venue, and a close-up cluster, 55 reviewed balls | 32 | 37 | 12 | 7 |
| Combined evaluation references, 114 balls | 68 | 90 | 21 | 7 |

The first group shares a venue/capture context with some development data and informed a neutral-cue safeguard; it is a diagnostic validation set, not an untouched independent-site test. The second group was excluded from model training and mixture selection. One indistinct identity was excluded from its broadcast reference; those 55 references are not a census of every visible object. The close-up cluster tests identity with a supplied image-region mapping, not true table-position calibration.

A development photograph that originally had 10 correct of 16 balls now has all 16 correct. This is a development reproduction, not a generalization claim. One broadcast regressed from 9/16 to 7/16; the earlier original-method comparison reproduced the better result on that capture. Across the 114 evaluation references, no wrong assignment simultaneously had confidence >= 0.60 and lacked a review flag; that does not prove error-free confidence calibration. Unassigned balls, missed detections, rack-spot false candidates, and shadows remain.

On this host, inference remained approximately 6.5–12 seconds per image, depending on content. These are desktop measurements, not physical-phone performance guarantees. Broad 90% recognition across arbitrary photographs has not been established.

## Automatic corners and manual starting points

Corner Sensing now offers an approximate four-marker cloth outline when a plausible bounded region is available but the stricter rail/pocket checks fail. The user can drag just the misplaced markers. Approximate results have no confidence claim, never start ball analysis automatically, and do not change the strict detector API. If no usable outline exists, existing manual markers and refinements are preserved. This is a manual calibration aid, not verified inner-cushion calibration.

Private experiments examined exterior-only contour fitting, bounded line-supported extrapolation, and inward gradient refinement. Some table outlines were recovered, but several fits still followed cushion/outer cloth boundaries rather than the playing-surface nose. An apparent acceptance increase therefore was not a validated calibration improvement. Those experimental calibration replacements remain withheld; strict automatic detection is unchanged by the manual-suggestion option.

Reliable inner-edge labels across varied perspectives and a stronger segmentation/line model are still needed. Partial views must not be assigned fabricated full-table corners. Ball-image-center projection above the cloth also remains an uncalibrated source of positional error; this release does not claim a correction.

## Reproduction

`scripts/train-photo-identity.py --samples PRIVATE.json --output photo-ball-identity-model.js --metrics PRIVATE-metrics.json` trains and exports the supplemental model. Inputs are anonymous records containing `features` (90 values), `id` (0–15), `group`, and `neural` (16 scores in the documented application order). Group names and private image identifiers are not exported. The training CLI requires NumPy and scikit-learn; browser inference does not. The measured run used Python 3.12, NumPy 2.3.5 and scikit-learn 1.8.0.

Validation includes feature-vector parity against the Python extractor, float32 tree decisions, score/class mapping, neutral-cue preservation, candidate-quota regression, the photo unit suite, actual local ONNX browser runs, and the existing analyzer/physics browser smoke. Offline and native inventories must accompany runtime publication. This is web-content work; no signed Android/Windows installer verification is implied.

Runtime release commit: `d3d6d0b83da91f048d1cbd940fefadb44653aa99`. Native content release: `49a92055c557cd9e`, protocol 1.

