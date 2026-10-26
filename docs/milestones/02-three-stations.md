# Milestone 02: Three distinct activities

## Status
Implemented and verified as a fictional demo. The user explicitly requested Phase 2 and assigned coding work to Qwen Local on 2026-10-26. Real cultural content and hardware acceptance remain pending.

## Objective
Keep M01 playable and add M02 visual rhythm practice and M03 branching evidence conversations. The user can finish, retry, skip, abandon, and revisit all three without losing stamps or hub position.

## Scope
- M01 remains the spatial ordering activity.
- M02: fictional six-beat light sequence, hit/rest captions, timed normal and slow modes, untimed hit/rest controls, explanatory failure and replay. Optional authentic audio is unavailable; the visual activity must be complete without it.
- M03: three fictional exhibition helpers, branching questions, consequences, evidence notebook, and a final evidence-based plan. Wrong assumptions can be revisited. Character names and requests describe fictional individuals only.
- All learning content and choices live in external bilingual JSON and remain draft/fictional.
- Enable M02/M03 in the shared registry; leave M04 disabled. Correct three-station passport denominator and context help/recap.
- Keep existing scene payload and typed result contracts. Dispose scene keys/timers/listeners. Pauses and hidden tabs cannot consume rhythm beats.

## Decision tree and assumptions
1. May Phase 2 start? Yes: explicit user request supersedes the prior pending hardware check.
2. Who codes? Qwen3-Coder 30B; Codex writes the plan, reviews, runs tests, and provides precise correction tasks.
3. Is approved cultural material available? No. Use explicitly fictional light patterns and exhibition requests. Do not imply musical or community authenticity.
4. Can timing exclude players? No. Provide slower and fully untimed practice with visible controls and feedback.
5. Does this include Phase 3? No. Basic existing ending integrates all three results; full guided route, final art, authentic permitted audio remain deferred.
6. Can existing saves be kept? Yes: preserve Phase 1 M01 progress; add no unnecessary schema change.

## Design direction
Keep the existing warm paper/ink/garden palette, serif headings and readable sans-serif body. Use the current studio frame rather than a new dashboard. M02 has six large beat cells and one primary tap control with captions; modes are visibly labeled. M03 has three guide choices, one conversation, and a compact evidence notebook. Controls have visible focus, at least 44px targets, and do not depend on color or sound alone. All new styles are scoped to their station.

## Coding slices and ownership
1. Qwen: M02 pure rhythm rules and red/green unit tests.
2. Qwen: M02 scene/content/registry integration, with browser acceptance evidence reviewed by Codex.
3. Qwen: M03 evidence rules, scene/content/registry integration and tests.
4. Qwen: shared progress/help/recap and browser regression corrections.
The Qwen Code wrapper tasks started from clean local Git baselines. After those tasks failed to follow the contract, the same Qwen3-Coder 30B model was called directly with explicit file lists and bounded context. Codex supplied bilingual content and independent browser tests, applied Qwen-generated code/patches, and verified the results. No package scripts or dependencies changed. Qwen's report alone was not verification.

## Acceptance criteria
- [x] M01 original drag/drop and keyboard path still pass — `tests/e2e/game.spec.ts`.
- [x] M02 normal and slow rhythm work; missed/extra beats produce specific retry feedback — `tests/unit/rhythm.test.ts`, `tests/e2e/phase2.spec.ts`.
- [x] M02 untimed input can complete without a deadline; rest steps have an accessible action — same unit/browser tests.
- [x] Pause and overlay guards freeze M02; hidden-tab event simulation exercises the visibility handler — `phase2.spec.ts`. Physical tab switching on presentation hardware remains a user check.
- [x] M03 includes three fictional helper conversations, consequential choices, evidence requirements, recovery and recap — `tests/unit/story.test.ts`, `phase2.spec.ts`.
- [x] Results return to the entered portal; stamps are unique; skips survive abandoned retries — `session.test.ts`, `phase2.spec.ts`.
- [x] Passport shows enabled station count; M04 stays disabled — registry review and three-stamp browser assertion.
- [x] Strict typecheck, unit, build, browser and cold production checks pass — `PHASE_2_QA.md`.
- [x] Screenshots reviewed at 1280×720 and 1920×1080 — `output/playtest/phase2-*`.
- [x] Publication gate rejects all three draft fictional facts — actual `npm run build:release` rejection.

## Exit condition
User plays three different activities and returns from each with the correct stamp or skip status, without refreshing or becoming stuck.

## Test plan
Pure rules: timing boundaries, missed/rest/duplicate input, slow/untimed mode, branch/evidence recovery, unique results. Browser: real hub traversal to all three portals, instructions, incorrect action, completion, pause, restart, return, skip, replay, retained M01 progress, resizing and zero external assets. Use screenshots for canvas and layout review. Exact test names and final results will be recorded after implementation.

## Dependencies / limits
Depends on Phase 1. Real cultural approval, real laptop/projector testing, final art, and audio remain unresolved. No account, network service, new framework, or dependency is required.

## Delivery
See [Phase 2 QA](../PHASE_2_QA.md). Phase 3 was not started. Full MVP presentation readiness is not claimed.
