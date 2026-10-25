# Implementation status

Updated 2026-10-26. **Phase 0 implemented. Phase 1 implemented and browser-verified; user hardware playtest pending. Phase 2 not started.**

## Done
- Planning: game design, story beats, station objectives/mechanics, stack ADR, content approval workflow, art inventory, backlog, installation/offline instructions.
- Official Phaser/Vite/TypeScript starter adapted; Phaser pinned exactly to 4.2.1; strict TypeScript enabled.
- Boot → real local-map preload/progress/error feedback → title → walkable 48×36 deterministic hub.
- Unique original player sprite and walk frames; Arcade Physics collisions; bounded follow camera.
- One two-page guide dialogue, exhibition board, one working portal; three clearly disabled future stations from the shared registry.
- M01 fictional paper-order puzzle: instruction overlay, drag/drop, keyboard select/place, explanatory mistake recovery, retry, recap, typed result, correct saved-position return.
- Central progress store: unique stamps, distinct skip, safe schema/content-versioned local saves, malformed-save recovery, blocked-storage fallback.
- Vietnamese default and English UI JSON; URL mode/language; fixed map/order accept optional seed.
- HTML passport/help/pause/credits/ending; skip only in presentation mode; return/restart confirmation; hidden-page pause handler; visible demo labels.
- Build-time schema/source/review validation; separate publication gate intentionally rejects current demo facts.

## Verification
| Command | Final result |
|---|---|
| `npm install --save-dev vitest @playwright/test tsx @types/node` | PASS; dependencies installed |
| `npm run typecheck` | PASS; no errors |
| `npm test` | PASS; 5 tests in 3 files |
| `npm run build` | PASS; local static demo |
| `npm run test:e2e` | PASS; 3 browser paths |
| `npm run test:production` | PASS; cold Vietnamese build, zero external asset requests, no developer hooks |
| `npm run build:release` | Expected failure; draft fictional material cannot publish as approved learning |

Browser path: title → hub → guide → M01 instruction → incorrect drag → retry → three correct placements → recap → exact hub return → one stamp → replay/reload. Also checked collision, west camera bound, pause, restart, skip, ending, malformed save, missing map, and resize. Screenshots at 1280×720 and 1920×1080 reviewed. See [QA_REPORT.md](QA_REPORT.md).

## In progress / blocked
- User feel/legibility test on actual presentation hardware: pending.
- Cultural facts, community names, authentic material, and media permissions: not supplied; blocked on review. Current demo is conspicuously fictional.

## Deferred
M02/M03, full presentation route/recap, M04, final art/audio, touch movement, and broader reliability checks. The full MVP acceptance checklist in AGENTS.md is not complete.

## Next prioritized task
User plays the Phase 1 route on the intended laptop/projector and reviews this report. Then plan Phase 2 using the existing result and registry contracts. Do not silently start Phase 2.
