# Cue-ball-only kick routes

Kick supports either an object-ball contact or a destination point without an object ball. In 2D or 3D:

1. Tap Kick, then the target location on the cloth.
2. Tap one to four cushions in travel order.
3. Tap the cue ball to select a location route, or an object ball to retain the existing contact-shot flow.
4. Tap Calculate, then Use setup to apply the recommended aim, speed and spin.

Calculate can also be pressed before selecting the ball. The next ball tap completes the selection and begins the requested calculation. Tapping the cue ball selects the active cue-ball position, including Shot 2 when active. Bank continues to require an object ball.

A location route must pass through the destination after exactly the selected rail sequence and before the next rail. It does not promise the cue ball stops at that point. The complete physics simulation verifies accepted routes, including all other balls and cue-ball scratches; an unexpected object-ball contact invalidates a location route. Calculations remain explicit, cancellable and time-bounded. Existing practical speed and tip-offset limits remain in force.

## Validation

- Selection tests cover cue-ball taps before and after Calculate, object-ball selection and Bank's object-ball requirement.
- Acceptance tests reject wrong rail order, reaching the target before the required rails, unexpected ball contact and detect cue-ball scratches.
- Browser tests use real target/rail/cue taps for 1–2 rails in 2D and 3–4 rails in 3D, including phone touch. Applying the setup and running the ordinary shot predictor reaches the target within 1 mm in the controlled fixtures, without a collision or scratch. This is a software consistency check, not a claim of real-table accuracy.
- Existing Bank/Kick routing regressions pass for mouse and phone touch, object-ball kicks, executed banks and 1–4 rail routes.
- Browser and native content inventories were rebuilt and checked. No new native API or protocol is required.

Run `node tests/bank-kick-selection.test.cjs`, `node tests/bank-kick-location.test.cjs`, `node tests/bank-kick-candidates.test.cjs`, and the Playwright checks `tests/bank-kick-location.browser.cjs` / `tests/bank-kick-routing.browser.cjs`.
