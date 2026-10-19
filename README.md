# Billiards Trainer

A visual billiards training tool for practicing shots, banks, kicks, English, speed, and diamond systems — built for players, instructors, and projected table training.

## Live app

https://lovemyfreetime.github.io/billiards-trainer/

The accepted October 14, 2026 release includes the Chase audio guides, action-aware Analyze walkthrough and recovery prompts, saved practice layouts, portrait/landscape image calibration, and Advanced cue/shaft presets.

Play is available at https://lovemyfreetime.github.io/billiards-trainer/play.html and Zen at https://lovemyfreetime.github.io/billiards-trainer/?zen=1. Use Change experience to move between Trainer, Play, and Zen. Play provides 20 real-table scorekeepers.

## Development and release history

`main` publishes the live app through GitHub Pages. `development/interactive-guide` remains available for future development, with its separate preview at https://billiards-trainer-guide-dev.vercel.app.

`release/2026-10-14` preserves the accepted development snapshot. `archive/production-before-2026-10-14` preserves the prior production version for rollback.

## Validation

The release was checked with the automated tests and browser verification of Guide audio, the Analyze walkthrough, cue preset persistence, recovery actions, saved layouts, and offline use.

## Local Play tables

The Windows app includes an offline local host. Open **Billiards Play - Local Host**, choose a game, then use **Local table** to invite phones by QR. The host approves seats and records results; players receive only their own private view and can enable foreground turn alerts. See [local-host/README.md](local-host/README.md) for setup, network requirements, privacy boundaries, and tests.
