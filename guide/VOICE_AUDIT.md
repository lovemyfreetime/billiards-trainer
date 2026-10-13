# Chase voice and playback audit — October 13, 2026

## Findings

- Screened all 613 local MP3s, covering the original library and the 360 newly integrated recordings.
- 214 files have direct production records with Speechify voice ID `chase`. These provide the reference voice; 73 clips at least eight seconds long contribute to the comparison profile.
- The remaining files have speaker-similarity scores of 0.855 to 0.994. None fell below the review threshold of 0.854.
- A separate female synthesized voice used as a negative control scored 0.608. It was created only for testing and is not part of the app.
- The reported robotic Full Racks voice was caused by a retained device-speech override. Three Full Rack/random-count topics and the legacy AI explanation could select system speech. The app now contains no browser speech synthesis playback path.

Speaker comparison is a consistency screen, not proof of a commercial voice name and not a claim that every file was listened to manually. Direct API provenance identifies Chase for the reference recordings; the older recordings are acoustically consistent with those references. Full clips were decoded for the comparison. Per-file checksums and scores are in VOICE_AUDIT.json.

## Playback changes

Guide opens with automatic next-lesson playback off. Get Started opens with it on. Selecting a different category or lesson starts the selected audio immediately on both pages. The autoplay button still lets the player change the current setting.

## Speed-slider quality

The previous Shot 1 and Shot 2 speed-slider recordings were 64 kbps exports. Their decoded samples were not clipped; peaks measured -2.84 and -3.60 dBFS. Shot 1's measured true peak was -2.8 dBFS, also below clipping. These measurements do not rule out encoding artifacts or playback hardware distortion.

Both clips were freshly generated with `voice_id=chase`, Simba 3.2, SSML +30%, and MP3 output at 128 kbps. The new files pass decode checks and have no samples above full scale. Default player volume is 80% (about 1.9 dB below maximum), providing output headroom. Versioned URLs bypass cached copies of the older speed recordings. The files have been replaced in the existing Google Drive folder.

Actual playback on the user's speakers/headphones has not been measured. If the same sound persists after reloading this update, comparison on a second playback device can distinguish a device-specific effect from the recording.

## Verification

Browser regression checks cover Guide/Get Started autoplay separation, automatic menu playback, actual MP3 decoding, Full Racks using its MP3 without system speech, rapid lesson changes, one active player, 80% player volume, and offline reload. Guide skip and stop-at-end tests also pass.

## Comparison method

The offline Resemblyzer speaker encoder compares recordings against logged Chase reference files. The screening threshold is the reference set's first percentile minus a 0.06 margin. No recordings fell below it. Model source: https://github.com/resemble-ai/Resemblyzer
