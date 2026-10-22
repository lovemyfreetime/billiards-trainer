'use strict';
// Original general coaching guidance. No source diagrams, coordinates or solutions.
const principles=[
  {
    "id": "continuation",
    "title": "Evaluate the next transition, not just the next pot.",
    "apply": "When choosing a leave, assess the next legal ball and its route to the following ball.",
    "exceptions": "A straight leave may be desirable for a stop-shot sequence or the final ball.",
    "check": "Which feasible angle on the next ball supports the following transition?",
    "sourcePages": [
      36,
      154
    ],
    "origin": "source-informed generalization"
  },
  {
    "id": "backward",
    "title": "Work backward from a constrained transition.",
    "apply": "Identify restricted pockets, blockers and difficult transfers; derive useful approach regions and preceding angles.",
    "exceptions": "Backward geometry suggests candidates; forward simulation must check reachability and all moving balls.",
    "check": "Can earlier shots actually reach that region legally?",
    "sourcePages": [
      154,
      156
    ],
    "origin": "source-informed generalization"
  },
  {
    "id": "side-of-line",
    "title": "Preserve the useful side of the object-ball-to-pocket line.",
    "apply": "Determine the side relative to the selected pocket and intended continuation, using actual coordinates.",
    "exceptions": "There is no universally correct left/right side; another pocket or route can reverse the preference.",
    "check": "Does short or long speed error cross into an unhelpful angle?",
    "sourcePages": [
      32,
      34,
      368
    ],
    "origin": "source-informed generalization"
  },
  {
    "id": "window",
    "title": "Prefer a usable position region over a precise point.",
    "apply": "Compare the range of resulting leaves that preserve a legal pot and useful continuation.",
    "exceptions": "A large drawn circle is not evidence of tolerance; blockers can split nearby positions into different outcomes.",
    "check": "Have variations been tested, or is the region only proposed?",
    "sourcePages": [
      26,
      28
    ],
    "origin": "source-informed generalization"
  },
  {
    "id": "entry-direction",
    "title": "Compare entering along a useful region with crossing it.",
    "apply": "Consider whether the cue-ball travel direction preserves the useful angle over a range of stopping distances.",
    "exceptions": "An along-window route can still pass a pocket or blocker; do not prefer it solely for alignment.",
    "check": "What happens if the cue ball stops short or travels farther?",
    "sourcePages": [
      26,
      32
    ],
    "origin": "source-informed generalization"
  },
  {
    "id": "rails",
    "title": "Use cushions when they improve control and access.",
    "apply": "Compare direct and cushion-assisted routes for useful angle, speed tolerance and total risk.",
    "exceptions": "More rails are not automatically better; rail calibration, spin and jaw proximity affect the result.",
    "check": "Does the rail route earn its extra travel and sensitivity?",
    "sourcePages": [
      28,
      30,
      40
    ],
    "origin": "source-informed generalization"
  },
  {
    "id": "natural-angle",
    "title": "Let an appropriate angle provide cue-ball movement.",
    "apply": "When outcomes are comparable, prefer a controllable stroke to forcing movement from an unsuitable angle.",
    "exceptions": "Soft is not always safe; sufficient speed or spin may be necessary. Do not transfer qualitative advice into invented settings.",
    "check": "Is the demand caused by a poor previous leave?",
    "sourcePages": [
      30,
      40
    ],
    "origin": "source-informed generalization"
  },
  {
    "id": "stroke-access",
    "title": "Check distance and physical stroke access.",
    "apply": "Consider rail proximity, bridging over balls, cut difficulty and required cueing in the next leave.",
    "exceptions": "Near a rail may preserve an excellent angle; distance alone does not establish quality. A top view cannot diagnose technique.",
    "check": "Can the needed stroke plausibly be delivered from the leave?",
    "sourcePages": [
      34,
      152
    ],
    "origin": "source-informed generalization"
  },
  {
    "id": "problem-balls",
    "title": "Resolve dependencies before removing useful options.",
    "apply": "In games with order choice, identify restricted balls and pocket access; choose an order that preserves a finish.",
    "exceptions": "Do not always shoot the hardest ball first. In rotation games the lowest-ball rule constrains first contact.",
    "check": "Does removing this ball help or damage later access?",
    "sourcePages": [
      250,
      356,
      370
    ],
    "origin": "source-informed generalization"
  },
  {
    "id": "key-ball",
    "title": "Plan the finishing transition in games with order choice.",
    "apply": "Choose a feasible final object ball before the winning ball and preserve a useful approach to it.",
    "exceptions": "A convenient-looking key ball is insufficient if preceding shots cannot reach it. Confirm game and group.",
    "check": "Does the complete proposed order preserve a feasible finish?",
    "sourcePages": [
      254
    ],
    "origin": "source-informed generalization"
  },
  {
    "id": "path-risk",
    "title": "Evaluate the entire cue-ball path for danger.",
    "apply": "Inspect pocket-mouth and jaw approaches, scratches, blockers and unintended collisions, not only the endpoint.",
    "exceptions": "A close approach is a warning, not proof of a scratch. Compare alternatives and perturbations before assigning risk.",
    "check": "Could small execution changes produce a scratch or blocked continuation?",
    "sourcePages": [],
    "origin": "Jeff discussion and application evidence policy"
  },
  {
    "id": "evidence",
    "title": "Separate reasoning from verified outcomes.",
    "apply": "Only recorded tool results support tested claims. Report depth checked, evidence limits and missing alternatives.",
    "exceptions": "A successful nominal shot is not a robust route, and independent current-table previews do not verify a sequence.",
    "check": "Which exact result supports each claimed pot, leave and continuation?",
    "sourcePages": [],
    "origin": "Jeff discussion and application evidence policy"
  }
];
const instruction=`POSITION PLAY COACHING v1. These are conditional decision aids, not a solver or proof of a runout. Use only principles relevant to the player's request. Do not recite the checklist unless asked. Explain the decisive tradeoff briefly, respect intuitive player cues, and do not force technical analysis on casual practice.
${principles.map(p=>`${p.id}: ${p.apply} Limits: ${p.exceptions} Check: ${p.check}`).join('\n')}
For a runout request, establish the game if missing, identify the constrained transition, propose alternatives, and inspect the full path and continuation. Use actual available tools before claiming simulation. If tools cannot chain, describe the full pattern as provisional and state precisely which opening was checked. Do not invent numerical risk scores, guarantees, or exact spin/speed for untested later shots. A concern raised by a player warrants reinspection, not automatic agreement or automatic retraction of genuine tool evidence.`;
module.exports={version:'position-play-v1',principles,instruction};
