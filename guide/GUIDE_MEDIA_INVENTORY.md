# Guide media and layout inventory

Duration-based screening only. Text is the declared catalog transcript; actual speech/transcript match, natural pauses, and perceived pacing require listening. This audit never changes MP3s. NARRATION_RECORDINGS.json records fresh Speechify replacements separately.

487 Main entries and 162 Analyze entries inventoried. All 141 selectable Main items now have different physical geometry. 141 have audio; 0 need a first recording.

| Category | Items | With audio | Unique layouts |
|---|---:|---:|---:|
| start | 8 | 8 | 8 |
| fundamentals | 24 | 24 | 24 |
| physics | 33 | 33 | 33 |
| drills | 33 | 33 | 33 |
| exercises | 37 | 37 | 37 |
| more | 6 | 6 | 6 |

## Coverage and behavior

Each category introduction and lesson automatically loads its prepared scene before playback. Explorer control explanations preserve the current table. Get Started retains its existing responsive shots and Undo history. Original coordinate drill positions are unchanged.

Autoplay offers a ten-second practice window after narration. The first table tap pauses playback and hands control to the player without changing aim. Next Lesson resumes the sequence. A written lesson without a recording stops for practice; it does not silently skip ahead.

The retained pre-recording reference median is 211.1 catalog words per minute. The review band is ±15% (179.4–242.8); 12 selectable items fall outside it. These are listening candidates, not verified audio defects.

## Missing recordings

- A repeatable pre-shot routine (`fundamentals-pre-shot-routine`)
- Comfortable stance and cue clearance (`fundamentals-balanced-stance`)
- A stable bridge (`fundamentals-stable-bridge`)
- Relaxed grip and straight delivery (`fundamentals-grip-and-delivery`)
- Reach, rail bridges, and cue access (`fundamentals-cue-access`)

## Layout design and remaining review

Each scene contains an objective and a reason for the arrangement in `topic-scenes.json`. Unique geometry includes the ball centers and target shapes, not names. Native loader, bounds, overlap, and uniqueness checks are automated. A distinct practice arrangement is not a guaranteed solution or a claim that the physical stroke is correct. Cushion, jump, and massé examples require observation and adjustment; the simulator does not assess stance or bridge mechanics.

`NARRATION_REFINEMENT_QUEUE.json` contains exact scripts, existing audio paths, duration measurements, Chase settings, and SSML for every candidate. The authorized batch of 34 topics has fresh Speechify Chase recordings. See NARRATION_RECORDINGS.json for hashes and before/after measurements. Listening review remains open.

## Earlier pacing adjustment

The existing `AUDIO_PACING.json` documents pitch-preserving slowing of ten coordinate drills to approximately 174 WPM. Their original measures were about 225–270 WPM. This is a concrete reason to listen to those clips first, while retaining pauses needed for coordinates. Those ten clips have now been replaced with fresh Chase synthesis; the old transforms are retained as history only.

## Individual selectable items

| Category | Topic | Audio | Catalog WPM | Unique layout |
|---|---|---|---:|---|
| physics | Table markers | present | 221.4 | `./guide/layouts/topics/table-markers-quick.billiards.json` |
| physics | Physics and calibration overview | present | 175.6 | `./guide/layouts/topics/physics-calibration-overview-quick.billiards.json` |
| fundamentals | Banks and kicks | present | 233.3 | `./guide/layouts/topics/bank-kick-overview-quick.billiards.json` |
| physics | Fine speed adjustment | present | 185.4 | `./guide/layouts/topics/shot-speed-fine-adjustment-quick.billiards.json` |
| physics | Jump height | present | 220.2 | `./guide/layouts/topics/jump-height-quick.billiards.json` |
| physics | Obstacle clearance | present | 220.8 | `./guide/layouts/topics/jump-obstacle-clearance-quick.billiards.json` |
| physics | Landing point | present | 204.4 | `./guide/layouts/topics/jump-landing-point-quick.billiards.json` |
| physics | Massé shot controls | present | 197.8 | `./guide/layouts/topics/masse-shot-controls-quick.billiards.json` |
| exercises | Power meter | present | 229.0 | `./guide/layouts/topics/exercise-cue-pocket-threshold.billiards.json` |
| physics | Cue elevation for advanced shots | present | 212.3 | `./guide/layouts/topics/jump-masse-elevation-technique-advanced.billiards.json` |
| fundamentals | Contact point | present | 212.1 | `./guide/layouts/topics/contact-point-geometry-quick.billiards.json` |
| fundamentals | Cut angle | present | 216.7 | `./guide/layouts/topics/cut-angle-geometry-quick.billiards.json` |
| fundamentals | Ball overlap | present | 214.8 | `./guide/layouts/topics/ball-overlap-quick.billiards.json` |
| fundamentals | Ghost-ball position | present | 200.8 | `./guide/layouts/topics/ghost-ball-geometry-quick.billiards.json` |
| physics | Collision line | present | 213.7 | `./guide/layouts/topics/collision-line-quick.billiards.json` |
| physics | The tangent line | present | 234.5 | `./guide/layouts/topics/tangent-line-geometry-quick.billiards.json` |
| fundamentals | The ninety-degree rule | present | 202.6 | `./guide/layouts/topics/ninety-degree-rule-quick.billiards.json` |
| fundamentals | The thirty-degree rule | present | 194.2 | `./guide/layouts/topics/thirty-degree-rule-quick.billiards.json` |
| fundamentals | Diamond references | present | 205.0 | `./guide/layouts/topics/diamond-system-geometry-quick.billiards.json` |
| fundamentals | Mirror aiming | present | 220.1 | `./guide/layouts/topics/mirror-aiming-quick.billiards.json` |
| fundamentals | Choosing the rail contact point | present | 215.4 | `./guide/layouts/topics/rail-contact-point-quick.billiards.json` |
| fundamentals | English off a cushion | present | 224.4 | `./guide/layouts/topics/rail-english-geometry-quick.billiards.json` |
| fundamentals | Multiple-rail routes | present | 191.5 | `./guide/layouts/topics/multiple-rail-routes-quick.billiards.json` |
| exercises | Geometry practice challenge | present | 220.9 | `./guide/layouts/topics/exercise-geometry-route-comparison.billiards.json` |
| physics | Compass tool — introduction | present | 221.2 | `./guide/layouts/topics/compass-tool-intro-quick.billiards.json` |
| drills | Creating a simple practice layout | present | 202.2 | `./guide/layouts/topics/practice-layout-quick.billiards.json` |
| exercises | Exercise: change one ball | present | 211.3 | `./guide/layouts/topics/exercise-change-one-ball.billiards.json` |
| exercises | Exercise: build and review a rack | present | 215.1 | `./guide/layouts/topics/exercise-layout-runout-review.billiards.json` |
| exercises | — save, change, and recall | present | 225.5 | `./guide/layouts/topics/exercise-save-recall-layout.billiards.json` |
| exercises | Table Speed | present | 190.8 | `./guide/layouts/topics/exercise-table-speed.billiards.json` |
| physics | What calibration can and cannot do | present | 186.2 | `./guide/layouts/topics/calibration-expectations-advanced.billiards.json` |
| fundamentals | Natural roll | present | 228.9 | `./guide/layouts/topics/natural-roll-quick.billiards.json` |
| physics | Shot speed and distance | present | 204.1 | `./guide/layouts/topics/physics-shot-speed-quick.billiards.json` |
| physics | Cue ball collisions | present | 206.5 | `./guide/layouts/topics/ball-collision-quick.billiards.json` |
| physics | Follow through contact | present | 214.5 | `./guide/layouts/topics/physics-follow-quick.billiards.json` |
| physics | Draw through contact | present | 191.1 | `./guide/layouts/topics/physics-draw-quick.billiards.json` |
| physics | Stop and stun | present | 227.8 | `./guide/layouts/topics/physics-stun-quick.billiards.json` |
| physics | Side spin or English | present | 206.4 | `./guide/layouts/topics/physics-english-quick.billiards.json` |
| physics | Spin transfer | present | 203.5 | `./guide/layouts/topics/spin-transfer-advanced.billiards.json` |
| fundamentals | Swerve and cloth interaction | present | 183.8 | `./guide/layouts/topics/cue-ball-swerve-advanced.billiards.json` |
| physics | Rail speed loss | present | 153.7 | `./guide/layouts/topics/rail-speed-loss-advanced.billiards.json` |
| physics | Jump trajectory | present | 213.2 | `./guide/layouts/topics/jump-trajectory-quick.billiards.json` |
| physics | Clearing an obstacle | present | 240.0 | `./guide/layouts/topics/physics-jump-clearance-quick.billiards.json` |
| physics | Landing position | present | 226.7 | `./guide/layouts/topics/physics-jump-landing-quick.billiards.json` |
| physics | Understanding jump trajectory | present | 191.0 | `./guide/layouts/topics/jump-model-limitations-advanced.billiards.json` |
| physics | Massé shot | present | 168.5 | `./guide/layouts/topics/masse-physics-quick.billiards.json` |
| physics | Massé versus jump | present | 220.7 | `./guide/layouts/topics/masse-versus-jump-advanced.billiards.json` |
| physics | Table dimensions and ball geometry | present | 230.3 | `./guide/layouts/topics/table-geometry-calibration-quick.billiards.json` |
| physics | Calibrating against a real table | present | 199.1 | `./guide/layouts/topics/real-table-calibration-quick.billiards.json` |
| physics | Change one variable at a time | present | 183.2 | `./guide/layouts/topics/one-variable-calibration-quick.billiards.json` |
| physics | Save your calibration observations | present | 196.4 | `./guide/layouts/topics/calibration-notes-quick.billiards.json` |
| exercises | table speed | present | 190.8 | `./guide/layouts/topics/exercise-table-speed-calibration-variation.billiards.json` |
| exercises | sliding friction | present | 215.6 | `./guide/layouts/topics/exercise-sliding-friction.billiards.json` |
| exercises | speed ladder | present | 192.7 | `./guide/layouts/topics/exercise-speed-ladder.billiards.json` |
| exercises | stop, follow, draw | present | 193.1 | `./guide/layouts/topics/exercise-physics-stop-follow-draw.billiards.json` |
| exercises | rail and English | present | 202.7 | `./guide/layouts/topics/exercise-rail-english.billiards.json` |
| exercises | squirt comparison | present | 180.5 | `./guide/layouts/topics/exercise-squirt-comparison.billiards.json` |
| exercises | jump clearance | present | 212.4 | `./guide/layouts/topics/exercise-jump-clearance.billiards.json` |
| exercises | jump landing | present | 214.4 | `./guide/layouts/topics/exercise-jump-landing.billiards.json` |
| exercises | massé route | present | 182.3 | `./guide/layouts/topics/exercise-masse-route.billiards.json` |
| exercises | real-table comparison | present | 197.4 | `./guide/layouts/topics/exercise-calibration-real-table.billiards.json` |
| exercises | Full Rack Runout Analysis | present | 230.8 | `./guide/layouts/topics/exercise-full-rack-review.billiards.json` |
| drills | Practicing with Shot 2 | present | 244.7 | `./guide/layouts/topics/practice-shot-two-quick.billiards.json` |
| drills | Practicing with Undo Last Shot | present | 222.9 | `./guide/layouts/topics/practice-undo-history-quick.billiards.json` |
| exercises | The Three-Ball Runout | present | 213.6 | `./guide/layouts/topics/exercise-three-ball-runout.billiards.json` |
| exercises | Full-Rack Runout Review | present | 218.8 | `./guide/layouts/topics/exercise-full-rack-training.billiards.json` |
| exercises | Jump, Kick, or Massé | present | 206.1 | `./guide/layouts/topics/exercise-jump-kick-masse.billiards.json` |
| exercises | The Runout Improvement Challenge | present | 202.1 | `./guide/layouts/topics/exercise-runout-improvement.billiards.json` |
| exercises | Understanding pattern play | present | 206.3 | `./guide/layouts/topics/pattern-play-quick.billiards.json` |
| exercises | Planning backward from the final ball | present | 232.9 | `./guide/layouts/topics/final-ball-backward-planning-quick.billiards.json` |
| exercises | Recognizing problem balls | present | 225.6 | `./guide/layouts/topics/problem-balls-quick.billiards.json` |
| fundamentals | Managing cue-ball traffic | present | 203.2 | `./guide/layouts/topics/cue-ball-traffic-quick.billiards.json` |
| exercises | Choosing between simple and complex routes | present | 213.2 | `./guide/layouts/topics/route-selection-quick.billiards.json` |
| exercises | Recovering from poor position | present | 231.6 | `./guide/layouts/topics/position-recovery-quick.billiards.json` |
| exercises | Understanding safety play | present | 219.4 | `./guide/layouts/topics/safety-play-quick.billiards.json` |
| fundamentals | Planning a defensive cue-ball route | present | 224.2 | `./guide/layouts/topics/defensive-cue-ball-route-quick.billiards.json` |
| exercises | Escaping from a safety | present | 210.8 | `./guide/layouts/topics/safety-escape-quick.billiards.json` |
| exercises | Evaluating the quality of a runout | present | 212.7 | `./guide/layouts/topics/runout-quality-quick.billiards.json` |
| drills | Learning to aim accurately | present | 213.7 | `./guide/layouts/topics/practice-aiming-quick.billiards.json` |
| drills | Developing speed control | present | 214.0 | `./guide/layouts/topics/practice-speed-control-quick.billiards.json` |
| drills | Understanding stop shots | present | 229.0 | `./guide/layouts/topics/practice-stop-shot-quick.billiards.json` |
| drills | Practicing follow shots | present | 236.2 | `./guide/layouts/topics/practice-follow-shot-quick.billiards.json` |
| drills | Practicing draw shots | present | 220.2 | `./guide/layouts/topics/practice-draw-shot-quick.billiards.json` |
| drills | Practicing cut angles | present | 216.2 | `./guide/layouts/topics/practice-cut-angles-quick.billiards.json` |
| drills | Practicing the tangent line | present | 222.8 | `./guide/layouts/topics/practice-tangent-line-quick.billiards.json` |
| drills | Practicing bank shots | present | 211.1 | `./guide/layouts/topics/practice-bank-shots-quick.billiards.json` |
| drills | Practicing kick shots | present | 213.6 | `./guide/layouts/topics/practice-kick-shots-quick.billiards.json` |
| drills | Practicing English | present | 194.9 | `./guide/layouts/topics/practice-english-quick.billiards.json` |
| drills | Practicing cue-ball position | present | 242.4 | `./guide/layouts/topics/practice-position-play-quick.billiards.json` |
| exercises | The Straight-Shot Ladder | present | 197.2 | `./guide/layouts/topics/exercise-straight-shot-ladder.billiards.json` |
| exercises | Stop, Follow, Draw | present | 195.4 | `./guide/layouts/topics/exercise-stop-follow-draw.billiards.json` |
| exercises | Three Position Zones | present | 241.3 | `./guide/layouts/topics/exercise-three-position-zones.billiards.json` |
| start | 1. Welcome to Focused Practice | present | 168.9 | `./guide/layouts/get-started-01.billiards.json` |
| start | 2. Set Up and Aim Precisely | present | 185.2 | `./guide/layouts/get-started-02.billiards.json` |
| start | 3. Speed, Tip Contact, and English | present | 220.3 | `./guide/layouts/get-started-03.billiards.json` |
| start | 4. Execute and Compare Variations | present | 205.0 | `./guide/layouts/get-started-04.billiards.json` |
| start | 5. Plan and Execute Shot 2 | present | 190.9 | `./guide/layouts/get-started-05.billiards.json` |
| start | 6. Full Racks and Runout Planning | present | 201.2 | `./guide/layouts/get-started-06.billiards.json` |
| start | 7. Undo and Reset the Layout | present | 198.7 | `./guide/layouts/get-started-07.billiards.json` |
| start | 8. Guide and Explorer | present | 185.8 | `./guide/layouts/get-started-08.billiards.json` |
| fundamentals | Contact & Aim | present | 220.0 | `./guide/layouts/topics/live-stats-contact-aim-quick.billiards.json` |
| physics | Cue & Flight | present | 160.9 | `./guide/layouts/topics/live-stats-cue-flight-quick.billiards.json` |
| physics | Power & Pocket | present | 180.4 | `./guide/layouts/topics/live-stats-power-pocket-quick.billiards.json` |
| exercises | Live adjustment | present | 200.2 | `./guide/layouts/topics/exercise-live-stats-cut-overlap.billiards.json` |
| exercises | Speed and spin | present | 202.7 | `./guide/layouts/topics/exercise-live-stats-speed-spin.billiards.json` |
| drills | Practice pathway | present | 189.1 | `./guide/layouts/topics/practice-session-introduction.billiards.json` |
| drills | Speed and contact baseline | present | 203.5 | `./guide/layouts/topics/practice-speed-contact-baseline.billiards.json` |
| drills | Target landing precision | present | 221.2 | `./guide/layouts/topics/practice-target-landing.billiards.json` |
| drills | Rock Around the Clock | present | 239.2 | `./guide/layouts/topics/practice-rock-around-clock.billiards.json` |
| drills | One-rail kick reference | present | 186.2 | `./guide/layouts/topics/practice-one-rail-kick.billiards.json` |
| drills | Two-rail kick extension | present | 185.3 | `./guide/layouts/topics/practice-two-rail-kick.billiards.json` |
| drills | Corner-5 three-rail route | present | 204.0 | `./guide/layouts/topics/practice-corner-five.billiards.json` |
| drills | Progressive difficulty benchmark | present | 202.0 | `./guide/layouts/topics/practice-progressive-benchmark.billiards.json` |
| exercises | 105-minute practice session | present | 218.7 | `./guide/layouts/topics/exercise-focused-practice-session.billiards.json` |
| exercises | Review, save, and repeat | present | 236.6 | `./guide/layouts/topics/exercise-practice-review.billiards.json` |
| more | Tor Lowry and Zero-X Billiards | present | 213.4 | `./guide/layouts/topics/recommend-zero-x-overview.billiards.json` |
| more | Zero-X: center-ball fundamentals | present | 225.8 | `./guide/layouts/topics/recommend-zero-x-center-ball.billiards.json` |
| more | Zero-X: position play | present | 224.2 | `./guide/layouts/topics/recommend-zero-x-position-play.billiards.json` |
| more | Zero-X: eight-ball patterns | present | 225.8 | `./guide/layouts/topics/recommend-zero-x-eight-ball-patterns.billiards.json` |
| more | Zero-X: defense and recovery | present | 211.2 | `./guide/layouts/topics/recommend-zero-x-defense-recovery.billiards.json` |
| drills | Stop Shot Calibration | present | 237.6 | `./guide/layouts/topics/drill-stop-shot.billiards.json` |
| drills | 90-Degree Stun Tangent Line | present | 245.0 | `./guide/layouts/topics/drill-stun-tangent.billiards.json` |
| drills | Speed Ladder — Four Zones | present | 220.8 | `./guide/layouts/topics/drill-speed-ladder.billiards.json` |
| drills | L-Drill — Five-Ball Rotation | present | 248.3 | `./guide/layouts/topics/drill-l-pattern.billiards.json` |
| drills | T-Drill — Center and Foot String | present | 247.3 | `./guide/layouts/topics/drill-t-pattern.billiards.json` |
| drills | Wagon Wheel — Six Target Zones | present | 257.1 | `./guide/layouts/topics/drill-wagon-wheel.billiards.json` |
| drills | Two-Rail Center Recovery | present | 242.2 | `./guide/layouts/topics/drill-two-rail-recovery.billiards.json` |
| drills | Side Pocket Scratch Avoidance | present | 236.0 | `./guide/layouts/topics/drill-scratch-avoidance.billiards.json` |
| drills | One-Rail Mirror Kick | present | 245.3 | `./guide/layouts/topics/drill-mirror-kick.billiards.json` |
| drills | Two-Rail Corner Kick | present | 249.0 | `./guide/layouts/topics/drill-two-rail-kick.billiards.json` |
| fundamentals | Welcome to Fundamentals | present | 179.6 | `./guide/layouts/topics/welcome-fundamentals.billiards.json` |
| physics | Welcome to Physics and Tools | present | 205.3 | `./guide/layouts/topics/welcome-physics.billiards.json` |
| drills | Welcome to Drills | present | 210.5 | `./guide/layouts/topics/welcome-drills.billiards.json` |
| exercises | Welcome to Exercises | present | 204.1 | `./guide/layouts/topics/welcome-exercises.billiards.json` |
| more | Welcome to Resources | present | 190.8 | `./guide/layouts/topics/welcome-more.billiards.json` |
| fundamentals | Welcome to the Guide | present | 240.4 | `./guide/layouts/topics/welcome-guide.billiards.json` |
| fundamentals | A repeatable pre-shot routine | present | 199.9 | `./guide/layouts/topics/fundamentals-pre-shot-routine.billiards.json` |
| fundamentals | Comfortable stance and cue clearance | present | 202.6 | `./guide/layouts/topics/fundamentals-balanced-stance.billiards.json` |
| fundamentals | A stable bridge | present | 211.4 | `./guide/layouts/topics/fundamentals-stable-bridge.billiards.json` |
| fundamentals | Relaxed grip and straight delivery | present | 213.2 | `./guide/layouts/topics/fundamentals-grip-and-delivery.billiards.json` |
| fundamentals | Reach, rail bridges, and cue access | present | 186.9 | `./guide/layouts/topics/fundamentals-cue-access.billiards.json` |
