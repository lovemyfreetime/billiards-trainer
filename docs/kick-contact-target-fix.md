# Kick target on an object ball — contact goal correction

A screenshot showed a right → top → bottom kick timing out with the target marker on/near the 1 ball. The reconstructed layout uses an 80 × 40 inch table, cue at normalized (.771,.852), object ball at (.128,.952) and target at (.128,.930). These are approximate screenshot positions, not an exported user session.

The old object-ball kick evaluator always required the object ball to travel to the destination after contact. When that destination is already on the object ball, it can reject a perfectly valid safety escape. Kick now recognizes a target within 2.2 ball radii of the selected object-ball center as a **contact goal**. It verifies first contact with that ball after exactly the selected rail order. A separate destination retains the existing object-ball destination/pocket goal, and Bank behavior is unchanged.

Contact-goal search seeds toward the target ball rather than constructing a pocketing ghost ball from its nearly identical starting/destination coordinates. Preliminary simulation can stop on first contact. Accepted candidates still run the complete scene through the ordinary simulator, including all other balls and subsequent cue-ball scratches. Current live speed/follow/English are not used as the recommended stroke; the existing independent practical candidate search remains in force.

Cue-ball-only point goals remain available. If the selected point lies inside another ball's exclusion area (center distance under 1.65 ball radii), Calculate prompts for that object ball or a clear point immediately. Tapping the object ball after this prompt completes the previously requested calculation. This avoids wasting the entire search on a physically occupied cue-center destination.

## Verification

- Reconstructed screenshot previously returned no practical shot in approximately 18 seconds locally. The corrected object-contact case solves in approximately 2–3 seconds including UI/application checks on desktop, and approximately 9 seconds with 4× CPU throttling in the phone 3D test.
- Real target/rail/ball taps choose right → top → bottom. Applying the calculated setup makes the ordinary shot predictor hit ball 1 after those three rails, without a cue-ball scratch. The fixture uses 2.5 m/s, center ball, while the initial live controls are deliberately 2.86 m/s, +6% follow and −54% English.
- Browser regression verifies the occupied-point prompt and object-ball continuation, and both 2D desktop and 3D phone.
- Unit coverage separates contact goals, empty-point goals, separate object destinations, Bank behavior, wrong-ball contact, rail order and scratches.
- Existing cue-only 1–4 rail and object-bank/kick routing regressions are retained. No automatic recalculation or increased time limit was introduced.

Tests: `tests/bank-kick-contact.browser.cjs`, `tests/bank-kick-location.test.cjs`, `tests/bank-kick-location.browser.cjs`, `tests/bank-kick-selection.test.cjs`, `tests/bank-kick-candidates.test.cjs`, `tests/bank-kick-routing.browser.cjs`.
