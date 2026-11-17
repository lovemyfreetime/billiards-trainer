# Interface ergonomics plan

## Approved layout decisions — November 13, 2026

These decisions extend the existing cross-mode control review and supersede the first-pass Plan toolbar group.

| Control or task | Permanent home and behavior |
| --- | --- |
| Experience switching | Upper-left in Trainer 2D/3D, Play and Companion. Companion Back to Play follows it. Zen keeps its existing bottom-toolbar position. |
| 2D / 3D switching | A direct button immediately beside the experience icon, at the same coordinates in both Trainer views. Never put it inside View or on the lower camera row. |
| Kick, Bank, Compass | Tools → Options → Aiming. Keep related compass adjustments and aiming options together. No Plan button on the main toolbar. Starting Kick or Bank closes the drawer so the user can select the table route. |
| 3D camera operation | Directly above the bottom spin controls: Full View, Cue View, shot/view adjustment, pan, rotate and zoom. These are primary 3D operations and remain immediately accessible. |
| Aim and speed | Long side controls, aim on the left and speed on the right, with generous hit targets. |
| Follow/draw and side spin | Bottom left/right sliders shortened to give the central cue-tip badge more physical room. Keep Shot 1/2 bindings independent. |
| Shoot | A large bottom-right target spanning the spin row and the row above. Reserve its space rather than overlaying other controls. |
| Ball inventory | Dedicated tray with Clear Table beside the balls. Open initially in 2D, toggleable in both views. Shorten the 2D tray at the right to clear Shoot. |
| Rack and imports | Rack belongs beside Balls and Clear, in both views. With the 3D tray closed, Rack stays beside Balls in the camera row. Import replaces Setup and contains Real Table Image Import, Camera Import, and a compact centered Layouts button. |
| Full table and speed readouts | View uses the label Full Table for the existing 2D fit/reset action. Both modes show speed and cyan diamond ratings at the top of the speed rail, plus lag at the bottom. Keep both shots bound to their own readouts. |
| Direct compass editing | Four green round handles near the center rotate the compass; four orange square rim handles resize it. Center dragging still moves/links it. Same interaction in 2D and 3D, without reopening the drawer. Preserve optional menu sliders. |
| Ball tray transfers | Drag any of the 16 balls, including the cue ball, from table to tray and back in 2D or 3D. Highlight the tray on a valid drop. Require clear cloth for placement; support action undo and cancel; block during a shot. Manual tray storage is not a scored pocket. |
| Compact 3D controls | Camera buttons are 44px tall, down from 56px. Follow/draw and side-spin groups are 56px tall, down from 64px. Keep every tool directly accessible and return the saved height to the playing area. Preserve the larger Shoot and cue-tip badge. |
| Tray and spin alignment | With the tray open, Balls sits just outside its left edge, followed by Clear, consistently in both modes. Align the tray left with the table workspace and keep its right end clear of Shoot. Keep the spin slider center ticks in 2D as well as 3D. |
| Clear Table | Remove all balls, including the second planning cue ball; keep table calibration, spin and speed settings. Preserve the existing action-undo path. Disable during shot execution. |
| Window close | Consistent red close control across experiences using the existing native close APIs. Browser restrictions still apply. |

## Organized task menu — November 16, 2026

The retractable Tools panel uses seven expandable task sections in a stable order:

Opening a main task collapses the previous main task, while nested disclosure state and all shot/settings values remain intact. Users can close the active task or the whole drawer.

| Section | Contents |
| --- | --- |
| Shot | Opens by default when Tools opens. Retain the original shot controls, cue contact, planning, Jump/Massé and history directly in the section. |
| Live Shot | A separate main tab immediately below Shot; retain interactive aiming while its readouts stay visible. |
| Table & Balls | Equal-level disclosures for full racks, layout setup, single-ball placement and markers/targets. |
| Table Notes | Write/annotate tools directly inside the tab, with no redundant wrapper subsection. |
| Capture | Photo, Video and Audio disclosures; nested shot/session/camera recording and narration. Preserve recorder capability checks. |
| Saved | Distinct collapsible Saved Ball Layouts, Saved Files, and Import/Export/Auto-save sections. |
| Features & Options | Table, Cue, Aiming, Practice, Calibration and Advanced Physics are peer disclosures. Shot owns the single Jump/Massé switch; the redundant advanced checkbox is removed. |

Main task headers retain their compact single-line blue treatment with text only. Subsections retain deeper blue headers, restrained line icons and colored collection edges. Standard actions have consistent 44px minimum height. Expand the Billiards Trainer title and restore the AI Edition subtitle. Use short labels and readable optional reference text.

The drawer no longer has a fullscreen dismiss layer that intercepts aiming. At widths of 1000px and above it docks beside the workspace, shifting right-side controls clear of the drawer. At smaller widths preserve access to the left aim rail. Keep Live Shot Results updating while the menu stays open.

Keep the direct Import, View, Motion and Follow View menus and the established shot/camera/tray controls outside this reorganization. Zen retains its minimal presentation. Preserve all control IDs, state, existing file formats and native APIs.

Snapshot bindings use stable IDs independently of the drawing container. Nested section disclosure styles and programmatic reveals must open the correct ancestors. Keep Live Stats sizing/observers and explicit Guide topics on the renamed existing headings. New task headings do not imply new narration recordings.

## Continuing menu design requirements

Keep the entire right panel retractable. Organize its contents by task, using the same disclosure styles across setup, aiming, shot details, drawing/recording, saved work, and settings. Aiming owns Kick, Bank and Compass; retain that assignment when tabs are renamed or regrouped. Preserve access to Live Stats and Physics/Calibration.

Use short labels with clear selected states; do not replace unfamiliar operations with unexplained icons. Keep controls for the active task visible and expose optional settings on demand. Preserve the direct 3D camera workflow and the fixed mode-switch position throughout later simplification.

## Verification expectations

Check desktop, tablet, narrow landscape and portrait layouts in both 2D and 3D. Verify control hit targets and overlaps, mode-switch position, Shot 2 bindings, clear/undo/re-add, drawer aiming tools, and tray/Shoot separation. Do not treat browser checks as physical Android/Windows installer verification.

Verify the rendered compass center against its projected handles after opening and closing the tray. Reallocate the 3D cloth texture when its dimensions change; a smaller upload into an older allocation shifts guides and retains stale edge pixels. Clear Table must restore the same empty rendered table without leftover cue or guide lines.


### Motion, Import and the photo analyzer
- In both Trainer modes, Motion follows View. Its four named choices share the recorder's playback rate; ball speed stays on the right rail. A check marks the active choice.
- Import opens one vertical stack: Real Table / Image Import, Camera Import, Layouts. Both image entry points return to the same alignment, detection, review and apply flow.
- Keep Choose Image, Analyze Balls, Add Missed Ball and Close in sight. Instructions have their own line. Secondary tools start expanded on larger displays; a touch control reveals them on phones.
- In wide 3D layouts the speed rail ends above Shoot whether the tray is open or closed. Narrow layouts reserve clearance for the wrapped camera row.

## Polish revision — November 16, 2026

Preserve the full main labels and larger Billiards Trainer / AI Edition branding. Main headers are36px tall with no icons or tiny description labels. Restore the original Shot arrangement rather than imposing new subfolders. Table Notes exposes its sole annotation group directly. App Info keeps its native dialog action but uses the subsection size/color at the bottom of Features & Options. Leave24px above Calibration to distinguish calibration/advanced physics from ordinary features.

Use uniform circular top controls for experience,2D/3D, the picker, Undo, Redo and Tools. Keep Undo/Redo paired and add12px extra separation before Tools, with a clearer outline. The picker expands downward as a semicircle containing Import, View, Motion and Follow View circles; each circle opens its existing menu directly below that circle. Preserve IDs, keyboard access, outside dismissal and existing bindings.

Use the existing3D spherical ball textures for both the2D table and shared tray, including all16 identities, stripes and number panels. Shared artwork prevents the modes drifting apart. Preserve bright colors while adding spherical shading and broad reflected highlights;3D uses the same textures with a polished resin material. Remove dotted pocketed-ball outlines and the CB1 caption from the central cue-tip disk. Keep ball placement, drag/undo, training-ball markings and physics unchanged. Zen remains outside this visual revision.

## Picker and header refinement — November 16, 2026

The picker center uses a four-square icon and retains the same screen position open or closed. Leave room between it and 2D/3D for Import to appear beside 2D/3D. The open fan has its flat edge at the screen top, with its four equal circles spaced at60-degree intervals on one radius. Keep the center above the fan and reachable. Narrow displays use a second row for Undo/Redo/Tools while closed and hide that row during the fan interaction; Tools returns to the first row while the side panel is open. Hide Undo and Redo when the side panel opens, as shown in the annotated reference. Keep a green ring on 2D/3D and blue on Tools.

Branding starts at the top of the side panel. Get Started, Guide, Explorer and Updates share one compact row, with12px between Explorer and Updates. The main metric tab is Live Shot. Shot remains the default every time Tools opens. App Info closes on an outside tap while keeping inside text selection, the Close button and Escape intact. Shoot widens6px to leave4px between its edge and the spin/tray column.

Shot launch-speed controls now allow7.0 m/s instead of6.0, including both shots, side rails, numeric inputs, step buttons and matching power/stroke reference ranges. Keep kick/bank search limits, engine step size, friction and restitution unchanged. Real-physics tests cover6.0,6.5 and7.0 m/s head-on/cut/cushion/rack cases, checking finite output, no energy gain, no stacked balls and identical preview/execution. This small cap extension does not claim validation of full professional break speeds (about11–13 m/s).
