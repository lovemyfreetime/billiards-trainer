# Photo analyzer audit — 27 October 2026

## What the existing model recognizes

The detector's ONNX metadata identifies an Ultralytics YOLO26s export with 768-pixel input; the classifier is YOLO26n-cls with 224-pixel input. Both export exactly 16 classes: Cue-Ball and 1_ball through 15_ball. The app's color heuristics map American pool colors: yellow 1/9, blue 2/10, red 3/11, purple 4/12, orange 5/13, green 6/14, maroon 7/15 and black 8.

There is no evidence here that the models target red/yellow English pool or European carom sets. Metadata contains training paths, not the source photographs, ball brands or color variants. Their training coverage cannot be verified from the installed models. Models and weights were not retrained in this release.

## Changes

- Corner sensing searches colored cloth regions throughout the image, fits four boundary lines regardless of orientation, and uses rail contrast and dark pocket openings as supporting evidence. It no longer requires the table to occupy the image center. Unreliable fits retain manual markers rather than substituting a large background rectangle. This is image processing, not a newly trained pocket/diamond detector.
- Visible colored shells are less likely to be called the cue ball merely because a stripe's white face is prominent. Cue rescue requires stronger white-ball evidence.
- Rack-constrained assignment no longer forces a minimum 72% confidence. Close or weak assignments require review; a legal unique rack is not evidence of correct identity.
- Classifier crops use original image pixels, independently of the Sharpen preview.
- Optional **Lighting assist · experimental** compares exposure-adjusted crops against originals for dark/ambiguous balls. It preserves RGB ratios, adds at most two classifier passes per ball, and flags disagreement for review. Original lighting remains the default. Changing the selector does not automatically run analysis.

## Verification and limits

Fifteen controlled green, blue and red scenes exercise off-center, oblique, portrait and rotated tables, with gradients, ball occlusions and pocket cutouts. Corner error is below eight source pixels in these fixtures. Blank and clipped-table controls reject.

Twelve real photographs sampled across the public Pix2Pockets archive were visually compared against the former fitter. They exposed background rectangles incorrectly accepted by the old algorithm, as well as angled tables missed by its center/axis assumptions. Some distant, bright, clipped or cluttered tables still require manual corners; this is not a measured corner accuracy claim without annotated corner ground truth.

Three real photographs were also processed through the actual local ONNX detector and classifier, with Original and Lighting assist. The initial test accidentally exercised hybrid fallback because the test server served `.mjs` with the wrong MIME type; that fixture was corrected and all reported results below are from the trained AI.

| Photo | Labeled balls matched | Extra detections | Correct cue/black/solid/stripe group |
| --- | ---: | ---: | ---: |
| 2 | 13 / 13 | 2 | 11 / 13 |
| 8 | 12 / 12 | 2 | 9 / 12 |
| 9 | 15 / 15 | 1 | 15 / 15 |

Original and assist produced identical counts and group results on this small sample. Runtime was approximately 7–8.5 seconds per image on the test machine. The labels do not identify individual ball numbers, so this is **not** a ball-number accuracy benchmark, a before/after model comparison, or proof that filters improve recognition. Existing false positives and identity mistakes remain. Review is still necessary.

The next useful training/evaluation set needs full ball-number identities and four cloth-corner coordinates across the user's actual ball sets, lighting, camera angles, reflections and partial occlusions. Compare candidate changes on held-out images before replacing weights. Do not silently learn from uncertain automatic assignments.

## Reproducing image tests

Run `CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node scripts/benchmark-photo-analyzer.cjs manifest.json results.json`. A manifest is an array of `{path, lighting?: ['original','assist'], rack?: 'custom', expected?: [{x,y,radius,group,id?}]}`. Paths are relative to the manifest, coordinates are source-image pixels and groups are cue/black/solid/striped. Images stay local. The harness loads the real Analyzer, senses corners and reports the actual engine. Rejected automatic corners are reported, not fabricated. Full results and caveats are in `photo-benchmark-results.json`.

Reference photographs: the authors' [Pix2Pockets repository](https://github.com/viktorseba/pix2pockets), `8-Ball-Pool-3.zip`, whose dataset metadata lists CC BY 4.0. No dataset photos are shipped in the app. The [project's published pipeline](https://pix2pockets.compute.dtu.dk/) uses ball and rail-dot detections for table calibration; a trained rail/pocket landmark model remains a future option rather than a claim about this release.

## Other requested controls

Bank/Kick panels in 3D are capped at the same 340-pixel width as the regular Trainer. The larger glowing 2D Mode button does not resize the table. Both 2D speed controls show calibrated diamond references. Saved layout sharing validates the portable layout format, uses native sharing where available, and offers email/copy-link/download fallbacks. Shared links carry layout data in the URL fragment and import through the existing validated layout flow. Android WebViews without native Web Share use the fallback; this release does not add a new native sharing API.
