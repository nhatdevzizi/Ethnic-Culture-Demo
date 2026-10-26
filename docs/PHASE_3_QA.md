# Phase 3 QA — Presentation route and original media

Date: 2026-10-26. Technical demo implementation delivered through three sub-agents after the user replaced the Qwen-only rule. The main agent reviews returned code and independently runs checks. This is not cultural or projector acceptance.

This report preserves the original Phase 3 delivery checks. The map redesign is recorded in [HUB_LAYOUT_QA.md](HUB_LAYOUT_QA.md); current reliability results are in [PHASE_4_QA.md](PHASE_4_QA.md).

## Architecture review
- Registry remains the source for required station order. Completed/skipped stations advance; only typed completed results award unique stamps and learned fact IDs.
- SessionStore owns saved activity state. Presenter travel uses setPosition; minigame payload/result events and save schema remain unchanged.
- Hub owns graphics, player input and travel. OverlayController owns native dialogs and readable controls. Ending reads recorded state without granting learning or stamps.
- PresentationRoute is a pure registry query. Tutorial dismissal uses a separate safe storage key with an in-memory fallback.
- AudioManager owns three reusable local one-shot media elements. Mute, zero volume, pause, hidden page, unavailable media, and scene cleanup prevent playback. Resume does not replay stale cues.
- Original local SVG/WAV files have project MIT notices and manifest credits. Existing Vietnamese font files and OFL notices remain local.
- Source links allow only HTTP(S), open with noopener/noreferrer, and remain visibly separate from draft/fictional learning records. The release content gate remains active.

## Main-agent verification
| Check | Result |
|---|---|
| Strict typecheck | PASS; final build runs tsc with no diagnostics |
| npm test | PASS; 19 tests in 7 files |
| npm run build | PASS; final static demo build, 3 explicitly fictional selected facts |
| npm run test:e2e | PASS; all 16 tests after keyboard correction, 59.0 seconds |
| npm run test:production | PASS; all 3 final rebuilt-bundle checks, 16.2 seconds |
| npm run build:release | Expected rejection: all 3 fictional facts lack release approval, reviewer, and source |
| git diff --check | PASS; no whitespace errors |

The restricted Windows runner initially could not resolve Vitest/Vite configuration because a parent directory was inaccessible. Unit tests and builds passed with normal filesystem access. The first production run passed its assertions but did not exit cleanly; its owned preview process was stopped. The subsequent production run exited normally with all 3 checks passing. No test assertion was weakened to work around these environment issues.

## Browser paths
- Cold guided title → nonmodal tutorial → dismiss → reload without tutorial → replay tutorial from Presenter.
- Presenter explicit entrance travel → normal portal entry/instructions → M01 skip → M02 skip → M03 skip → ending with 3 skipped cards, 0 stamps, and no earned fact text.
- M01 completion/replay → one stamp → M02/M03 skips → ending with earned learning only for M01.
- Guided M01 card ordering → M02 untimed six hit/rest steps → M03 three evidence conversations and supported plan → 3 unique stamps → 3 earned review cards → Vietnamese Continue and ending.
- Explore mode has no forced tutorial, guided hint, or Presenter; immediate finish shows 3 unvisited cards and no practiced fact text.
- Sound opt-in, native keyboard volume, M mute, hidden-page pause, native successful local WAV playback, pause/scene cleanup, and no stale replay.
- Missing optional audio still permits captioned rhythm completion. Earlier tests also cover wrong actions, retries, collision/camera bounds, return positions, malformed saves, and critical map failure.
- Production checks block external requests while loading local fonts, original art, audio, and activities. Developer hooks remain absent from production.

## Review and revision loop
1. The first Qwen acceptance test failed because the tutorial was missing. Qwen's partial implementation was stopped when the user changed the workflow; its architectural errors were replaced.
2. The route sub-agent returned native-dialog/store-compatible work. Main review requested original station facades and complete guided/native-audio test coverage; the media and QA sub-agents delivered revisions.
3. Main's 16-test run found a keyboard-volume failure. Installed Phaser source confirmed addKeys defaults to global key capture. The route sub-agent disabled that capture at the shared InputManager boundary, retaining focused-canvas key prevention. The unchanged slider test then passed 5 repeated agent runs; movement tests also passed. Main's final full 16-test suite and final production build/offline checks then passed.

## Visual evidence
Main reviewed local screenshots including:
- output/playtest/phase3-hub-1280.png — original tiles, sprites, facade, symbol, compact route hint, clear center.
- output/playtest/phase3-presenter-1280.png — native panel, sound toggle, labeled volume.
- output/playtest/phase3-ending-1280.png and phase3-ending-1920.png — honest skipped cards.
- output/playtest/phase3-ending-vi-1280.png and phase3-ending-vi-1920.png — earned facts and Vietnamese typography. Longer recap text scrolls within the panel at 1280×720.

## Limits
No qualified cultural/community approval, authentic cultural media, physical speaker-output judgment, real projector rehearsal, or low-powered laptop performance acceptance was supplied. Hidden-page checks use a simulated visibility event. Native fullscreen, touch-first controls, and browser engines beyond installed Edge remain unverified. The suggested 5–7 minute sequence is a speaking plan, not a measured presentation.

Phase 4 is not started automatically. Next acceptance task: rehearse the guided demo on the intended laptop/projector, then address observed reliability/accessibility issues and source/reviewer dependencies.
