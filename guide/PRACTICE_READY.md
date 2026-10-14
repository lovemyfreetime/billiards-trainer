# Repeatable Guide practice

The table Guide’s 168 topic texts were reviewed for ball-setup instructions. 85 topic IDs now offer shortcuts to 29 portable `.billiards.json` starters. The ten coordinate drills match the existing narrated diamond positions, including marker shapes, colors, and sizes. Generic technique lessons use clearly labeled Trainer starters. Creator-referenced pattern, progression, and Corner-5 lessons retain links to the creator’s exact demonstration and label the supplied files as Trainer adaptations.

- Read and More both contain load/reset and download shortcuts for applicable lessons.
- Balls loads the first starter; repeated clicks restore the same ball positions and aiming reference.
- Multiple-stage exercises expose every relevant starter, including direct/bank/kick alternatives and 8-ball/9-ball rack options.
- Loading a starter preserves the current speed, spin, and physics settings, clears shot history, and returns to Shot 1. This permits repeatable comparisons while changing one setting.
- Topic resource links appear directly in Read and More. External videos require internet; starter files are available offline.

The player now reconciles controls in place. During automatic advance the native lesson selector and its options remain attached, and the browsing selection stays untouched while focused. A separate current-lesson label updates immediately. Read/More content updates in the same mounted reading area, preserving its scroll position. Intentional category/skill-level changes refresh the available options.

## Audio corrections

The ten recordings from Stop Shot Calibration onward had substantially faster narration than Target landing precision: about 225–270 versus 174 words/minute. `AUDIO_PACING.json` records durations and pitch-preserving tempo factors for each correction. The original Chase recordings were retained and paced to the reference; word-rate measurements are an objective approximation of cadence, not a claim that every sentence has identical rhythm.

Zero-X defense and recovery was regenerated in Chase with an explicit `recreate` → `ree create` SSML pronunciation alias. Its approximate previous duration and short resource lead-in were retained. Changed URLs use a new cache version.

`SETUP_AUDIT.json` contains each reviewed topic’s narration, decision, and setup file paths. `scripts/build-guide-layouts.py` reproduces the layouts and topic bindings. Layout coordinates use a 100 × 50-inch playing surface; portable files map head-to-foot coordinates to the Trainer’s horizontal axis.
