# Table frame and stripe verification

Camera opens an in-app live preview where supported. File imports open the same frame editor, and Frame reopens an already loaded image. Frame Off retains full-image import. Existing native shells without getUserMedia camera permission handling use Device Camera, then the still-image editor. No installer or native protocol change is included.

One finger tilts perspective; Move switches one-finger dragging to translation. Two fingers translate, pinch, and twist. Individual corner handles support arbitrary convex outlines. The foot-spot triangle and head/foot spot dots follow the projected table. Swap Ends reverses orientation without changing the outline, and capture preserves that corner order in calibration.

Capture crops the bounding box and masks all pixels outside the quadrilateral. The editor overlay graphics are never burned into the image. A narrow black padding border allows edge calculations. Pixel masking is permanent in the imported result; reopen the original file to restore excluded image content.

Corner Sensing uses the frame's four edges as directional priors. Each edge searches inward within 7.5% of the shortest projected edge, with small slope adjustments. Robust multi-point cloth/cushion contrast is required; black mask boundaries do not qualify. Unsupported edges remain at their frame position, and all guided results remain approximate. An outline placed inside the true playing surface cannot recover excluded rails; place it at or just outside the inner cushion boundary. This is a local refinement heuristic, not a trained table segmentation model.

The extra stripe verification examines broad connected white regions inside the ball body, outside the central number-spot area. It acts only when a solid 1–7 is the leading identity and retains the combined probability of that color pair. Cue, eight, other color families, and absent white evidence are unchanged. Synthetic tests cover 1/9, 5/13, 6/14 at four angles plus glare, number circles and white backgrounds. This is not a measured real-photo accuracy improvement; the reported problem photo was not available in this checkout.

Validation includes all photo unit tests, guided four-edge and partial-edge cases, mask-only rejection, orientation preservation, and actual Chromium camera/file UI tests at desktop and portrait/landscape phone sizes. Camera tests use a synthetic local MediaStream, not physical phone hardware. Existing corner-suggestion browser checks cover four viewport sizes.
