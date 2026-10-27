# Narration source repair — 2026-10-21

This release replaces 481 active Main/Get Started narration files: 462 fresh Speechify Chase exports and 19 fresh originals approved by Jeff in the listening review. The 169 other MP3 files remain byte-for-byte unchanged, including every `analyze-` file.

Fresh recordings use Chase, Simba 3.2, the Speech endpoint, MP3 output, and native generation prosody +30%, matching the approved fresh recording settings. Playback remains 1.0. No exported audio was time-stretched, pitch-shifted, normalized, transcoded, or otherwise processed afterward. Native speaking pace is set during speech synthesis, rather than by stretching a finished recording.

`replacement-queue.json` preserves all 462 scripts and the rejected file hashes. `approved-replacements.json` records the 19 approved originals. `narration-release.json` pins all 650 MP3s, their source/review status, and the rejected hashes. Fresh exports remain marked **listening review pending**: a valid MP3 and matching hash do not prove subjective sound quality.

`scripts/verify-narration-release.py` rejects changed pinned bytes, restored rejected bytes, or an active Main/Get Started clip missing provenance. The shared Guide release gate runs this check before comparing web, Windows, and Android bundle bytes. Future intentional narration changes must update provenance after source and listening review; do not simply replace the hash to silence a failure.

The former `guide/AUDIO_PACING.json` is retained only as a historical record of the superseded time-stretched drill files. Do not run its tempo factors on new exports.

## Experience descriptions — 2026-10-27

Zen, Trainer, and Play on the welcome page now use three original Chase MP3 downloads from Speechify Reader. `experience-scripts.json` records the exact displayed scripts, source document URLs, durations, and SHA-256 hashes. The Reader export does not expose its synthesis model; these files are not labeled as Simba 3.2 exports. Their original download bytes are unchanged, and the source MP3s remain at their exported pace. App playback uses 1.3x for these three experience descriptions following Jeff’s pacing correction. Listening review remains pending. These recordings are included in the web and native content inventories; no device speech fallback is used for these descriptions.
