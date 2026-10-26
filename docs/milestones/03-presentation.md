# Phase 3 — Presentation route and original media

Authorized by the user on 2026-10-26. The updated user rule forbids Qwen and permits at most three sub-agents. The main agent assigns bounded work, verifies architecture and behavior, requests revisions, and verifies again until the integrated result works.

## Decisions
- Preserve Phaser 4.2.1, the typed station/result boundary, compatible progress saves, local Vietnamese fonts, and all three existing mechanics.
- Guided route reads required enabled stations from the registry. Completed and skipped stations advance the route; only completed activities earn stamps. Explore mode keeps free movement.
- First-run help is a small dismissible tutorial. Presenter controls offer explicit navigation, pause, restart, skip, mute, volume, fullscreen, sources, and finish. Keep the walking playfield clear.
- Ending cards distinguish completed, skipped, and unvisited stations. Show learning text only as practiced when recorded in learnedFactIds. Include a discussion prompt and source/permission links without implying approval of draft content.
- Original non-cultural pixel artwork and short local synthesized interface tones are permitted. They must have attribution metadata and must never be described as authentic cultural media. Audio starts muted, resumes only after a user gesture, and stops during pause/hidden tabs and scene changes. Captions and visual rhythm remain sufficient without sound.
- Qualified cultural review and real projector acceptance cannot be supplied by code. Retain conspicuous fictional/demo labels and the release content gate; record these exit blockers honestly.

## Delivery slices
1. Public browser seam: tutorial → presenter route → three skips → honest ending. The initial acceptance test failed on the missing tutorial. The route sub-agent now owns route/UI implementation; the main agent reviews and retests returned work.
2. Local audio and original art: the media sub-agent adds media, lifecycle integration, and metadata. The QA sub-agent adds behavioral checks. The main agent verifies returned output and visual evidence.
3. Regression and delivery: typecheck, unit tests, build, browser paths, production offline checks, screenshots, and truthful status/README updates.

## Acceptance
- Cold guided launch offers tutorial; dismissal persists for this browser and help can be reopened.
- Guidance changes M01 → M02 → M03 → review, including skips. Presenter travel is explicit and lands on a walkable portal approach. Returning from activities preserves the entry position.
- Review cards and passport retain honest completion/skip/learning state; sources are clickable and fictional content stays labeled.
- Audio has real mute/volume controls, local assets, captions, pause/resume, missing-audio fallback, and no duplicated loops after re-entry.
- Existing tests remain valid. Check 1280×720 and 1920×1080 visual layouts and a locally served production build with external requests blocked.
- Document a suggested 5–7 minute sequence without imposing a timer. Do not claim public cultural or hardware acceptance.

## Verification baseline
Starting HEAD: `1ba99c1beb7b5b2c8b6904eb2505bb6d5473d9da`. Existing uncommitted Phase 2 and typography changes are preserved; this HEAD alone is not the Phase 3 diff baseline. Review against the files read before each task and the bounded task scope. Prior reports record 14 unit, 9 browser, and 2 production checks; these are historical until rerun.

Status: technical demo implemented and independently verified. Qwen was stopped after the user's workflow change; its partial architectural errors were replaced. Three sub-agents delivered route/UI, media, and tests. Main review requested facade and coverage revisions, then found and resolved global keyboard capture at the shared input boundary. Final main checks: strict typecheck/build PASS; 19 unit, 16 browser, and 3 offline production tests PASS. Whitespace check PASS. Release content gate still rejects the 3 fictional draft facts. Cultural approval, physical sound/projector checks, and a timed presentation rehearsal remain external exit blockers. See PHASE_3_QA.md.
