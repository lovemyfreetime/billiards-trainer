# Finished systems and commercial runout-planner search

Research date: 2026-10-07. This supplements live-hint-planner-source-audit.md.
Scope: public product documentation, release histories, app-store listings, research papers, and availability/integration information. No application was installed or functionally tested, no purchase made, and no developer contacted. Documented product features are not independently validated accuracy claims.

## Decision

The initial repository-only search was too narrow. Released products now document capabilities close to the requested live planner. Prioritize investigating FusionCue and CueSim before committing to a complete independent implementation. Distinguish existence, demonstrated quality, and availability for integration: the first has strong documentary support; the latter two remain open.

## Closest product: FusionCue

[Instant Recall manual](https://www.fusioncue.com/docs/instant-recall/)
[Download](https://fusioncue.com/download/)
[Hardware](https://www.fusioncue.com/docs/hardware-you-need/)
[Phone remote](https://www.fusioncue.com/docs/phone-remote/)

The manual documents Show Run-out, lowest-ball-first rack planning, cue-ball route and landing zone, tip position/stroke instructions, and replanning after balls actually settle. Another Way supplies an alternative and replans its continuation. This is the strongest documented match to the requested workflow.

Runs on a Windows PC with camera/projector hardware. Android/iOS browser devices operate as remotes; this is not evidence of a standalone Android planning engine. Download is available; download page describes early access. Documentation establishes a product workflow but does not establish reliable full-rack performance, true search depth, response time, or mathematical optimality.

[License](https://www.fusioncue.com/eula/) limits ordinary use and expressly restricts extraction and competing-product uses. No public planner SDK/API or source release was located. Embedding its planner would require a separate agreement.
[Developer contact](https://www.fusioncue.com/contact/).

## Closest browser product: CueSim

[Product](https://cuesim.app/)
[Help](https://cuesim.app/help/)
[Release history](https://cuesim.app/version-history/)
[Terms](https://cuesim.app/terms/)

The help documents a practice-table Recommend button, one/two/three-shot lookahead, ranked candidates that load aim/power/spin, and repeated recommending/shooting through Auto-play. Nine/ten-ball are documented alongside eight-ball. This fits the current software-only trainer evaluation better than camera hardware.

Recommender is documented for practice, hidden during racks/challenges. Three-shot depth is documented, not the requested four. Browser/mobile support is claimed; actual Windows/Android performance remains untested. Some physics explanations and rule choices deserve checking rather than acceptance as authoritative billiards instruction.

Terms identify Entrinsic Ltd and a personal noncommercial use license; they restrict copying, automated extraction, reverse engineering and ML uses without permission. Help offers a contact route for permissions/commercial use. No public planner API was located.

Do not confuse cuesim.app with giuschio/cue-sim-public: the latter describes a Python Gymnasium environment with normalized direction-only actions. No affiliation was established.

## Released phone products

### CuePro: Pool Shot Advisor
[Developer App Store listing](https://apps.apple.com/us/app/cuepro-pool-shot-advisor/id6787765324)

Lists full-rack planning, next-ball position, spin guidance, multiple shot choices and eight/nine/ten-ball modes. Free three-ball runouts offer a limited product evaluation; full-rack features are in Pro. The listing identifies Jesse DE LA ROSA as developer and a September 19 version 1.2.0. These are vendor claims, not audited algorithms. Available listing is iPhone/iPad; no Windows/Android version or integration SDK was verified.

### AimCue
[Developer App Store listing](https://apps.apple.com/us/app/aimcue-ai-billiards-coach/id6796794510)

Documents power/tip/aim guidance, next-ball leave scoring, repeated simulated outcomes displayed as a landing cloud, and user-result calibration. Strong conceptual overlap with tolerance zones. Listing does not establish rolling four-shot planning. iPhone listing; no reusable engine verified.

### AimPool
[Developer App Store listing](https://apps.apple.com/us/app/aimpool-billiards-shot-coach/id6789332083)

Version 0.7 release notes claim next-shot position planning with pace/tip choice and banks/kicks. Main description still says automatic recommendations are direct-route-only and English/jaw behavior experimental. This conflict prevents treating it as a verified mature full planner. Requires direct developer clarification or product testing.

## Established training products that serve a different role

[ICATS Pattern Breakdown](https://www.icatraining.com/pattern-breakdown) presents authored runout drills, cueing instructions and landing targets. Users and instructors create the patterns. [Target Practice](https://www.icatraining.com/target-practice) provides a database of layouts and solutions filterable by speed, English, rails and difficulty. This is strong evidence that the teaching presentation is practical, but not evidence of an automatic solver for arbitrary changing racks.

[Projection Pro Billiards](https://projectionprobilliards.com/) documents projected layouts, drills and ghost-ball guidance. No arbitrary-layout live runout optimizer was verified.

[DrillRoom](https://www.drillroom.ai/features.html) documents drill creation, outcome tracking, cue-ball end regions and analytics. No four-shot speed/English planner was verified.

[Billiard Shot Studio](https://billiardshotstudio.com/) is a shot simulation/teaching reference. No automatic full-rack planning claim was verified in the inspected page.

## Working game and research systems

[Virtual Pool 4](https://store.steampowered.com/app/336150/Virtual_Pool_4/) is a released complete game with AI opponents. Its existence is clear; public documentation examined does not establish a reusable runout-advice engine or its lookahead depth. [Celeris product page](https://vponline.celeris.com/product). Treat as a possible vendor conversation, not an available SDK.

[Deep Green, original IEEE article](https://drdavepoolinfo.com/physics_articles/Greenspan_IEEE_08_article.pdf) documents an actual integrated robotic pool system. The authors describe better-than-amateur performance at publication, not the unbeatable performance in some press coverage. Working research systems existed; consumer packaging and accessible code are separate questions.

PickPocket and CueCard were competition-playing systems, not merely proposals. Their papers remain relevant, but a complete supported planner distribution was not located.

[pix2pockets paper](https://arxiv.org/html/2504.12045v1) reports an algorithmic baseline with 94.7% shot success and 30% full-game clearance in its experimental setting. Actions are angle/power; these results are not proof of real-table performance or English-aware four-shot coaching. This provides an experimental benchmark lead, not a finished general coaching product.

## Recommended next investigation

1. Prioritize CueSim for software-only suitability and FusionCue for closest documented live runout workflow.
2. Establish whether either vendor offers a separately licensed planner, API, SDK, or partnership. The desired interface is full ball state + physics/rules -> target/pocket + stroke + predicted state + tolerance zone.
3. Clarify search depth versus sequential one-shot replanning, how all blockers enter the calculation, handling of accidental collisions, and whether speed/English are optimized together.
4. Arrange a permitted demonstration on chosen layouts: easy pot/bad leave, moved blocker, narrow position window, side-spin rail route and a four-ball rotation finish. Separate output quality from marketing descriptions.
5. Request device performance and calibration evidence. A downloadable application proves availability, not reliability or suitability for our app.
6. If no integration is offered, use the open research as the basis for an independently implemented planner. Do not assume a consumer license provides source or redistribution rights.

No hint-engine implementation was started during this search.
