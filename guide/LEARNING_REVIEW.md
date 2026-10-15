# Billiards Trainer learning review

Branch reviewed: `development/interactive-guide`, base `1eb410c53ba1986769464a484e655fba7a7e6932`.

## Finding

Keep the existing material. The 144 existing teaching topics include 8 Get Started lessons, 27 Fundamentals topics, 49 Physics & Tools topics, 32 Drills, and 28 Exercises. The merged source contains 482 entries because it also includes tool explanations, welcomes, and resources. These numbers are an inventory, not a count of distinct drills.

The clearest existing instruction appears in the ten coordinate drills and the focused practice pathway. The main gaps are uneven standalone success measures, physical setup instructions scattered between narration and downloads, and useful strategy explanations being hidden in Explorer. The original 85 topic/setup mappings supplied 29 starters; Get Started has eight additional snapshots.

## Four-criterion analysis

| Criterion | Existing evidence | Improvement implemented |
| --- | --- | --- |
| Purpose | Most narration states a concept or control function; some summaries are simply a title. | A stated learning outcome on each practice card. |
| Instruction | Existing narration explains actions; many ask the student to compare a change. | A named variable and observation; original narration remains accessible. |
| Success | Some drills already specify counts, target sizes, or legal contact. Many concepts have no separate measure. | Observable outcomes, with potting, position, and legal contact separated where applicable. Original numerical goals remain visible. |
| Transfer | Many downloadable setups exist, but physical positioning instructions are uneven. | Setup diagrams, ball-center diamond coordinates and source-table inches, target sizes, and printable physical attempt records. |

The per-entry evidence and decisions are in `LEARNING_AUDIT.json`; written teaching contracts are in `learning-catalog.json`. Source evidence is retained rather than assigned a misleading automatic quality score.

## Learning structure

The existing top-level Get Started, Fundamentals, Physics & Tools, Drills, Exercises, and Resources remain. Lesson groups provide finer organization. The physical practice sheet offers the following cross-category paths:

### Get Started

- [1. Welcome to Focused Practice](practice.html?topic=first-session-welcome) — Connect the first pot with the cue-ball leave.
- [2. Set Up and Aim Precisely](practice.html?topic=first-session-aiming) — Connect the chosen pocket, object-ball contact, and cue-ball approach.
- [3. Speed, Tip Contact, and English](practice.html?topic=first-session-speed) — Retain backspin through impact and control the distance the cue ball returns.
- [4. Execute and Compare Variations](practice.html?topic=first-session-execute) — Keep a repeatable starting arrangement so comparisons test one change.
- [5. Plan and Execute Shot 2](practice.html?topic=first-session-shot-two) — Pocket the current ball while preserving a usable angle on the next ball.
- [6. Full Racks and Runout Planning](practice.html?topic=first-session-extend-runout) — Carry a plan through a full rack and identify the decision that created a difficult continuation.
- [7. Undo and Reset the Layout](practice.html?topic=first-session-undo) — Keep a repeatable starting arrangement so comparisons test one change.
- [8. Guide and Explorer](practice.html?topic=get-started-explore) — Find a lesson, inspect a control, then return to active practice.

### Physical fundamentals

- [A repeatable pre-shot routine](practice.html?topic=fundamentals-pre-shot-routine) — Make planning and delivery a repeatable physical routine.
- [Comfortable stance and cue clearance](practice.html?topic=fundamentals-balanced-stance) — Build comfortable balance and cue clearance while maintaining the chosen line.
- [A stable bridge](practice.html?topic=fundamentals-stable-bridge) — Support a repeatable cue line with a stable bridge.
- [Relaxed grip and straight delivery](practice.html?topic=fundamentals-grip-and-delivery) — Deliver the cue through the intended tip contact with a relaxed grip.
- [Reach, rail bridges, and cue access](practice.html?topic=fundamentals-cue-access) — Include physical cue access and reach when judging whether a route is practical.

### Aim and contact

- [Ghost-ball position](practice.html?topic=ghost-ball-geometry-quick) — Connect the chosen pocket, object-ball contact, and cue-ball approach.
- [Cut angle](practice.html?topic=cut-angle-geometry-quick) — Recognize how a thinner contact changes cut angle, overlap, and the required aiming line.
- [Ball overlap](practice.html?topic=ball-overlap-quick) — Recognize how a thinner contact changes cut angle, overlap, and the required aiming line.
- [Learning to aim accurately](practice.html?topic=practice-aiming-quick) — Connect the chosen pocket, object-ball contact, and cue-ball approach.
- [The Straight-Shot Ladder](practice.html?topic=exercise-straight-shot-ladder) — Connect the chosen pocket, object-ball contact, and cue-ball approach.

### Cue-ball control

- [Stop Shot Calibration](practice.html?topic=drill-stop-shot) — Arrive at a straight full-ball collision without forward or backward roll.
- [Follow through contact](practice.html?topic=physics-follow-quick) — Control forward cue-ball travel after pocketing a straight shot.
- [Draw through contact](practice.html?topic=physics-draw-quick) — Retain backspin through impact and control the distance the cue ball returns.
- [Stop, Follow, Draw](practice.html?topic=exercise-stop-follow-draw) — Distinguish stop, forward travel, and return on one straight shot.
- [Speed Ladder — Four Zones](practice.html?topic=drill-speed-ladder) — Predict and control stopping distance without changing the aiming line.
- [Target landing precision](practice.html?topic=practice-target-landing) — Pocket the current ball while preserving a usable angle on the next ball.

### Natural angles

- [The ninety-degree rule](practice.html?topic=ninety-degree-rule-quick) — Predict the initial cue-ball exit for a cut struck with stun at impact.
- [90-Degree Stun Tangent Line](practice.html?topic=drill-stun-tangent) — Predict the initial cue-ball exit for a cut struck with stun at impact.
- [Natural roll](practice.html?topic=natural-roll-quick) — Recognize natural rolling departures and distinguish them from stun.
- [The thirty-degree rule](practice.html?topic=thirty-degree-rule-quick) — Recognize natural rolling departures and distinguish them from stun.
- [Wagon Wheel — Six Target Zones](practice.html?topic=drill-wagon-wheel) — Pocket the current ball while preserving a usable angle on the next ball.

### Rails and spin

- [Practicing bank shots](practice.html?topic=practice-bank-shots-quick) — Send the object ball through a planned cushion contact toward a pocket.
- [One-rail kick reference](practice.html?topic=practice-one-rail-kick) — Reach the legal target through a cushion route when direct access is blocked.
- [Two-rail kick extension](practice.html?topic=practice-two-rail-kick) — Plan a multi-cushion route as a sequence of observable rail contacts.
- [Corner-5 three-rail route](practice.html?topic=practice-corner-five) — Plan a multi-cushion route as a sequence of observable rail contacts.
- [rail and English](practice.html?topic=exercise-rail-english) — Distinguish sidespin influence on the approach from its effect at a cushion.
- [squirt comparison](practice.html?topic=exercise-squirt-comparison) — Recognize initial cue-ball deflection when using off-center contact.

### Position and patterns

- [Practicing cue-ball position](practice.html?topic=practice-position-play-quick) — Pocket the current ball while preserving a usable angle on the next ball.
- [Practicing with Shot 2](practice.html?topic=practice-shot-two-quick) — Pocket the current ball while preserving a usable angle on the next ball.
- [Three Position Zones](practice.html?topic=exercise-three-position-zones) — Pocket the current ball while preserving a usable angle on the next ball.
- [Understanding pattern play](practice.html?topic=pattern-play-quick) — Choose a sequence that preserves angles, access, and manageable transitions.
- [Planning backward from the final ball](practice.html?topic=final-ball-backward-planning-quick) — Choose a sequence that preserves angles, access, and manageable transitions.
- [Recognizing problem balls](practice.html?topic=problem-balls-quick) — Choose a sequence that preserves angles, access, and manageable transitions.
- [L-Drill — Five-Ball Rotation](practice.html?topic=drill-l-pattern) — Choose a sequence that preserves angles, access, and manageable transitions.
- [T-Drill — Center and Foot String](practice.html?topic=drill-t-pattern) — Choose a sequence that preserves angles, access, and manageable transitions.
- [Rock Around the Clock](practice.html?topic=practice-rock-around-clock) — Choose a sequence that preserves angles, access, and manageable transitions.

### Defense and recovery

- [Choosing between simple and complex routes](practice.html?topic=route-selection-quick) — Choose a sequence that preserves angles, access, and manageable transitions.
- [Recovering from poor position](practice.html?topic=position-recovery-quick) — Choose a sequence that preserves angles, access, and manageable transitions.
- [Understanding safety play](practice.html?topic=safety-play-quick) — Compare attacking with leaving a difficult legal reply.
- [Escaping from a safety](practice.html?topic=safety-escape-quick) — Compare attacking with leaving a difficult legal reply.
- [Side Pocket Scratch Avoidance](practice.html?topic=drill-scratch-avoidance) — Move the cue-ball route away from the side-pocket scratch line.

### Physics and teaching tools

- [Table markers](practice.html?topic=table-markers-quick) — Define a visible, measurable practice objective before shooting.
- [Compass tool — introduction](practice.html?topic=compass-tool-intro-quick) — Use an angle reference to explain a direction rather than assume it predicts the whole route.
- [Contact & Aim](practice.html?topic=live-stats-contact-aim-quick) — Recognize how a thinner contact changes cut angle, overlap, and the required aiming line.
- [Power meter](practice.html?topic=exercise-cue-pocket-threshold) — Distinguish cue-ball-to-object-ball power from object-ball-to-pocket power.
- [Change one variable at a time](practice.html?topic=one-variable-calibration-quick) — Compare repeatable table behavior without confusing stroke changes with table changes.
- [real-table comparison](practice.html?topic=exercise-calibration-real-table) — Compare repeatable table behavior without confusing stroke changes with table changes.

### Advanced route study

- [jump clearance](practice.html?topic=exercise-jump-clearance) — Evaluate height at the obstacle, then landing and the continuation after landing.
- [jump landing](practice.html?topic=exercise-jump-landing) — Evaluate height at the obstacle, then landing and the continuation after landing.
- [massé route](practice.html?topic=exercise-masse-route) — Compare a curved route around a blocker with a cushion alternative.
- [Jump, Kick, or Massé](practice.html?topic=exercise-jump-kick-masse) — Compare a curved route around a blocker with a cushion alternative.

### Runouts and practice review

- [The Three-Ball Runout](practice.html?topic=exercise-three-ball-runout) — Choose a sequence that preserves angles, access, and manageable transitions.
- [Full Rack Runout Analysis](practice.html?topic=exercise-full-rack-review) — Carry a plan through a full rack and identify the decision that created a difficult continuation.
- [The Runout Improvement Challenge](practice.html?topic=exercise-runout-improvement) — Carry a plan through a full rack and identify the decision that created a difficult continuation.
- [Progressive difficulty benchmark](practice.html?topic=practice-progressive-benchmark) — Use comparable results to decide what to practice next.
- [105-minute practice session](practice.html?topic=exercise-focused-practice-session) — Use comparable results to decide what to practice next.
- [Review, save, and repeat](practice.html?topic=exercise-practice-review) — Use comparable results to decide what to practice next.

## Changes and limits

- Every original Main/Shared entry is retained. Existing MP3s, narration text, drill files, default physics, and table execution are unchanged. The learning cards are supplemental written instructions.
- Five physical fundamentals checklists were added: pre-shot routine, stance, bridge, grip/delivery, and cue access. They have no substituted audio and are labeled audio pending. Physical mechanics require observation, video, or a coach.
- Thirteen existing strategy, natural-angle, and tool explanations are discoverable as lessons, including backward planning, problem balls, route choice, recovery, safety, natural roll, angle references, markers, and compass.
- All eight Get Started cards use their own matching snapshot; reset calls the existing tour adapter. The Undo practice sheet shows the saved BEFORE-shot ball centers.
- The practice sheet labels coordinates Length 0–8 and Width 0–4 with head left and foot right. Existing narrated coordinates use across 0–4 and head-to-foot 0–8; the physical positions are identical.
- Inches describe the source playing surface (usually 100 × 50 inches). Other table sizes need diamond scaling, preserved physical ball/target sizes, and rechecked ball-width offsets and alignment.
- Score records are printable/manual. No automated real-shot tracking, body-mechanics assessment, calibrated skill ratings, or automatic strategy solver is claimed. Repeated deterministic simulation is not evidence of physical consistency.
- Creator-referenced starters remain Trainer adaptations; use the linked demonstration for the creator’s exact sequence or numbering system.
- Advanced jump/massé study is distinguished from ordinary physical practice. Physical attempts depend on venue permission and suitable technique instruction.
- The app pre-caches the new cards and practice sheet with the existing offline shell; external videos remain online resources.

## Get Started layout checks

| Lesson | Purpose of the test | Layout / important check |
| --- | --- | --- |
| 1. Welcome to Focused Practice | Connect the first pot with the cue-ball leave. | get-started-01.billiards.json |
| 2. Set Up and Aim Precisely | Connect the chosen pocket, object-ball contact, and cue-ball approach. | get-started-02.billiards.json |
| 3. Speed, Tip Contact, and English | Retain backspin through impact and control the distance the cue ball returns. | get-started-03.billiards.json |
| 4. Execute and Compare Variations | Keep a repeatable starting arrangement so comparisons test one change. | get-started-04.billiards.json |
| 5. Plan and Execute Shot 2 | Pocket the current ball while preserving a usable angle on the next ball. | get-started-05.billiards.json |
| 6. Full Racks and Runout Planning | Carry a plan through a full rack and identify the decision that created a difficult continuation. | get-started-06.billiards.json |
| 7. Undo and Reset the Layout | Keep a repeatable starting arrangement so comparisons test one change. | get-started-07.billiards.json — before-shot history for physical setup |
| 8. Guide and Explorer | Find a lesson, inspect a control, then return to active practice. | get-started-08.billiards.json |

## Complete original teaching-topic inventory

The table below includes every original teaching-topic entry, including concepts also available by Explorer. The shared learning profile is intentional: related controls are not counted as independent drills. Each topic has a specific source narration and supplemental contract in the JSON audit.

| Existing topic | Category | Learning group | Practice sheet |
| --- | --- | --- | --- |
| Aiming line | fundamentals | Aim, contact, and pocketing | [Open](practice.html?topic=aiming-line-quick) |
| Ghost ball | fundamentals | Aim, contact, and pocketing | [Open](practice.html?topic=ghost-ball-quick) |
| Tangent line | physics | Tangent and natural angles | [Open](practice.html?topic=tangent-line-quick) |
| Diamond references | fundamentals | Banks, kicks, and rail routes | [Open](practice.html?topic=diamond-grid-quick) |
| Trajectory guides | physics | Using the trainer | [Open](practice.html?topic=trajectory-lines-quick) |
| Pocket targeting | fundamentals | Aim, contact, and pocketing | [Open](practice.html?topic=pocket-targeting-quick) |
| Physics and calibration overview | physics | Table observation and calibration | [Open](practice.html?topic=physics-calibration-overview-quick) |
| Banks and kicks | fundamentals | Banks, kicks, and rail routes | [Open](practice.html?topic=bank-kick-overview-quick) |
| Hide Cue Ball 1 and Cue Ball 2 | fundamentals | Using the trainer | [Open](practice.html?topic=hide-cue-ball-guides-quick) |
| Shot speed | physics | Speed and target zones | [Open](practice.html?topic=shot-speed-controls-quick) |
| Fine speed adjustment | physics | Speed and target zones | [Open](practice.html?topic=shot-speed-fine-adjustment-quick) |
| Jump height | physics | Elevated shots and route choices | [Open](practice.html?topic=jump-height-quick) |
| Obstacle clearance | physics | Elevated shots and route choices | [Open](practice.html?topic=jump-obstacle-clearance-quick) |
| Landing point | physics | Elevated shots and route choices | [Open](practice.html?topic=jump-landing-point-quick) |
| Massé shot controls | physics | Elevated shots and route choices | [Open](practice.html?topic=masse-shot-controls-quick) |
| Direct cue-tip contact | fundamentals | Stop, follow, draw, and stun | [Open](practice.html?topic=cue-ball-diagram-direct-tip-quick) |
| C and P power meters | physics | Readouts and teaching tools | [Open](practice.html?topic=cue-ball-pocket-power-meters-quick) |
| Power meter | exercises | Readouts and teaching tools | [Open](practice.html?topic=exercise-cue-pocket-threshold) |
| Opening 3D jump and massé controls | physics | Elevated shots and route choices | [Open](practice.html?topic=jump-masse-open-controls-quick) |
| Cue elevation for advanced shots | physics | Elevated shots and route choices | [Open](practice.html?topic=jump-masse-elevation-technique-advanced) |
| Contact point | fundamentals | Aim, contact, and pocketing | [Open](practice.html?topic=contact-point-geometry-quick) |
| Cut angle | fundamentals | Aim, contact, and pocketing | [Open](practice.html?topic=cut-angle-geometry-quick) |
| Ball overlap | fundamentals | Aim, contact, and pocketing | [Open](practice.html?topic=ball-overlap-quick) |
| Ghost-ball position | fundamentals | Aim, contact, and pocketing | [Open](practice.html?topic=ghost-ball-geometry-quick) |
| Collision line | physics | Contact, energy, and rotation | [Open](practice.html?topic=collision-line-quick) |
| The tangent line | physics | Tangent and natural angles | [Open](practice.html?topic=tangent-line-geometry-quick) |
| Bank-shot geometry | fundamentals | Banks, kicks, and rail routes | [Open](practice.html?topic=bank-shot-geometry-quick) |
| Kick-shot geometry | fundamentals | Banks, kicks, and rail routes | [Open](practice.html?topic=kick-shot-geometry-quick) |
| Diamond references | fundamentals | Banks, kicks, and rail routes | [Open](practice.html?topic=diamond-system-geometry-quick) |
| Mirror aiming | fundamentals | Banks, kicks, and rail routes | [Open](practice.html?topic=mirror-aiming-quick) |
| Choosing the rail contact point | fundamentals | Banks, kicks, and rail routes | [Open](practice.html?topic=rail-contact-point-quick) |
| English off a cushion | fundamentals | Spin, squirt, and cushion response | [Open](practice.html?topic=rail-english-geometry-quick) |
| Multiple-rail routes | fundamentals | Banks, kicks, and rail routes | [Open](practice.html?topic=multiple-rail-routes-quick) |
| Geometry practice challenge | exercises | Banks, kicks, and rail routes | [Open](practice.html?topic=exercise-geometry-route-comparison) |
| Positioning the cue ball | fundamentals | Layouts, repeatability, and review | [Open](practice.html?topic=cue-ball-placement-quick) |
| Creating a simple practice layout | drills | Layouts, repeatability, and review | [Open](practice.html?topic=practice-layout-quick) |
| Pocketed-ball tracking | fundamentals | Layouts, repeatability, and review | [Open](practice.html?topic=pocketed-balls-layout-quick) |
| Exercise: change one ball | exercises | Aim, contact, and pocketing | [Open](practice.html?topic=exercise-change-one-ball) |
| Exercise: build and review a rack | exercises | Patterns and runout decisions | [Open](practice.html?topic=exercise-layout-runout-review) |
| — save, change, and recall | exercises | Layouts, repeatability, and review | [Open](practice.html?topic=exercise-save-recall-layout) |
| Table Speed | exercises | Table observation and calibration | [Open](practice.html?topic=exercise-table-speed) |
| Physics and Calibration overview | physics | Table observation and calibration | [Open](practice.html?topic=physics-calibration-intro-quick) |
| What calibration can and cannot do | physics | Table observation and calibration | [Open](practice.html?topic=calibration-expectations-advanced) |
| Rolling friction and table speed | physics | Table observation and calibration | [Open](practice.html?topic=rolling-friction-quick) |
| Sliding friction | physics | Table observation and calibration | [Open](practice.html?topic=sliding-friction-quick) |
| Shot speed and distance | physics | Speed and target zones | [Open](practice.html?topic=physics-shot-speed-quick) |
| Cue ball collisions | physics | Contact, energy, and rotation | [Open](practice.html?topic=ball-collision-quick) |
| Collision energy and restitution | physics | Contact, energy, and rotation | [Open](practice.html?topic=collision-restitution-advanced) |
| Follow through contact | physics | Stop, follow, draw, and stun | [Open](practice.html?topic=physics-follow-quick) |
| Draw through contact | physics | Stop, follow, draw, and stun | [Open](practice.html?topic=physics-draw-quick) |
| Stop and stun | physics | Tangent and natural angles | [Open](practice.html?topic=physics-stun-quick) |
| Side spin or English | physics | Spin, squirt, and cushion response | [Open](practice.html?topic=physics-english-quick) |
| Spin transfer | physics | Contact, energy, and rotation | [Open](practice.html?topic=spin-transfer-advanced) |
| Cue ball deflection or squirt | physics | Spin, squirt, and cushion response | [Open](practice.html?topic=cue-ball-squirt-quick) |
| Swerve and cloth interaction | fundamentals | Spin, squirt, and cushion response | [Open](practice.html?topic=cue-ball-swerve-advanced) |
| Rail speed loss | physics | Speed and target zones | [Open](practice.html?topic=rail-speed-loss-advanced) |
| Jump trajectory | physics | Elevated shots and route choices | [Open](practice.html?topic=jump-trajectory-quick) |
| Clearing an obstacle | physics | Elevated shots and route choices | [Open](practice.html?topic=physics-jump-clearance-quick) |
| Landing position | physics | Elevated shots and route choices | [Open](practice.html?topic=physics-jump-landing-quick) |
| Understanding jump trajectory | physics | Elevated shots and route choices | [Open](practice.html?topic=jump-model-limitations-advanced) |
| Massé shot | physics | Elevated shots and route choices | [Open](practice.html?topic=masse-physics-quick) |
| Massé versus jump | physics | Elevated shots and route choices | [Open](practice.html?topic=masse-versus-jump-advanced) |
| Table dimensions and ball geometry | physics | Table observation and calibration | [Open](practice.html?topic=table-geometry-calibration-quick) |
| Reading physical measurements | physics | Table observation and calibration | [Open](practice.html?topic=physics-measurements-quick) |
| Calibrating against a real table | physics | Table observation and calibration | [Open](practice.html?topic=real-table-calibration-quick) |
| Change one variable at a time | physics | Table observation and calibration | [Open](practice.html?topic=one-variable-calibration-quick) |
| Save your calibration observations | physics | Table observation and calibration | [Open](practice.html?topic=calibration-notes-quick) |
| table speed | exercises | Table observation and calibration | [Open](practice.html?topic=exercise-table-speed-calibration-variation) |
| sliding friction | exercises | Table observation and calibration | [Open](practice.html?topic=exercise-sliding-friction) |
| speed ladder | exercises | Speed and target zones | [Open](practice.html?topic=exercise-speed-ladder) |
| stop, follow, draw | exercises | Stop, follow, draw, and stun | [Open](practice.html?topic=exercise-physics-stop-follow-draw) |
| rail and English | exercises | Spin, squirt, and cushion response | [Open](practice.html?topic=exercise-rail-english) |
| squirt comparison | exercises | Spin, squirt, and cushion response | [Open](practice.html?topic=exercise-squirt-comparison) |
| jump clearance | exercises | Elevated shots and route choices | [Open](practice.html?topic=exercise-jump-clearance) |
| jump landing | exercises | Elevated shots and route choices | [Open](practice.html?topic=exercise-jump-landing) |
| massé route | exercises | Elevated shots and route choices | [Open](practice.html?topic=exercise-masse-route) |
| real-table comparison | exercises | Table observation and calibration | [Open](practice.html?topic=exercise-calibration-real-table) |
| Table and ball geometry settings | physics | Table observation and calibration | [Open](practice.html?topic=calibration-table-ball-dimensions-quick) |
| Surface and collision settings | physics | Table observation and calibration | [Open](practice.html?topic=calibration-friction-restitution-advanced) |
| Advanced jump physics settings | physics | Table observation and calibration | [Open](practice.html?topic=calibration-jump-physics-controls-advanced) |
| Full Rack Runout Analysis | exercises | Patterns and runout decisions | [Open](practice.html?topic=exercise-full-rack-review) |
| Practicing with Shot 2 | drills | Position and next-shot angles | [Open](practice.html?topic=practice-shot-two-quick) |
| Practicing with Undo Last Shot | drills | Layouts, repeatability, and review | [Open](practice.html?topic=practice-undo-history-quick) |
| The Three-Ball Runout | exercises | Patterns and runout decisions | [Open](practice.html?topic=exercise-three-ball-runout) |
| Full-Rack Runout Review | exercises | Patterns and runout decisions | [Open](practice.html?topic=exercise-full-rack-training) |
| Jump, Kick, or Massé | exercises | Elevated shots and route choices | [Open](practice.html?topic=exercise-jump-kick-masse) |
| The Runout Improvement Challenge | exercises | Patterns and runout decisions | [Open](practice.html?topic=exercise-runout-improvement) |
| Managing cue-ball traffic | fundamentals | Patterns and runout decisions | [Open](practice.html?topic=cue-ball-traffic-quick) |
| Planning a defensive cue-ball route | fundamentals | Defense, escapes, and recovery | [Open](practice.html?topic=defensive-cue-ball-route-quick) |
| Learning to aim accurately | drills | Aim, contact, and pocketing | [Open](practice.html?topic=practice-aiming-quick) |
| Developing speed control | drills | Speed and target zones | [Open](practice.html?topic=practice-speed-control-quick) |
| Understanding stop shots | drills | Stop, follow, draw, and stun | [Open](practice.html?topic=practice-stop-shot-quick) |
| Practicing follow shots | drills | Stop, follow, draw, and stun | [Open](practice.html?topic=practice-follow-shot-quick) |
| Practicing draw shots | drills | Stop, follow, draw, and stun | [Open](practice.html?topic=practice-draw-shot-quick) |
| Practicing cut angles | drills | Aim, contact, and pocketing | [Open](practice.html?topic=practice-cut-angles-quick) |
| Practicing the tangent line | drills | Tangent and natural angles | [Open](practice.html?topic=practice-tangent-line-quick) |
| Practicing bank shots | drills | Banks, kicks, and rail routes | [Open](practice.html?topic=practice-bank-shots-quick) |
| Practicing kick shots | drills | Banks, kicks, and rail routes | [Open](practice.html?topic=practice-kick-shots-quick) |
| Practicing English | drills | Spin, squirt, and cushion response | [Open](practice.html?topic=practice-english-quick) |
| Practicing cue-ball position | drills | Position and next-shot angles | [Open](practice.html?topic=practice-position-play-quick) |
| The Straight-Shot Ladder | exercises | Aim, contact, and pocketing | [Open](practice.html?topic=exercise-straight-shot-ladder) |
| Stop, Follow, Draw | exercises | Stop, follow, draw, and stun | [Open](practice.html?topic=exercise-stop-follow-draw) |
| Three Position Zones | exercises | Position and next-shot angles | [Open](practice.html?topic=exercise-three-position-zones) |
| 1. Welcome to Focused Practice | start | Using the trainer | [Open](practice.html?topic=first-session-welcome) |
| 2. Set Up and Aim Precisely | start | Aim, contact, and pocketing | [Open](practice.html?topic=first-session-aiming) |
| 3. Speed, Tip Contact, and English | start | Stop, follow, draw, and stun | [Open](practice.html?topic=first-session-speed) |
| 4. Execute and Compare Variations | start | Layouts, repeatability, and review | [Open](practice.html?topic=first-session-execute) |
| 5. Plan and Execute Shot 2 | start | Position and next-shot angles | [Open](practice.html?topic=first-session-shot-two) |
| 6. Full Racks and Runout Planning | start | Patterns and runout decisions | [Open](practice.html?topic=first-session-extend-runout) |
| 7. Undo and Reset the Layout | start | Layouts, repeatability, and review | [Open](practice.html?topic=first-session-undo) |
| 8. Guide and Explorer | start | Using the trainer | [Open](practice.html?topic=get-started-explore) |
| Contact & Aim | fundamentals | Aim, contact, and pocketing | [Open](practice.html?topic=live-stats-contact-aim-quick) |
| Cut angle | fundamentals | Aim, contact, and pocketing | [Open](practice.html?topic=live-stats-cut-angle-quick) |
| Physical overlap | fundamentals | Aim, contact, and pocketing | [Open](practice.html?topic=live-stats-overlap-quick) |
| Travel to contact | fundamentals | Readouts and teaching tools | [Open](practice.html?topic=live-stats-contact-travel-quick) |
| Cue & Flight | physics | Readouts and teaching tools | [Open](practice.html?topic=live-stats-cue-flight-quick) |
| Predicted squirt | physics | Spin, squirt, and cushion response | [Open](practice.html?topic=live-stats-squirt-quick) |
| Jump and clearance | physics | Elevated shots and route choices | [Open](practice.html?topic=live-stats-jump-clearance-quick) |
| Curve and massé | physics | Elevated shots and route choices | [Open](practice.html?topic=live-stats-masse-quick) |
| Power & Pocket | physics | Readouts and teaching tools | [Open](practice.html?topic=live-stats-power-pocket-quick) |
| Power feel and pocket speed | physics | Readouts and teaching tools | [Open](practice.html?topic=live-stats-power-feel-quick) |
| Ball speeds | physics | Readouts and teaching tools | [Open](practice.html?topic=live-stats-ball-speeds-advanced) |
| Live adjustment | exercises | Aim, contact, and pocketing | [Open](practice.html?topic=exercise-live-stats-cut-overlap) |
| Speed and spin | exercises | Readouts and teaching tools | [Open](practice.html?topic=exercise-live-stats-speed-spin) |
| Practice pathway | drills | Practice plans and benchmarks | [Open](practice.html?topic=practice-session-introduction) |
| Speed and contact baseline | drills | Stop, follow, draw, and stun | [Open](practice.html?topic=practice-speed-contact-baseline) |
| Target landing precision | drills | Position and next-shot angles | [Open](practice.html?topic=practice-target-landing) |
| Rock Around the Clock | drills | Patterns and runout decisions | [Open](practice.html?topic=practice-rock-around-clock) |
| One-rail kick reference | drills | Banks, kicks, and rail routes | [Open](practice.html?topic=practice-one-rail-kick) |
| Two-rail kick extension | drills | Banks, kicks, and rail routes | [Open](practice.html?topic=practice-two-rail-kick) |
| Corner-5 three-rail route | drills | Banks, kicks, and rail routes | [Open](practice.html?topic=practice-corner-five) |
| Progressive difficulty benchmark | drills | Practice plans and benchmarks | [Open](practice.html?topic=practice-progressive-benchmark) |
| 105-minute practice session | exercises | Practice plans and benchmarks | [Open](practice.html?topic=exercise-focused-practice-session) |
| Review, save, and repeat | exercises | Practice plans and benchmarks | [Open](practice.html?topic=exercise-practice-review) |
| Stop Shot Calibration | drills | Stop, follow, draw, and stun | [Open](practice.html?topic=drill-stop-shot) |
| 90-Degree Stun Tangent Line | drills | Tangent and natural angles | [Open](practice.html?topic=drill-stun-tangent) |
| Speed Ladder — Four Zones | drills | Speed and target zones | [Open](practice.html?topic=drill-speed-ladder) |
| L-Drill — Five-Ball Rotation | drills | Patterns and runout decisions | [Open](practice.html?topic=drill-l-pattern) |
| T-Drill — Center and Foot String | drills | Patterns and runout decisions | [Open](practice.html?topic=drill-t-pattern) |
| Wagon Wheel — Six Target Zones | drills | Position and next-shot angles | [Open](practice.html?topic=drill-wagon-wheel) |
| Two-Rail Center Recovery | drills | Banks, kicks, and rail routes | [Open](practice.html?topic=drill-two-rail-recovery) |
| Side Pocket Scratch Avoidance | drills | Position and next-shot angles | [Open](practice.html?topic=drill-scratch-avoidance) |
| One-Rail Mirror Kick | drills | Banks, kicks, and rail routes | [Open](practice.html?topic=drill-mirror-kick) |
| Two-Rail Corner Kick | drills | Banks, kicks, and rail routes | [Open](practice.html?topic=drill-two-rail-kick) |

## Verification

See `LEARNING_VERIFICATION.md` for checks and practical limitations. No physical-table trials were performed during this software review.

## Primary instructional references

- [Dr. Dave — fundamentals](https://drdavepoolinfo.com/tutorial/fundamentals/)
- [Dr. Dave — pre-shot routine](https://drdavepoolinfo.com/faq/pre-shot-routine/definition/)
- [Dr. Dave — cue-ball reference directions](https://drdavepoolinfo.com/faq/cue-ball-control/lines/)
- [Dr. Dave — strategy](https://drdavepoolinfo.com/tutorial/strategy/)
- Existing creator resources retained in the lesson catalog.
