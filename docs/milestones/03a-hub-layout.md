# Hub layout and desktop view follow-up

User request: reorganize the map, replace basic garden shapes, align station names, and extend the visible world for a 24-inch monitor. This is a visual/navigation follow-up to Phase 3, not automatic Phase 4 work.

## Design
- Four station plots form two aligned rows around the central plaza: M02 northwest, M03 northeast, M04 southwest, M01 southeast.
- Keep the current world dimensions, player movement, Vietnamese typography, typed results, and saved activity progress. Encode paths and landscaping in local map data instead of a scene-only path formula.
- Tree alleys frame the circulation routes. Detailed stone-edged flowerbeds, layered planting, and an irregular pond replace flat rectangular decorations.
- Station name and status belong to one consistently anchored sign above each roof. Reserve camera space below the HUD so names do not sit behind controls.
- Target a 1280×720 logical canvas with a wider hub camera view. Verify actual visible world bounds and screenshots at 1280×720 and 1920×1080. Screen size in inches does not supply a pixel resolution; these are explicit test targets.
- Southern buildings face down. Their entrances need a side/bottom loop; do not route the player through the building collider. Existing saved positions that become blocked must recover to a safe spawn without losing stamps.

## Ownership and verification
Reuse three sub-agents: world/layout, original pixel assets, and QA. The main agent owns integration, documentation, architecture review, and independent checks. Follow assign → verify → revise → verify. No Qwen.

Acceptance: clear aligned campus; detailed plants and water; readable non-overlapping signs outside HUD; larger visible world; all station entrances remain reachable; collisions, camera bounds, saved progress, minigame return, audio, and dialogue remain functional. Run unit/browser/build/offline checks appropriate to these changes and inspect final screenshots.

Status: implemented and independently verified. Main requested clear southern bypasses, smaller plaques with HUD clearance, and connected forecourts; the world agent revised them. A navigation helper now waits for Hub/player readiness after reload. Final checks: 21 unit, 19 browser, and 3 offline production tests PASS; strict typecheck/build and generator assertions PASS. Main reviewed 1280×720, 1920×1080, and 2560×1440 screenshots. See HUB_LAYOUT_QA.md. Physical monitor/projector acceptance remains external.
