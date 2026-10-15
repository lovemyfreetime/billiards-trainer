"""Build supplemental learning cards and a source-by-source audit; never rewrite recordings."""
import json
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
G = ROOT / 'guide'
def read(name): return json.loads((G/name).read_text())
def write(name, data): (G/name).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')

# Each profile has a distinct observation and success measure. Related controls link
# to a profile; they do not become hundreds of nominally different scored drills.
PROFILES = {}
def profile(key, group, setup, purpose, instruction, success, transfer, progress):
    PROFILES[key] = dict(group=group, setup=setup, purpose=purpose, instruction=instruction,
                         success=success, transfer=transfer, progression=progress)
profile('aim', 'Aim, contact, and pocketing', 'first-shot',
 'Connect the chosen pocket, object-ball contact, and cue-ball approach.',
 'Name the pocket. Observe the ghost-ball center and contact line. Execute Shot, reset, then change only aim. Compare a full hit with a small cut.',
 'For each of five attempts, record the intended pocket and whether the object ball entered it. Separate an aim miss from a positional miss.',
 'Place the ball centers using the setup sheet. Visualize the ghost-ball center while standing, align the cue, and deliver the shot. Use five physical attempts; the software cannot measure your alignment or stroke.',
 'Increase cue-ball distance or cut angle, one at a time, after a repeatable baseline.')
profile('cut', 'Aim, contact, and pocketing', 'cut-shot',
 'Recognize how a thinner contact changes cut angle, overlap, and the required aiming line.',
 'Keep the object ball and pocket fixed. Move only the cue ball to compare three cut angles. Predict which hit has less overlap before checking Live Stats.',
 'Correctly predict the fuller/thinner contact on three comparisons, then record pocketing on five attempts at each angle.',
 'Use the same object-ball spot and pocket. Mark three cue-ball starts by diamond references; reset the balls after each attempt.',
 'Increase distance before adding English; keep the same scoring conditions.')
profile('stop', 'Stop, follow, draw, and stun', 'first-shot',
 'Arrive at a straight full-ball collision without forward or backward roll.',
 'Use a straight shot with no sidespin. Start slightly below center, keep aim fixed, and adjust one of tip height or speed. Observe the cue-ball center at impact and at rest.',
 'Count five attempts: record the pot and a cue-ball finish within one ball diameter of its center at impact. Count a pot with unwanted roll as a position miss.',
 'Use the setup sheet and choose the same stopping tolerance on the cloth. Record pot and stop separately; recreate the original ball centers after every attempt.',
 'Increase approach distance; regain the stop with speed and tip height rather than assuming center-tip contact always means stun.')
profile('follow', 'Stop, follow, draw, and stun', 'first-shot',
 'Control forward cue-ball travel after pocketing a straight shot.',
 'Choose a finish beyond the collision point and away from a pocket. Hold aim and speed fixed; compare two small follow settings and watch the stopping distance.',
 'Name a target zone before shooting. Record pot and cue-ball center in the zone separately over five attempts.',
 'Place a flat visual target beyond contact. Reproduce the layout and aim for the same finish; judge your stroke by travel rather than copying a slider percentage.',
 'Use a smaller zone only after consistent pocketing and position; then increase approach distance.')
profile('draw', 'Stop, follow, draw, and stun', 'first-shot',
 'Retain backspin through impact and control the distance the cue ball returns.',
 'Keep the shot straight and sidespin at zero. Choose a return zone. Compare draw at a fixed speed, reset, then compare speed at a fixed draw setting.',
 'Record the pot and whether the cue-ball center returns into the selected zone on five attempts; distinguish no draw, short draw, and excessive draw.',
 'Place a flat target on the approach side of the object ball. Use your own cue delivery to reproduce the finish, resetting both balls for each attempt.',
 'Move the cue ball farther away while retaining the same return-zone objective.')
profile('stun', 'Tangent and natural angles', 'drill-stun-tangent',
 'Predict the initial cue-ball exit for a cut struck with stun at impact.',
 'Keep sidespin at zero. Compare the tangent reference with the initial path after collision. Adjust tip height or speed to approach stun; then compare follow and draw.',
 'Predict the initial exit side on three cuts, then record the pot and whether the initial route follows your tangent reference. Do not grade the entire follow/draw curve as a straight tangent.',
 'Use the cut layout and identify a rail crossing along the tangent. Test five attempts; watch the initial exit separately from the eventual stopping point.',
 'Change cut angle, then compare how follow/draw move the route away from the reference.')
profile('roll', 'Tangent and natural angles', 'cut-shot',
 'Recognize natural rolling departures and distinguish them from stun.',
 'Use a moderate cut and little sidespin. Allow natural roll at contact. Compare the eventual rolling direction with the approximately 30-degree reference when shown, then restore and test stun.',
 'Explain which trial arrives rolling and which arrives in stun. Predict the departure side before three different cuts; the 30-degree reference is an approximation over its useful hit range.',
 'Recreate the cut and observe the cue-ball route from rolling and stun deliveries. Use the direction as a starting reference, then check it on your table.',
 'Compare a fuller and a thinner hit to learn where the natural-angle approximation stops being useful.')
profile('speed', 'Speed and target zones', 'clear-speed',
 'Predict and control stopping distance without changing the aiming line.',
 'Choose a clear path. Name a stopping band, then test low, medium, and higher speeds from the same start. Reset between attempts.',
 'Record short, inside, or long for five physical attempts at a named band. In the simulator, predict the ordering of three stopping distances.',
 'Use a cue-ball-only route and flat target band. Translate stroke strength by observed travel; simulator speed values are not a measurement of your physical stroke.',
 'Narrow the band or add a cushion only after establishing a consistent baseline.')
profile('position', 'Position and next-shot angles', 'position-two-balls',
 'Pocket the current ball while preserving a usable angle on the next ball.',
 'Name the next ball and pocket first. Mark a cue-ball zone and explain the angle it preserves. Execute Shot, inspect the actual simulated leave, and compare one speed or tip adjustment.',
 'Record the first pot, zone arrival, and whether the next pot remains available as three separate outcomes over five attempts.',
 'Set both object balls from the diagram. Play the first shot, then play the second from where the cue ball actually stops; no repositioning between those two shots.',
 'Shrink the useful zone or add a third ball; do not count an attractive leave that is blocked.')
profile('pattern', 'Patterns and runout decisions', 'three-ball',
 'Choose a sequence that preserves angles, access, and manageable transitions.',
 'Compare two orders on the same layout. Explain the next-ball angle before each shot. Use Shot 2, execute one shot at a time, and revise from the resulting layout.',
 'Record balls cleared, lost position, and unintended contacts for three runs. Explain one concrete advantage of the preferred sequence; no automatic best-pattern claim is made.',
 'Choose 8-ball-style open practice or lowest-ball-first rotation before starting. Play each run from the actual leaves; reset only at the end of a run.',
 'Add a ball or a blocker while retaining a readable, explained pattern.')
profile('rack', 'Patterns and runout decisions', 'rack-9ball',
 'Carry a plan through a full rack and identify the decision that created a difficult continuation.',
 'Choose the game rules first. Break or arrange the rack, name the next two balls, and extend Shot 2 after each execution. Review the earliest position error with Undo Last Shot.',
 'Record the game, starting layout, legal balls cleared, scratches, and first lost position. Compare two attempts from the same post-break layout, not different random breaks.',
 'Use a correctly racked game or reproduce a saved post-break layout. Observe the chosen game rules yourself; the lesson does not automatically referee the run.',
 'Improve the earliest weak transition before increasing layout difficulty.')
profile('safety', 'Defense, escapes, and recovery', 'defense-starter',
 'Compare attacking with leaving a difficult legal reply.',
 'Identify the legal first contact, a cue-ball hiding area, and the object-ball destination. Compare the attack with a safety from the same layout; inspect both final ball positions.',
 'Count legal contact and the required post-contact rail/pot condition separately from hiding the cue ball. From the opponent cue-ball position, check whether a direct legal target is blocked.',
 'Recreate the balls and specify the game rules. Play five safeties and inspect the opponent reply each time; an obstructed line alone does not establish a legal safety.',
 'Compare distance safety with a containing safety, then add a realistic escape test.')
profile('bank', 'Banks, kicks, and rail routes', 'bank-shot',
 'Send the object ball through a planned cushion contact toward a pocket.',
 'Use the bank reference as a starting estimate. Keep spin fixed, mark the first rail reference, and compare the object-ball rebound with the intended pocket route.',
 'Record rail reference and bank made/missed over five attempts. Note whether the rebound runs short or long.',
 'Copy the ball centers and identify the same rail point using diamonds. Start without added sidespin and adjust aim from observed rebounds.',
 'Change object-ball distance or speed individually, retaining the same target pocket.')
profile('kick', 'Banks, kicks, and rail routes', 'drill-mirror-kick',
 'Reach the legal target through a cushion route when direct access is blocked.',
 'Name the target and required rail sequence. Keep speed and sidespin consistent while adjusting only the first rail aim point. Check that the blocker is avoided.',
 'Record target first-contact, scratch, and the game-required rail/pot condition on five attempts. A target touch is a contact score, not automatically a legal shot.',
 'Copy the blocker and target. Identify the cushion-nose contact by diamond reference; reset all balls after each escape.',
 'Aim for four target contacts in five as a suggested practice goal, then change the starting diamond.')
profile('multi-rail', 'Banks, kicks, and rail routes', 'drill-two-rail-kick',
 'Plan a multi-cushion route as a sequence of observable rail contacts.',
 'Name every cushion in order. Mark the first aim reference, predict the second/third crossing, and keep speed and spin fixed. Correct the earliest wrong contact first.',
 'Record the rail sequence, target contact, and legal outcome separately for five attempts. Do not infer a specific diamond-system formula from an unlabeled starter.',
 'Use the printed diagram and diamond references. For a named system such as Corner-5, use the linked creator lesson for its exact numbering and spin convention.',
 'Test a second start only after the original route repeats; record each adjustment.')
profile('english', 'Spin, squirt, and cushion response', 'rail-spin',
 'Distinguish sidespin influence on the approach from its effect at a cushion.',
 'Start with no sidespin, restore, then compare equal left and right settings. Keep speed and the starting aim fixed for the first comparison; inspect the incoming and outgoing paths separately.',
 'Predict the change of rebound side before each comparison. On the physical table, record the rail arrival and finish for five shots at each setting.',
 'Use the rail layout and the same cushion reference. Establish a no-English baseline before compensating aim for sidespin.',
 'Add a target zone; then compare a second speed without changing the layout.')
profile('squirt', 'Spin, squirt, and cushion response', 'first-shot',
 'Recognize initial cue-ball deflection when using off-center contact.',
 'Keep the cue near level. Compare center, left, and right contact at the same aim and speed. Observe the initial cue-ball path before a cushion or collision; then test an aim correction.',
 'Predict the initial deflection side and identify the correction needed. Record contact accuracy for five physical trials, keeping the cue/shaft the same.',
 'Recreate a long approach. Observe initial departure separately from later curvature; use your own cue response rather than assuming the preset matches it exactly.',
 'Compare distances before introducing elevation and swerve.')
profile('swerve', 'Spin, squirt, and cushion response', 'first-shot',
 'Separate initial deflection from later cloth-induced curvature.',
 'Use a clear approach, small sidespin, and modest elevation. Compare the initial direction and later path at two speeds; change only one setting at a time.',
 'Identify initial deflection versus later curvature in three comparisons. Record whether the target contact shifts left or right.',
 'Use a permitted low-elevation setup with clear cue access. Observe the path from a consistent view or video; the simulator cannot diagnose delivery.',
 'Compare the same shot with a near-level cue before increasing elevation.')
profile('jump', 'Elevated shots and route choices', 'jump-obstacle',
 'Evaluate height at the obstacle, then landing and the continuation after landing.',
 'Enable 3D controls. Identify the blocker crossing, clearance, and landing before Execute Shot. Change elevation or speed individually; do not use peak height as the clearance test.',
 'In the simulator, record blocker avoided, target contacted, and landing inside a chosen zone separately. Missing clearance data is not evidence of clearance.',
 'For physical practice, first confirm the venue permits jumps and use a suitable jump cue and supervised technique. Copy ball positions; start with an easy separation and score clearance and landing separately.',
 'Compare a simpler kick first; reduce the landing zone only after consistent clearance.')
profile('masse', 'Elevated shots and route choices', 'blocked-route',
 'Compare a curved route around a blocker with a cushion alternative.',
 'Identify the lateral clearance needed. Change elevation, sidespin, or speed one at a time and inspect the whole curve, not just its endpoint.',
 'Record obstacle avoidance, legal target first-contact, and cue-ball finish separately. Compare with a kick on the same layout.',
 'Study the route on screen first. Attempt elevated curve shots only where permitted and with competent technique instruction; use a kick for ordinary physical practice if appropriate.',
 'Prefer the route you can repeat with the largest clearance margin.')
profile('calibration', 'Table observation and calibration', 'clear-speed',
 'Compare repeatable table behavior without confusing stroke changes with table changes.',
 'Use the defaults first. Save the baseline, repeat a simple shot, and record the pattern of differences. Advanced experiments change only one relevant parameter, then restore it.',
 'Retain a baseline and at least five physical observations. Check any adjustment on a second shot; one matching result does not validate all physics.',
 'Measure the cushion-nose playing dimensions. Match ball starts with the setup sheet and record travel/finish. Normal practice does not require changing friction or restitution.',
 'Keep separate baseline and experimental settings; do not tune a table from one inconsistent stroke.')
profile('collision', 'Contact, energy, and rotation', 'cut-shot',
 'Connect impact geometry and rotation with the motion of both balls.',
 'Hold the layout fixed. Compare a fuller and a thinner hit, observing both paths and speeds. For advanced parameter studies, save the baseline and change one collision parameter only.',
 'Predict which ball travels along the collision line and distinguish path changes from speed changes in three comparisons.',
 'Reproduce the cut without changing equipment mid-set. Record the object-ball result and cue-ball leave separately; precise spin transfer needs closer observation than the final leave alone.',
 'Compare no sidespin with a small sidespin input after the geometry baseline.')
profile('stats', 'Readouts and teaching tools', 'cut-shot',
 'Use a readout to check a specific prediction before executing.',
 'Name what the selected readout measures. Change the related aim, speed, or spin control only and compare the number with the drawn path. A dash means no reported result.',
 'For three adjustments, explain the direction of change and verify the corresponding simulated path. These readouts are predictions, not measurements of your physical attempts.',
 'Take the same layout to the table and compare observable outcomes: contact, rail crossing, pot, and finish. Log physical results separately from simulator values.',
 'Hide the readout, predict the outcome, then reveal it to check your reasoning.')
profile('meters', 'Readouts and teaching tools', 'first-shot',
 'Distinguish cue-ball-to-object-ball power from object-ball-to-pocket power.',
 'Keep aim and spin fixed. Reduce speed until the C or P meter is below its reference, then increase gradually. Execute to check contact and pocket arrival.',
 'Identify whether the cue ball reaches the target and whether the object ball reaches the pocket. Enough power is not proof of correct aim or a successful pot.',
 'Use the same shot and find the gentlest repeatable physical stroke that pockets the ball with a useful leave. Record pot and position separately.',
 'Compare a longer approach while keeping the target/pocket fixed.')
profile('markers', 'Readouts and teaching tools', 'three-zones',
 'Define a visible, measurable practice objective before shooting.',
 'Choose a target marker, position it, and name its size. Use the cue-ball center as the scoring point; compare the leave against the boundary.',
 'Record inside/outside for five attempts and keep the same marker size throughout the set. Shape/rotation changes the objective, not ball physics.',
 'Use flat cloth-safe references that do not obstruct balls. Recreate the target size and center from the setup sheet; keep the boundary definition consistent.',
 'Start generously and shrink only after repeatable success.')
profile('compass', 'Readouts and teaching tools', 'cut-shot',
 'Use an angle reference to explain a direction rather than assume it predicts the whole route.',
 'Place the compass at the contact region. Compare perimeter angle dots with the tangent, initial departure, and eventual rolling path. Rotate or resize it without changing the shot.',
 'Identify the reference angle before three trials and explain why roll, stun, or draw can produce different departures.',
 'Use diamond/visual angle references while standing. Compare the observed departure; the compass is a teaching aid rather than a physical measuring instrument.',
 'Repeat with another cut and distinguish initial and eventual direction.')
profile('layout', 'Layouts, repeatability, and review', 'position-two-balls',
 'Keep a repeatable starting arrangement so comparisons test one change.',
 'Save the layout, change one ball or setting, and recall the original. Check ball identities, positions, and intended pocket before comparing.',
 'Restore the same ball centers and reproduce the intended comparison. Distinguish ball-layout reset from a complete session/stroke-settings restoration.',
 'Use the coordinate sheet and a written record of the intended stroke. Mark or measure original ball centers and reset them between attempts.',
 'Save baseline and variation under different names; keep physical results with the matching setup.')
profile('review', 'Practice plans and benchmarks', 'progressive-target',
 'Use comparable results to decide what to practice next.',
 'Choose one saved layout and fixed scoring conditions. Record attempts, pots, position, and legal contact where applicable; note one repeatable error and one adjustment.',
 'Complete a baseline set and a later set under the same conditions. Report both, rather than only the best attempt; simulator repetition is not evidence of physical skill improvement.',
 'Use five or ten physical attempts with the same layout, zone, and cue. Record the date and conditions, then begin the next session with that baseline.',
 'Increase one difficulty factor only after consistent results; suggested targets are practice goals, not certified ratings.')
profile('routine', 'Physical fundamentals', 'first-shot',
 'Make planning and delivery a repeatable physical routine.',
 'While standing, choose pocket, route, and finish. Approach along the aim line, form a comfortable stance and bridge, rehearse smoothly, pause as needed, and deliver. Stand up and restart if the plan changes.',
 'Complete the same named sequence on five physical attempts. Record routine completed separately from potting; the simulator cannot observe your body or delivery.',
 'Use the straight-shot layout. Have a partner observe or record video, then review consistency of the routine rather than copying a prescribed body shape.',
 'Keep the same routine when moving from straight shots to cuts.')
profile('stance', 'Physical fundamentals', 'first-shot',
 'Build comfortable balance and cue clearance while maintaining the chosen line.',
 'Plan while standing. Approach the shot, place your feet comfortably, and check that your body stays steady and the cue can move freely. Rise and realign if needed.',
 'Across five easy shots, record stable balance and unobstructed cue movement separately from potting. This is a physical checklist, not a simulator score.',
 'Recreate the straight shot and observe from side/front video or with a coach. Adapt stance to your body; no single foot position is required.',
 'Test a second table position without losing balance or cue clearance.')
profile('bridge', 'Physical fundamentals', 'first-shot',
 'Support a repeatable cue line with a stable bridge.',
 'Form a comfortable open or closed bridge on clear cloth. Rehearse slowly and check the hand remains still while the cue moves freely. Keep the bridge distance comfortable and consistent.',
 'Count five attempts with a stable bridge and smooth cue travel. Record hand movement separately from the shot result.',
 'Practice at the physical table with a coach, partner, or video. The on-screen cue does not model hand support or bridge stability.',
 'Try a rail bridge only after the clear-cloth bridge is comfortable.')
profile('stroke', 'Physical fundamentals', 'first-shot',
 'Deliver the cue through the intended tip contact with a relaxed grip.',
 'Choose center contact on an easy straight shot. Rehearse smoothly without squeezing or steering, then deliver through the ball while keeping the bridge stable.',
 'Record five attempts for intended contact, relaxed delivery, and pot separately. Use observation or video; a simulated pot cannot validate a physical stroke.',
 'Use the straight-shot diagram and a striped practice ball if available to inspect unintended spin. Ask a coach to review persistent delivery errors.',
 'Increase distance only after delivery stays repeatable.')
profile('access', 'Physical fundamentals', 'first-shot',
 'Include physical cue access and reach when judging whether a route is practical.',
 'Compare a clear-cloth cue-ball start with a rail-adjacent start. Identify bridge support, cue clearance, reach, and elevation before choosing the stroke.',
 'Explain which stroke can actually be delivered from each position. A simulated clear path alone does not establish physical cue access.',
 'Inspect the actual cue approach and use a mechanical bridge when needed. Do not stretch into an unstable stroke; compare a simpler accessible route.',
 'Add one nearby object ball and reassess cue clearance before planning position.')
profile('interface', 'Using the trainer', '',
 'Use this control deliberately while keeping the intended practice state clear.',
 'Read the control description, identify what it changes, and try the operation once. Check the resulting state before continuing.',
 'The intended operation completes and you can state what changed. This is an interface check, not a scored pool drill.',
 'Use the linked skill lesson or saved setup for physical practice. This software operation has no independent physical-shot score.',
 'Return to a skill lesson and use the control only when it helps the objective.')

EXACT = {}
def assign(key, ids):
    for id in ids.split():
        if id in EXACT: raise ValueError('Duplicate mapping '+id)
        EXACT[id] = key
assign('aim', 'aiming-line-quick ghost-ball-quick pocket-targeting-quick contact-point-geometry-quick ghost-ball-geometry-quick practice-aiming-quick exercise-straight-shot-ladder first-session-aiming')
assign('cut', 'cut-angle-geometry-quick ball-overlap-quick practice-cut-angles-quick exercise-change-one-ball live-stats-contact-aim-quick live-stats-cut-angle-quick live-stats-overlap-quick exercise-live-stats-cut-overlap')
assign('stop', 'practice-stop-shot-quick drill-stop-shot practice-speed-contact-baseline')
assign('follow', 'physics-follow-quick practice-follow-shot-quick')
assign('draw', 'physics-draw-quick practice-draw-shot-quick first-session-speed')
assign('stun', 'tangent-line-quick tangent-line-geometry-quick physics-stun-quick practice-tangent-line-quick drill-stun-tangent ninety-degree-rule-quick')
assign('roll', 'natural-roll-quick thirty-degree-rule-quick')
assign('speed', 'shot-speed-controls-quick shot-speed-fine-adjustment-quick physics-shot-speed-quick practice-speed-control-quick exercise-speed-ladder drill-speed-ladder')
assign('position', 'practice-position-play-quick practice-shot-two-quick first-session-shot-two exercise-three-position-zones practice-target-landing drill-wagon-wheel')
assign('pattern', 'exercise-three-ball-runout drill-l-pattern drill-t-pattern practice-rock-around-clock cue-ball-traffic-quick pattern-play-quick final-ball-backward-planning-quick problem-balls-quick route-selection-quick position-recovery-quick runout-quality-quick')
assign('rack', 'first-session-extend-runout exercise-layout-runout-review exercise-full-rack-review exercise-full-rack-training exercise-runout-improvement continuous-runout-master-quick two-shot-execution-quick continuous-runout-quick runout-improvement-quick full-runout-review-quick runout-decision-review-advanced')
assign('safety', 'defensive-cue-ball-route-quick safety-play-quick safety-escape-quick')
assign('bank', 'bank-shot-geometry-quick mirror-aiming-quick practice-bank-shots-quick')
assign('kick', 'kick-shot-geometry-quick practice-kick-shots-quick practice-one-rail-kick drill-mirror-kick')
assign('multi-rail', 'multiple-rail-routes-quick practice-two-rail-kick practice-corner-five drill-two-rail-kick drill-two-rail-recovery')
assign('english', 'rail-english-geometry-quick physics-english-quick exercise-rail-english practice-english-quick')
assign('squirt', 'cue-ball-squirt-quick exercise-squirt-comparison live-stats-squirt-quick')
assign('swerve', 'cue-ball-swerve-advanced')
assign('jump', 'jump-height-quick jump-obstacle-clearance-quick jump-landing-point-quick jump-trajectory-quick physics-jump-clearance-quick physics-jump-landing-quick jump-model-limitations-advanced exercise-jump-clearance exercise-jump-landing live-stats-jump-clearance-quick')
assign('masse', 'masse-shot-controls-quick masse-physics-quick masse-versus-jump-advanced exercise-masse-route exercise-jump-kick-masse obstacle-route-choice-quick live-stats-masse-quick')
assign('calibration', 'physics-calibration-overview-quick physics-calibration-intro-quick calibration-expectations-advanced rolling-friction-quick sliding-friction-quick exercise-table-speed exercise-table-speed-calibration-variation exercise-sliding-friction table-geometry-calibration-quick physics-measurements-quick real-table-calibration-quick one-variable-calibration-quick calibration-notes-quick exercise-calibration-real-table calibration-table-ball-dimensions-quick calibration-friction-restitution-advanced calibration-jump-physics-controls-advanced')
assign('collision', 'collision-line-quick ball-collision-quick collision-restitution-advanced spin-transfer-advanced rolling-sliding-comparison-advanced')
assign('stats', 'live-stats-overview-quick live-stats-shot-one-quick live-stats-first-ball-quick live-stats-first-event-quick live-stats-tip-location-quick live-stats-contact-travel-quick live-stats-cue-flight-quick live-stats-power-pocket-quick live-stats-power-feel-quick live-stats-ball-speeds-advanced exercise-live-stats-speed-spin')
assign('meters', 'cue-ball-pocket-power-meters-quick exercise-cue-pocket-threshold live-stats-cp-meter-cross-reference-quick')
assign('markers', 'table-markers-quick marker-resizing-quick marker-rotation-quick')
assign('compass', 'compass-tool-intro-quick compass-rotate-size-quick compass-reference-advanced')
assign('layout', 'practice-layout-quick exercise-save-recall-layout practice-undo-history-quick first-session-undo first-session-execute')
assign('review', 'practice-session-introduction practice-progressive-benchmark exercise-focused-practice-session exercise-practice-review structured-practice-intro-quick')
assign('bank', 'exercise-geometry-route-comparison bank-kick-overview-quick')

NEW = [
 ('fundamentals-pre-shot-routine', 'A repeatable pre-shot routine', 'routine'),
 ('fundamentals-balanced-stance', 'Comfortable stance and cue clearance', 'stance'),
 ('fundamentals-stable-bridge', 'A stable bridge', 'bridge'),
 ('fundamentals-grip-and-delivery', 'Relaxed grip and straight delivery', 'stroke'),
 ('fundamentals-cue-access', 'Reach, rail bridges, and cue access', 'access'),
]
PROMOTE = {
 'pattern-play-quick':'exercises', 'final-ball-backward-planning-quick':'exercises',
 'problem-balls-quick':'exercises', 'route-selection-quick':'exercises',
 'position-recovery-quick':'exercises', 'safety-play-quick':'exercises',
 'safety-escape-quick':'exercises', 'runout-quality-quick':'exercises',
 'ninety-degree-rule-quick':'fundamentals', 'thirty-degree-rule-quick':'fundamentals',
 'natural-roll-quick':'fundamentals', 'compass-tool-intro-quick':'physics',
 'table-markers-quick':'physics',
}
def classify(t):
    id = t['id']; text = id.lower()
    if id in EXACT: return EXACT[id]
    if 'scratch-avoidance' in text: return 'position'
    if 'stop-follow-draw' in text: return 'stop'
    if 'jump-masse' in text or 'elevation' in text or 'airborne' in text or 'bed-' in text: return 'jump'
    if 'squirt' in text or 'shaft' in text or 'end-mass' in text: return 'squirt'
    if 'masse' in text or 'curve' in text: return 'masse'
    if 'jump' in text or 'clearance' in text or 'flight' in text: return 'jump'
    if 'marker' in text or 'target-diameter' in text or 'choose-circle' in text or 'choose-square' in text or 'choose-triangle' in text: return 'markers'
    if 'compass' in text: return 'compass'
    if 'power-meter' in text: return 'meters'
    if 'stats-' in text or 'live-stats' in text: return 'stats'
    if 'tangent' in text: return 'stun'
    if 'ghost' in text or 'aim' in text or 'overlap' in text: return 'aim'
    if 'bank' in text: return 'bank'
    if 'kick' in text: return 'kick'
    if 'english' in text or 'side-spin' in text: return 'english'
    if 'follow' in text or 'draw' in text or 'tip' in text: return 'follow'
    if 'friction' in text or 'restitut' in text or 'damping' in text or 'table-preset' in text or 'ball-diameter' in text or 'playing-table' in text or 'calibration' in text: return 'calibration'
    if 'speed' in text: return 'speed'
    if 'rail-contact' in text or 'diamond' in text or 'incidence' in text or 'cushion' in text or 'rail-rebound' in text or 'rail-speed' in text: return 'bank'
    if 'shot-two' in text or 'shot-2' in text or 'leapfrog' in text: return 'position'
    if 'runout' in text or 'rack' in text: return 'rack'
    if 'layout' in text or 'saved' in text or 'save-' in text or 'restore' in text or 'reset-' in text or 'undo' in text or 'ball-placement' in text or 'ball-move' in text or 'ball-return' in text or 'add-' in text or 'remove-' in text or 'random' in text: return 'layout'
    return 'interface'

def build():
    pool=read('pool-audio-map.json'); topics={t['id']:dict(t) for t in pool['topics']}
    for r in read('recorded-audio.json')['records']:
        if r['page'] in ['Main','Shared']: topics[r['topic']['id']]={**topics.get(r['topic']['id'],{}),**r['topic']}
    setups=read('practice-layouts.json'); tour=read('get-started-tour.json')
    layout_objectives={}
    for d in read('Practice-Drill-Layouts.json')['drills']:
        if d.get('target_pocket'):
            across,length=d['target_pocket'];layout_objectives[d['id']+'.billiards.json']=dict(pocket=[length/8,across/4],target=1)
    for id,pocket in {'first-shot':[1,1],'cut-shot':[.5,1],'position-two-balls':[.5,1],'three-ball':[.5,1],'three-zones':[.5,1],'progressive-target':[.5,1],'defense-starter':[1,1],**{'straight-distance-'+str(i):[1,1] for i in range(1,4)}}.items():
        layout_objectives[id+'.billiards.json']=dict(pocket=pocket,target=1)
    for i,s in enumerate(tour['steps']):
        if i!=5: layout_objectives[s['layout'].split('/')[-1]]=dict(pocket=s['pocket'],target=s['target'])
    start=[t for t in topics.values() if t.get('category')=='start']
    for t,s in zip(start,tour['steps']):
        setups['topics'][t['id']]=[dict(title=s['title'],url=s['layout'],note='Get Started snapshot; physical setup sheet uses its starting positions, including the saved before-shot state in Undo practice.')]
    original_ids=set(topics)
    for id,title,key in NEW:
        p=PROFILES[key];EXACT[id]=key
        topics[id]=dict(id=id,title=title,category='fundamentals',level=0,summary=p['purpose'],text=p['instruction']+' '+p['transfer'],audio=None,recordingStatus='pending',explorerOnly=False,resources=[dict(title='Dr. Dave — physical fundamentals',url='https://drdavepoolinfo.com/tutorial/fundamentals/')])
    ids=set(pool['assignments'].values())|set(pool['sections'].values())|set(pool['canvasTopics'])|{pool['powerMeterTopic']}
    catalog={}; audit=[]
    for id,t in topics.items():
        pkey=classify(t);p=PROFILES[pkey]; oldcat=t.get('category','reference')
        category=PROMOTE.get(id,oldcat)
        hidden=oldcat in ['reference','explore'] or (oldcat not in ['start','reference'] and id in ids)
        visible=not hidden or id in PROMOTE or id not in original_ids
        entries=setups['topics'].get(id,[])
        # Reference controls keep their actual operation text; do not attach a
        # random shot to e.g. deletion, player scoring, or audio transport.
        if not entries and p['setup'] and (visible or oldcat=='explore'):
            entries=[setups['layouts'][p['setup']]]
        entries=[{**entry,**layout_objectives.get(entry['url'].split('/')[-1],{})} for entry in entries]
        purpose=p['purpose']
        instruction=p['instruction']
        if pkey=='interface' or oldcat=='reference':
            purpose='Use '+t['title'].rstrip('.')+' correctly within the current lesson.'
            instruction=t.get('text') or p['instruction']
        card=dict(title=t['title'],category=category,group=p['group'],profile=pkey,visible=visible,
                  purpose=purpose,instruction=instruction,success=p['success'],transfer=p['transfer'],
                  progression=p['progression'],setups=entries,
                  kind='tool' if oldcat in ['reference','explore'] and id not in PROMOTE else 'lesson')
        # Keep existing numeric targets and coordinate detail; the added card
        # supplements them rather than silently contradicting recorded targets.
        card['existingPractice']=t.get('practice',{})
        card['physicalCheck']=pkey in ['routine','stance','bridge','stroke','access']
        if id=='get-started-explore':
            card.update(purpose='Find a lesson, inspect a control, then return to active practice.',instruction='Use Guide to choose a learning objective. Turn Explorer on and tap one control to hear its explanation; turn Explorer off before operating the table.',success='Explain one inspected control and use it after leaving Explorer. This is an orientation check.',transfer='Choose a skill lesson and use its setup sheet for the physical attempt; Explorer itself is not a physical drill.')
        if id=='first-session-welcome':
            card.update(purpose='Connect the first pot with the cue-ball leave.',instruction='Name the intended pocket and next ball. Execute the prepared shot, then inspect whether the next shot is available.',success='Identify the potted ball and describe the leave; repeat once with a prediction before shooting.')
        if id=='drill-scratch-avoidance':
            card.update(purpose='Move the cue-ball route away from the side-pocket scratch line.',instruction='Load the drill and identify the side pocket and red danger marker. Compare the baseline route with one small speed or tip-height change. Reset between comparisons.',success='Record pot, scratch avoided, and useful leave separately over five attempts. A no-scratch miss is not a successful pocket-and-position result.')
        if id=='practice-target-landing': card['success']='Use the existing target size chosen for this plan. Count only a pot plus cue-ball center inside the target. The narrated goal is 8 of 10; begin with a larger zone if needed.'
        if id=='practice-rock-around-clock': card['success']='Use the linked creator layout for its exact sequence. For the Trainer adaptation, record one completed rotation first, then work toward the narrated three consecutive rotations without disturbing another ball.'
        if id=='exercise-focused-practice-session': card['success']='Record each phase separately: target landing, pattern rotation, and legal kick contacts. Keep the existing 30/45/30-minute plan; shorten by choosing one phase rather than claiming a full session.'
        if id in ['exercise-stop-follow-draw','exercise-physics-stop-follow-draw']:
            card.update(purpose='Distinguish stop, forward travel, and return on one straight shot.',instruction='Keep balls and pocket fixed. Test a stop, restore, test follow, restore, then test draw. Change tip height first; adjust speed separately if needed.',success='Predict all three departure directions. Score five pots and the intended stop/follow/draw result separately for each stroke.')
        if id in ['drill-l-pattern','drill-t-pattern']:
            card['instruction']='Load the exact drill. Use the existing narrated ball order and pocket restrictions. Before each stroke, name the next ball, pocket, and useful position zone; play from the actual leave.'
            card['success']='Record balls cleared in the prescribed sequence, first position loss, and unintended contacts. Keep the original narration restrictions; reset only at the end of an attempt.'
        if id=='drill-wagon-wheel': card['success']='Use the six existing colored targets one at a time. Record the pot and cue-ball center in the named target separately for each spoke; reset the starting balls between attempts.'
        if id=='drill-speed-ladder': card['success']='Use the four existing target zones in order. Record the cue-ball center inside/outside each named zone; reset to the original cue-ball start for every attempt.'
        if id=='drill-stop-shot': card['success']='Keep the existing three-inch white target. Record the pot and cue-ball center inside the circle separately on five attempts. The circle is behind the object-ball center at the cue-ball impact position.'
        if id=='drill-two-rail-recovery':
            card.update(purpose='Pocket the object ball and return through two cushions toward the center target.',instruction='Use the existing narrated pocket and rail sequence. Keep the potting line fixed and compare the cue-ball route through the two cushions toward the marked center region.',success='Record the pot, intended two-cushion sequence, scratch avoided, and cue-ball center inside the target separately over five attempts.',transfer='Reproduce the object ball, cue ball, and center target from the setup sheet. Play the pot and two-cushion position route; reset both balls after each attempt.')
        if id=='bank-kick-overview-quick': card.update(purpose='Distinguish which ball reaches a cushion first in a bank versus a kick.',instruction='Compare a bank starter with a kick starter. Name the moving ball that reaches a cushion before the target pocket or object-ball contact.',success='Correctly identify bank versus kick on both layouts, then trace each cushion route before execution.')
        if id=='exercise-geometry-route-comparison': card.update(purpose='Compare direct, bank, and kick geometries with their different objectives.',instruction='Use the three existing starters in order. Name the direct pocket line, object-ball bank cushion, and cue-ball kick cushion. Reset each starter before a variation.',success='Identify which ball contacts the cushion in each route. Score potting for direct/bank trials and legal target contact separately for kick trials.')
        if id=='first-session-undo': card['instruction']='The prepared table opens after a saved miss. Use Undo Last Shot, inspect the restored pre-shot aim, make one correction, and Execute Shot. Use the setup sheet for the BEFORE-shot ball centers.'
        catalog[id]=card
        # Baseline is a source inspection inventory, not a keyword-generated
        # claim of instructional quality or physical validation.
        audit.append(dict(id=id,title=t['title'],categoryBefore=oldcat,categoryAfter=category,
             source='new physical fundamentals' if id not in original_ids else 'merged Main/Shared catalog',
             narration=t.get('text',''),existingPractice=t.get('practice',{}),
             setupBefore=[s['url'] for s in read_setups.get(id,[])],
             setupAfter=[s['url'] for s in entries],
             action='Add physical fundamentals checklist' if id not in original_ids else 'Surface existing strategy/tool lesson and add four criteria' if id in PROMOTE else 'Retain narration; add explicit four-criterion practice card',
             baselineEvidence={'purpose':t.get('summary') or t.get('text','').split('. ')[0],
                 'instruction':t.get('text',''),
                 'success':t.get('practice',{}).get('Measure') or t.get('practice',{}).get('Targets') or 'Outcome may be described in narration; no separate success field.',
                 'transfer':'Portable starter present' if read_setups.get(id) else 'No topic-specific portable starter in the original practice manifest.'},
             validation='Source and file review only; physical performance has not been tested.'))
    paths=[
      ('Get Started', [t['id'] for t in start]),
      ('Physical fundamentals', [x[0] for x in NEW]),
      ('Aim and contact', ['ghost-ball-geometry-quick','cut-angle-geometry-quick','ball-overlap-quick','practice-aiming-quick','exercise-straight-shot-ladder']),
      ('Cue-ball control', ['drill-stop-shot','physics-follow-quick','physics-draw-quick','exercise-stop-follow-draw','drill-speed-ladder','practice-target-landing']),
      ('Natural angles', ['ninety-degree-rule-quick','drill-stun-tangent','natural-roll-quick','thirty-degree-rule-quick','drill-wagon-wheel']),
      ('Rails and spin', ['practice-bank-shots-quick','practice-one-rail-kick','practice-two-rail-kick','practice-corner-five','exercise-rail-english','exercise-squirt-comparison']),
      ('Position and patterns', ['practice-position-play-quick','practice-shot-two-quick','exercise-three-position-zones','pattern-play-quick','final-ball-backward-planning-quick','problem-balls-quick','drill-l-pattern','drill-t-pattern','practice-rock-around-clock']),
      ('Defense and recovery', ['route-selection-quick','position-recovery-quick','safety-play-quick','safety-escape-quick','drill-scratch-avoidance']),
      ('Physics and teaching tools', ['table-markers-quick','compass-tool-intro-quick','live-stats-contact-aim-quick','exercise-cue-pocket-threshold','one-variable-calibration-quick','exercise-calibration-real-table']),
      ('Advanced route study', ['exercise-jump-clearance','exercise-jump-landing','exercise-masse-route','exercise-jump-kick-masse']),
      ('Runouts and practice review', ['exercise-three-ball-runout','exercise-full-rack-review','exercise-runout-improvement','practice-progressive-benchmark','exercise-focused-practice-session','exercise-practice-review']),
    ]
    if (G/'topic-scenes.json').exists():
        for id,scene in read('topic-scenes.json')['topics'].items():
            if id in catalog:catalog[id]['setups']=[scene['setup']];catalog[id]['sceneId']=id
    write('learning-catalog.json',dict(version=1,criteria=['Purpose','Instruction','Success','Transfer'],
      notes='Supplemental written practice cards; existing MP3 narration is unchanged. Suggested scores are practice goals. Physical results are recorded by the student.',
      paths=[dict(title=k,topics=v) for k,v in paths],newTopics=[topics[x[0]] for x in NEW],topics=catalog))
    write('LEARNING_AUDIT.json',dict(version=1,scope='Every merged Main/Shared topic, including Get Started, lessons, Explorer descriptions, category welcomes, and resources.',
        counts=dict(total=len(audit),existing=len(original_ids),newPhysicalFundamentals=len(NEW),byCategory=dict(Counter(c['category'] for c in catalog.values()))),topics=audit))
    counts=Counter(c['profile'] for c in catalog.values() if c['visible'] and c['category'] in ['fundamentals','physics','drills','exercises'])
    print(json.dumps(dict(topics=len(catalog),profiles=counts,originals=len(original_ids),new=len(NEW)),indent=2))

read_setups=read('practice-layouts.json')['topics']
if __name__=='__main__': build()
