# Rolling reference and practice counter

The teaching compass enables a short, dotted `≈30°` line from each visible shot's simulated ghost-ball center. The reference is three-quarters of a diamond long, clipped at the cushions. It is a teaching approximation, not a replacement for the simulated trajectory.

The existing solver already integrates cue-ball angular velocity, sliding-to-rolling cloth friction, and normal/tangential ball collision impulses. The overlay samples that solver's pre/post-impact state without changing any velocities or recalculating the shot during drawing. It appears only for a stationary target and roughly quarter-to-three-quarter ball hits (14.48°–48.59°), near-natural roll at impact, little side spin, a near-level cue, and a short enough sliding-to-rolling transition after collision. The estimated eventual rolling exit must agree with the reference (23°–37°). These are deliberately conservative display tolerances. A distant center-ball shot can qualify once cloth friction has established roll; a close center-ball shot at the same stroke speed can remain stun and not qualify.

Physics reference: [Dr. Dave — 30° rule](https://drdavepoolinfo.com/faq/30-90-rules/30-degree-rule/). Fuller/thinner hits are outside the rule's useful range. Firm rolling shots initially travel near the tangent before curving toward the natural direction, which is why the small reference is suppressed if that transition dominates its length.

Features & Options contains **Drill and exercise counter**, unchecked in the default setup. Enabling it shows a circular `#` toggle and a square three-digit count with minus/plus on the bottom rail. The toggle hides/reopens the number without resetting it. Manual counts stop at 000 and 999, persist locally, and are independent of shot state, Reset and Undo. No shot automatically changes the number. Reload keeps the saved feature preference but collapses the display.

Verification: `tests/practice-tools.test.cjs` checks geometry and exclusions; `tests/practice-tools.browser.cjs` checks actual solver contacts on both cut sides, cue settings, counter controls/persistence, and phone/desktop placement.
