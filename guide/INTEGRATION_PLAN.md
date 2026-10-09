## RECOVERED FUNCTIONAL CHECKPOINT — AUTOPLAY PREVIEW

The later working standalone `Billiards_Guide_Autoplay_Preview/Guide_Preview.html` has been recovered from prior generated artifacts alongside the original approved `Billiards_Guide_Layout_Preview.html`. Both plus the complete 253-MP3 library are preserved together in `Billiards_Guide_Approved_Layout_Autoplay_Recovery.zip` (SHA-256 `db637e04deaf0fe6fd908809f6c587c9502b598690f8dd53abe8301383fa871d`). This archive is a conversation artifact, **not** yet checked into the repository.

Recovered and source-inspected: category autoplay with A toggle, six categories, previous/next navigation, play/pause/stop, 253 matching MP3 paths, 253 lesson records with transcripts and summaries, Read changes on lesson transition, More placeholder, skill slider, state persistence, green expansion tab, Analyze screenshot switch and green Analyze launcher. Original approved compact POOL UI should stay visually identical to early layout, not be replaced with later enlarged/floating overlays.

Later approved Analyze-specific adaptation is separate: Guide fits fully inside blue header, beginning after title and ending immediately before green circle; details expand below. Do not apply that single-row Analyze header layout to pool-page compact three-row Guide.

**Status:** Recovered preview's ZIP integrity and JS syntax verified, but real app integration and browser interactions NOT verified. The current development branch's existing Guide implementation does not yet contain the recovered 253-file preview player. Treat any claims of real trainer autoplay/mapping as pending. Preserve production `main` and the user-confirmed IMAGE/CAMERA navigation fix.

---

# DESIGN FREEZE — Restore the October 9 Approved Pool Guide Preview

The approved visual design is the exact standalone artifact `Billiards_Guide_Layout_Preview.html` (SHA-256 `cff695780efbba4435919b79086906785dcbb2518d56cd6fab0040ef87642255`), recovered from the conversation and preserved independently as `Guide_Approved_Design_Restored.html`.

**Do not use later floating-left, wrapping, single-row-only or generic Guide sandbox designs as a visual reference.** The approved pool Guide is compact and positioned in the top-right black area under IMAGE / CAMERA and beside the Jump visualization, with three tight rows: (1) Guide ON, Stop, Play/Pause, Previous, Next, tiny skill slider, Read, More, Reset; (2) six category pills; (3) short topic and description. An optional lesson drawer expands *down* from this control area and may overlap the table only when explicitly expanded. The default control box must not cover the table's playing surface. Colors are dark charcoal, blue-gray borders, restrained green Guide ON, light blue hover, very faint green inspection tint.

Reference CSS geometry in standalone preview (relative to its 1488px screenshot frame): panel `left:47.5%;top:7.7%;width:28.1%` with 5px padding, ~4px button spacing, 24px playback icons. Never expand the box to a wide unstructured panel.

This is a **design acceptance reference**, not proof that the original trainer integration or audio interaction has been tested. Restore its layout first and compare screenshots before modifying controls or adding features. The production branch is immutable without approval.

---

# Interactive Guide — integration checklist

Development branch: `development/interactive-guide`. Production `main` must remain unchanged until user acceptance.

## Approved layout
- On Analyze Image page, Guide toolbar sits entirely inside the blue "Analyze Real Pool Table" title bar.
- Left edge just after "Analyze Real Pool Table" text; right edge immediately left of green circular Guide toggle, aligned with close X.
- Keep icons compact (do not spread them). Move the lesson selector to the right side of the same horizontal row.
- Small green expansion tab below toolbar; collapsed Guide must not cover Saved Images toolbar.
- Expanded content may extend below the blue header. Pool table uses its own compact placement.

## Behavior
- Guide inspection mode must block trainer mutations from pointer, touch, pen, wheel, keyboard, and unmapped controls, while Guide controls still work.
- Pale subtle green screen tint; blue highlight on mapped targets.
- Six groups: Explore, Get Started, Fundamentals, Physics & Tools, Drills, Exercises.
- Beginner/Intermediate/Advanced filter; quick introductions remain available at every level.
- Stop, play/pause, previous, next, autoplay, Read, More, Reset.
- Autoplay advances through selected category and synchronizes visible Read text with the current narration.
- Remember last category, lesson, reading state and playback position when Guide is toggled off/on; no automatic timeout.
- Never open Read text over the table without user action.
- More resources can later link to articles, videos and illustrations.
- Identical Guide experience accessible from green circle next to X on Analyze page.

## Safety and deployment
- Preserve the uploaded Flush Header Preview as design reference; it is not yet integrated into this branch.
- Preserve the 253-entry approved narration manifest and MP3 filenames; no regenerated audio without approval.
- Validate with isolated sandbox before mounting in actual trainer; verify normal interactions with Guide OFF and frozen state with Guide ON.
- Commit in small reversible stages; do not merge to main or change deployment until explicitly approved.
