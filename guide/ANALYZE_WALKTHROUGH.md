# Analyze image walkthrough

Walkthrough is the guided entry point on the Analyze blue header, followed by the AI status button. The redundant Analyze Get Started launcher has been removed. AI retains its detector toggle/retry behavior. The main Trainer Get Started launcher remains available.

A compact instruction strip highlights the relevant controls and plays a dedicated Chase recording for each step. Back revisits earlier steps, Next confirms choices, Replay starts the current recording at zero, Audio On/Off changes narration, and Stop ends the walkthrough. It does not block other controls.

The flow waits for real image loading, a usable four-corner calibration, explicit orientation confirmation, rack selection or confirmation, completed analysis, reviewed unique identities, optional saves, and successful application. Choosing a new image restarts loading. Invalid or reset corners return to alignment. Changed or duplicate identities return to review. Choosing a saved table file skips image calibration and detection. Starting stops Get Started/Explorer narration; switching to either guide mode stops the walkthrough. Closing Analyze cancels it. Completion narration plays after the successful transfer closes Analyze.

Save Image uses the device image archive; Download copies the image; Save Table File exports the reviewed layout. Apply + Save creates a named saved Trainer layout. Image saves are optional, and Next waits while an image save is busy. The walkthrough never triggers a save or applies a layout itself.

The device file picker is outside the app: the walkthrough explains Select/Open and waits for the app's loaded state, without guessing which filename was chosen. Physical head/foot orientation and whether a ball identity is correct still require user confirmation. The rack menu advances on a changed selection, or Next keeps the current choice.

Recovery prompts offer Try Another Image for loading failures; Adjust Corners and Analyze Again after failed analysis; and Add Missed Ball when a completed analysis finds no balls. Each prompt has a dedicated Chase recording. Retrying waits for a new successful analysis, and manual placement returns to ordinary identity review.

Cue / Shaft Preset is in Advanced Physics / Calibration. Standard uses the existing 20.151 ball-to-end-mass ratio; Low-deflection uses the already validated 29.158 ratio. Custom reveals the numerical adjustment. Both shots share the setting; it is retained in saved settings and session files. The current Standard default and ball detection algorithms are unchanged.
