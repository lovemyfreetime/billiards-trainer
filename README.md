# Billiards Trainer

A visual billiards training tool for practicing shots, banks, kicks, English, speed, and diamond systems — built for players, instructors, and projected table training.

## Live app

https://lovemyfreetime.github.io/billiards-trainer/

The accepted October 14, 2026 release includes the Chase audio guides, action-aware Analyze walkthrough and recovery prompts, saved practice layouts, portrait/landscape image calibration, and Advanced cue/shaft presets.

Play is available at https://lovemyfreetime.github.io/billiards-trainer/play.html and Zen at https://lovemyfreetime.github.io/billiards-trainer/?zen=1. Use Change experience to move between Trainer, Play, and Zen. Play provides 20 real-table scorekeepers.

## Development and release history

`main` in `lovemyfreetime/billiards-trainer` is the active app and publishes directly through GitHub Pages. As requested October 19, 2026, implement, verify, and publish requested changes here by default. Private repositories, account-gated previews, and separate ChatGPT Sites previews are not the working or viewing workflow unless explicitly requested. Development and private repository copies may remain as history; they are not the release target.

`release/2026-10-14` preserves the accepted development snapshot. `archive/production-before-2026-10-14` preserves the prior production version for rollback.

## Validation

The release was checked with the automated tests and browser verification of Guide audio, the Analyze walkthrough, cue preset persistence, recovery actions, saved layouts, and offline use.

## Local Play tables

The Windows app includes an offline local host. Open **Billiards Play - Local Host**, choose a game, then use **Local table** to invite phones by QR. The host approves seats and records results; players receive only their own private view and can enable foreground turn alerts. See [local-host/README.md](local-host/README.md) for setup, network requirements, privacy boundaries, and tests.

## Tournament Night

Open Play → Tournament Night, or https://lovemyfreetime.github.io/billiards-trainer/tournament.html. Supports 2–256 singles or fixed doubles entries, 1–64 tables, elimination brackets, groups into playoffs, chip events, results, undo, TV display, templates, and backups. TV updates on the same browser profile; cross-device links are spectator snapshots. See [Tournament Night](docs/TOURNAMENT_NIGHT.md).
