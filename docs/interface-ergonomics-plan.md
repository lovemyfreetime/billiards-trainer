# Interface ergonomics plan

## Approved layout decisions — November 13, 2026

These decisions extend the existing cross-mode control review and supersede the first-pass Plan toolbar group.

| Control or task | Permanent home and behavior |
| --- | --- |
| Experience switching | Upper-left in Trainer 2D/3D, Play and Companion. Companion Back to Play follows it. Zen keeps its existing bottom-toolbar position. |
| 2D / 3D switching | A direct button immediately beside the experience icon, at the same coordinates in both Trainer views. Never put it inside View or on the lower camera row. |
| Kick, Bank, Compass | Tools → Features & Options → Aiming. Keep related compass adjustments and aiming options together. No Plan button on the main toolbar. Starting Kick or Bank closes the drawer so the user can select the table route. |
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

## Next menu redesign

Keep the entire right panel retractable. Organize its contents by task, using the same disclosure styles across setup, aiming, shot details, drawing/recording, saved work, and settings. Aiming owns Kick, Bank and Compass; retain that assignment when tabs are renamed or regrouped. Preserve access to Live Stats and Physics/Calibration.

Use short labels with clear selected states; do not replace unfamiliar operations with unexplained icons. Keep controls for the active task visible and expose optional settings on demand. Preserve the direct 3D camera workflow and the fixed mode-switch position throughout later simplification.

## Verification expectations

Check desktop, tablet, narrow landscape and portrait layouts in both 2D and 3D. Verify control hit targets and overlaps, mode-switch position, Shot 2 bindings, clear/undo/re-add, drawer aiming tools, and tray/Shoot separation. Do not treat browser checks as physical Android/Windows installer verification.

Verify the rendered compass center against its projected handles after opening and closing the tray. Reallocate the 3D cloth texture when its dimensions change; a smaller upload into an older allocation shifts guides and retains stale edge pixels. Clear Table must restore the same empty rendered table without leftover cue or guide lines.
