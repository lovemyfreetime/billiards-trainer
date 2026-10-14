# Image orientation and review panel

Analyze Balls collapses Custom Table Layouts immediately, removes its expanded state, and returns the sidebar to detected-ball review. The controls can be reopened using Custom Table Layouts.

Auto estimates the displayed table direction using the long rails of a full-table four-corner outline when available, otherwise the image aspect ratio. Auto renumbers completed full-table marks so P1 is top-right for portrait and top-left for landscape. Partial regions retain the marked reference order because their shape may be ambiguous. The diagram defaults to portrait before an image is loaded. Head / Kitchen End supports Top, Bottom, Left, Right, and Auto. Flip Ends swaps the current end. Selecting a direction renumbers existing corner points, retains their physical positions, and clears previous refinement/ball analysis to prevent stale placements. The image pixels are not rotated or resampled.

The SVG table geometry rotates while text stays upright; head, break, kitchen labels are placed separately for readability. Pointer boundary dragging converts through the rotated geometry’s inverse screen transform. Keyboard boundary steps follow the displayed direction.

Orientation guessing cannot identify the actual semantic head/foot end from cloth alone. The interface explicitly asks the user to confirm those ends and provides a direct override. Four dedicated/replaced Chase clips explain the selector, flip, custom panel, and Analyze Balls behavior.

After four usable corners are identified, a cached native-pixel foot-spot check searches near both the rack and head spots on the calibrated cloth plane. It recognizes conservative adhesive-disc or small round printed-dot evidence. A likely rack-end mark supports the selected orientation; a mark only at the opposite end suggests checking Flip Ends. Marks at both ends, obscured marks, cropped regions, and faint or absent dots are reported without changing the orientation. Printed-dot evidence is used only for this check and does not weaken the ball rejection filter.
