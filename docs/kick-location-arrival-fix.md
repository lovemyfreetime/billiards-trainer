# Cue-ball kick arrival

A cue-selected kick ends at the marked point. Contact with another ball at or after that arrival must not invalidate the route. The assessor now checks only the pre-contact path and includes the exact contact position. Collisions before arrival or before the required rail sequence still block the route; full simulation scratch checks remain active.

Verified the reported right/top screenshot-like route with both object and cue selection. The cue route solves in about 5.6 seconds locally. Added an automated browser regression and unit checks for collisions before, at, and after arrival. Existing real-click/touch tests pass for one and two rails in 2D, three rails in desktop 3D, and four rails in phone 3D, with target errors of 0–1 mm. Offline and native content inventories regenerated together.
