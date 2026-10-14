# Completed audio integration

The development Guide includes 365 completed Chase recordings. Every recording has a selectable lesson, transcript, and local MP3 path. The original recordings remain available.

- Explorer uses dedicated control narration on the table and Analyze pages, including AI Ready, Table Setup, Image / Camera, individual saved-image actions, shot readouts, and C/P power meters.
- Explorer provides the control reference. Its recordings remain registered without a Controls tab in the lesson player.
- Drills includes the ten new practice drills under Cue Ball Control, Positional Patterns, Rail Navigation, and Kicking Systems, alongside the existing practice lessons.
- Resources includes five spoken Zero-X recommendations. More also displays the existing Dr. Dave, Niels Feijen, Cue Craft Pro and Sharivari links associated with practice lessons.
- Read shows the selected recording's narration. More shows drill positions and target markers.
- Analyze Get Started uses the new dedicated instruction recordings. Existing first-session lessons and stop-at-end behavior remain available.
- The updated service worker caches the audio catalog, Guide scripts, and all local recordings for offline use after its initial download completes.

Coordinates in the ten new drills use the head-end viewpoint and normalized diamonds. Exact tables and ball-size adjustment formulas are in Practice-Drills-and-Audio-Scripts.md and Practice-Drill-Layouts.json. No automatic table setup or new physics is introduced.

## Validation

Headless Chromium tested real MP3 playback advancing, Read/More content, all four drill groups, five Zero-X recommendations and links, dedicated Analyze mappings, Explorer selection, all 360 recording fetches, and offline reload with audio retrieval. No page errors occurred. Existing Guide skip and Get Started autoplay tests pass, including stopping at the last lesson. JavaScript syntax and git whitespace checks pass.

This change updates the development branch's web app. Previously downloaded Windows/Android packages retain their bundled version until rebuilt.

## Features and Options mapping update

Each of the nine Features and Options items has a dedicated recording. Checkbox inputs, their labels, and their surrounding rows now use the same topic. Browser tests exercise both the checkbox and label for all nine items, verify the corresponding MP3 actually plays, and verify the checkbox value remains unchanged in Explorer. The Resources tab shows the two official Zero-X links for each recommendation; the redundant global channel link has been removed.

## Category welcomes and resource topics

Fundamentals, Physics and Tools, Drills, Exercises, and Resources each play a short Chase welcome inviting selection from the dropdown. The welcomes do not replace lessons or appear as resource destinations. A manual Resource selection plays its MP3 and opens the matching verified YouTube destination in a new tab. More displays only its resource links. Topic links are embedded on the official Zero-X lessons page and their titles/authorship were verified with YouTube oEmbed. Details and narration are in Category-Welcomes-and-Resources.md.
