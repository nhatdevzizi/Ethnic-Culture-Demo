# Milestone 01: Phase 0–1 vertical slice

## Status
In progress.

## Objective
User starts the game, walks to a guide, enters M01, arranges fictional steps, and returns to the portal with one stamp.

## Scope
Planning, external content/localization, release validator, registry, safe saves, title, hub, dialogue, collision/camera, M01 drag/drop and keyboard alternative, pause/retry/skip/return, unit and browser checks.

## Out of scope
M02–M04, real cultural content, licensed audio, final art, full presentation finale. See backlog.

## Dependencies
- Depends on: ADR 0001 and AGENTS.md.
- Blocks: Phase 2.

## Acceptance criteria
- [ ] Draft demo is allowed for development and blocked for release — test: content.test.ts.
- [ ] Results award one stamp; invalid/outdated saves recover — test: session.test.ts.
- [ ] Wrong placements explain recovery; valid order completes — test: pattern.test.ts.
- [ ] Title → hub → NPC → M01 → stamp → same portal, no browser errors — test: game.spec.ts.
- [ ] Movement, collision, camera bounds, pause and repeat station visits work — test: game.spec.ts.
- [ ] 1280×720 and 1920×1080 screenshots reviewed — browser evidence.
- [ ] Feel on the user's presentation laptop — verified by user playtest (pending).

## Exit condition
User completes the fictional paper activity and returns to the hub with exactly one passport stamp, without refresh.

## Test plan
Write failing behavior checks before their implementation. Run typecheck, Vitest, Vite build, expected release rejection, and Playwright on a local server. Capture title, hub, puzzle, and return screenshots. Do not mark full MVP acceptance from this slice.

## Notes
No pre-existing Git history or code exists. Establish a baseline before Qwen delegation; the lead reviews Qwen output and runs checks independently.
