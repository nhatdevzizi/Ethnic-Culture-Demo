# Implementation status

Updated 2026-10-26. **Phase 4 technical reliability/accessibility is implemented and independently verified. Full MVP acceptance remains incomplete.** Public cultural-content approval and physical presentation-hardware acceptance remain blocked by external review and device checks. Phase 5 has not started.

## Phase 4 delivery
- Added explicit Low motion with OS defaults and safe persistence, keyboard-only guided play, visible focus/44px core targets, native fullscreen/fallback, and dynamic HUD clearance for shorter windows.
- Added fatal-error freeze and localized recovery, held-key reset/interruption pause, immediate audio-error captions, and persistent storage warnings during routine scene setup.
- Loaded saves must have consistent stamps, facts, statuses, and positions. Malformed data no longer implies unavailable storage. Result handoffs validate fully before one progress/return-position commit.
- Whole content collections now produce safe schema/reference diagnostics. The release gate still rejects all 3 fictional facts.
- Added fault/keyboard/fullscreen/resize tests and a measured CPU-throttling proxy. Main reviewed screenshots and requested removal of stale loading text from recovery; the affected checks passed after revision.
- See [PHASE_4_QA.md](PHASE_4_QA.md) for exact evidence and [PRESENTER_TROUBLESHOOTING.md](PRESENTER_TROUBLESHOOTING.md) for offline startup and the uncompleted physical rehearsal checklist.

## Hub layout follow-up
- Rebuilt the hub as four aligned station plots around a central plaza. Authored paths, southern entrance loops, tree alleys, detailed planted beds, a northern pond, benches, and paved forecourts replace the scattered layout.
- Grouped station names/statuses into consistent plaques with real HUD overlap checks. Expanded the logical canvas to 1280×720 and the hub world view to 1600×780, about 67% wider than before.
- Added five original garden SVGs; current inventory is 14 SVGs and 3 original WAV cues. Blocked legacy return positions recover safely without clearing progress.
- Main verified the final layout at 1280×720, 1920×1080, and 2560×1440. All 21 unit, 19 browser, and 3 offline production checks passed. See [HUB_LAYOUT_QA.md](HUB_LAYOUT_QA.md).

## Phase 3 delivery
- Guided registry route, live direction hint, safe explicit presenter travel, first-run tutorial with dismissal/replay, and native presenter panel.
- Ending review cards distinguish completed, skipped, and unvisited activities; only recorded learned fact IDs appear as practiced. Sources/credits and a closing discussion prompt remain accessible.
- Original local pixel SVGs replace temporary textures and station facades; the hub follow-up brings the inventory to 14. Three original short electronic WAV cues support M02; all media has attribution and local license notices. No cultural recording or factual authenticity is implied.
- Sound starts muted, supports volume/M toggle, stops for overlays/hidden pages/scene changes, and never blocks captioned gameplay when unavailable.
- Fixed shared hub keyboard capture so native volume arrows work while focused-canvas movement and scroll prevention remain intact. Existing save schema, typed result events, and station mechanics are unchanged.
- User workflow updated in AGENTS.md: no further Qwen; at most three sub-agents. Main review → revision → verification resolved station-art, test-coverage, and keyboard-input findings. See [PHASE_3_QA.md](PHASE_3_QA.md) and [PRESENTATION_GUIDE.md](PRESENTATION_GUIDE.md).

## Current main-agent verification
Latest purposeful-placement redesign: all visible character/environment image art now uses supplied PNGs. House-side wells, connected studio courtyard, wetland waterwheel and walkable bridge, clear shore approach and separate campfire clearing are data-authored; vegetation remains seeded outside reserved spaces. Generated animals/SVG tiles and sprites are not loaded. Typecheck/build PASS; 40 unit PASS; final full browser regression 42 PASS / 1 existing physical-visibility SKIP; 3 offline production PASS. Main inspected the redesigned views and corrected a blocked bridge approach. See [SCENERY_REDESIGN_QA.md](SCENERY_REDESIGN_QA.md). Earlier tables below are historical.

Latest decoration follow-up: four supplied sheets add 23 framed scenery objects across all biomes. Road geometry, seed behavior and shared state are unchanged. Typecheck/build and 39 unit tests PASS; 6 affected browser checks and 2 frame-correction checks PASS; 3 offline production checks PASS. Main inspected all frames and the four region screenshots. Supplied artwork remains draft. See [BIOME_DECORATIONS_QA.md](BIOME_DECORATIONS_QA.md).

Latest user-requested world update: camera 1.25×, world 2560×1920, four seeded themed trails, 20 original nature SVGs, ambient fauna, small route map and safe older-save migration. Typecheck/build PASS; 38 unit tests PASS; full browser regression 41 PASS / 1 existing visibility SKIP; 3 offline production checks PASS. All four roads were walked in the browser and tested across ten seeds. See [LIVING_TRAILS_QA.md](LIVING_TRAILS_QA.md). Earlier verification tables below are historical.

| Command | Result |
|---|---|
| `npm run typecheck` | PASS; no diagnostics, also repeated by final build |
| `npm install --no-audit --no-fund` | PASS in existing checkout; lockfile unchanged, Phaser still 4.2.1 |
| `npm test` | PASS; 34 tests in 10 files |
| `npm run build` | PASS; final static local demo with 3 fictional facts |
| `npm run test:e2e` | 35 PASS, 1 documented SKIP among 36 cases; approximately 1.8 minutes |
| Final recovery/storage checks | PASS; all 4 affected cases after the last UI correction |
| `npm run test:production` | PASS; all 3 offline checks on final corrected build, 21.0 seconds |
| `npm run build:release` | Expected rejection for all 3 unapproved fictional facts |

Browser paths include three completed activities by keyboard, native fullscreen, Low motion, short-window focus/HUD separation, fatal recovery, storage failures, font/audio/image faults, and the earlier gameplay/campus/recap paths. One real-tab hiding check is skipped because headless Edge kept document.hidden false. Synthetic interruptions pass. Main inspected hub, focus, settings, and recovery screenshots. This does not substitute for a real projector/speaker/laptop rehearsal.

## Typography follow-up
Hub asset/readability follow-up: two user-supplied character cutouts now serve as guide/station instructors, and supplied house art plus flowers decorates four station plots. Grass/paths are brighter. House plaques use bold camera-aligned browser text instead of scaled canvas text. Shared instructor collisions and exact hub return were checked. Typecheck/build, 35 unit tests, 9 targeted browser tests and 3 offline production tests pass. Imported art remains draft, and the release gate rejects it. See [HUB_ASSETS_QA.md](HUB_ASSETS_QA.md) for scope, prompts, screenshots and verification limits.

Vietnamese-capable local fonts replace the effective system-font stacks: Be Vietnam Pro for interface and hub canvas labels; Lora for all headings. Fonts load before canvas text creation, and heading leading allows accent space. Original font files and OFL notices are bundled. Follow-up verification: 14 unit tests, 9 browser tests, strict typecheck/build and offline production font loading. See [TYPOGRAPHY_QA.md](TYPOGRAPHY_QA.md). The Phase 2 table below records its original delivery checks.

## Implemented
- Phase 0–1: design/content contracts, pinned Phaser 4.2.1 with strict TypeScript/Vite, title, bounded top-down hub, player animation/collision, guide/board interactions, safe saves, local assets, Vietnamese/English UI, M01 ordering puzzle and return flow.
- Phase 2 M02: six-beat fictional light rhythm; normal and slow timed modes; fully untimed hit/rest actions; captions, mistake feedback, unlimited retry, pause/overlay guards, restart, skip, recap and exact hub return. It is silent and represents no real instrument or performance.
- Phase 2 M03: three fictional individual helpers; branching questions and assumptions; actual request evidence in a notebook; missing-evidence checks; plan reconsideration; recovery, restart, abandon, skip, recap and exact hub return.
- Registry enables M01–M03; M04 remains disabled. Passport reads the enabled count and reaches 3/3. Repeated completions award one stamp per station. Prior skipped/completed progress survives abandoned retries.
- Shared result payload/schema preserved; Phase 1 saves remain compatible. No dependency or package-script changes.
- Bilingual learning text stays external. Three selected facts remain visibly draft/fictional; the publication gate still rejects them.

## Phase 2 verification history
| Command | Final result |
|---|---|
| `npm run typecheck` | PASS; no diagnostics |
| `npm test` | PASS; 14 tests in 5 files |
| `npm run build` | PASS; 3 selected fictional facts, static local demo |
| `npm run test:e2e` | PASS; 7 browser tests |
| `npm run test:production` | PASS; 2 cold production checks with zero external asset requests |
| `npm run build:release` | Expected rejection for all 3 unapproved fictional facts |
| `git diff --check` | PASS after mechanical whitespace cleanup |

Browser path: title → hub → M01 → M02 → M03 → three unique stamps → exact return positions → reload. Also checked rhythm timing/slow/untimed behavior, pause and simulated hidden-tab event, wrong actions/retry, story evidence/reconsideration, context help input blocking, restart, abandon, skip retention, replay, collision/camera bounds, missing map and malformed saves. Screenshots at 1280×720 and 1920×1080 reviewed.

See [PHASE_2_QA.md](PHASE_2_QA.md) for exact paths, evidence and review limits. [QA_REPORT.md](QA_REPORT.md) preserves the earlier Phase 1 report.

## Phase 2 coding ownership history
The user assigned application coding to Qwen Local. Qwen3-Coder 30B generated the implementation and correction patches. Codex supplied the design, bilingual content and independent browser checks, reviewed files and applied bounded generated output, and independently ran all verification. The Qwen Code wrapper failed the contract; the same local model was then used directly with file allowlists and context caps. No alternate model was substituted. Baseline: d81a6c36e309e06a0f72c043e9058ad4c9b5619d.

## Phase 2 changed files history
- `src/game/core/RhythmPractice.ts`, `StoryPractice.ts`: pure mechanics.
- `src/game/minigames/SoundGardenScene.ts`, `StoryTrailScene.ts`: playable scenes and disposable controls.
- `src/game/core/SessionStore.ts`: preserve skipped progress on abandoned retries.
- `src/game/ui/OverlayController.ts`: station help and enabled-station passport count.
- `src/game/minigames/PatternStudioScene.ts`, `src/game/scenes/HubScene.ts`: context help and updated activity legend.
- `src/game/config.ts`: scene registration.
- `src/content/rhythm.json`, `stories.json`, `facts.json`, `minigames.json`: bilingual fictional learning content and enabled registry.
- `src/i18n/vi.json`, `en.json`: three-activity navigation/summary wording.
- `src/styles/rhythm.css`, `story.css`: scoped activity layouts.
- `tests/unit/rhythm.test.ts`, `story.test.ts`, `session.test.ts`: timing/evidence/progress checks.
- `tests/e2e/phase2.spec.ts`, `tests/production/offline.spec.ts`: browser routes, recovery and offline checks.
- `README.md`, design/status/backlog/milestone docs: current behavior, evidence and handoff.

## Remaining blockers and deferred work
- Approved cultural facts, qualified/community review, permissions, authentic recordings and final artwork are not supplied. Current material is fictional, not a substitute for cultural education.
- Real presentation laptop/projector, physical tab switching, native fullscreen, touch movement and broader performance/browser coverage remain user/hardware checks. Hidden-tab behavior was simulated in automation.
- Guided route and recap are now implemented. The suggested 5–7 minute speaking plan is documented but has not been measured on presentation hardware. M04 and side quests remain later work.
- The full MVP acceptance checklist in AGENTS.md is not complete; presentation readiness is not claimed.

## Next prioritized task
Rehearse the complete production demo on the intended laptop/projector and record the remaining physical acceptance results. Obtain qualified cultural review and approved sources/media before public cultural teaching. Phase 5 remains deferred.

## Natural-world follow-up

The latest map uses the user's asset5.png road sheet, with matching houses and props selected from ảnh2.png and ảnh4.png. Four winding station routes use distinct road materials. A northern stepping-stone loop connects M02 and M03 around an irregular lake. Forest borders and seeded groves create clearings while keeping roads clear. See NATURE_TRAILS_QA.md and milestone 04b-natural-world.md for current verification. Historical layout descriptions above record earlier versions.

Final natural-world checks: typecheck/build PASS, 41 unit PASS, 7 focused browser PASS, full browser 42 PASS / 1 existing physical-visibility SKIP, and 3 offline production PASS. Release gate correctly rejects all selected draft facts and supplied-art groups. Main inspected final frame crops and whole-map composition. No production debug hook or runtime external asset was added.

## Scenery layer and ground correction

Bridge and steps now use a ground layer. Solid props have wider lower collision areas. Character, instructor and house layers follow their visible feet. Removed independent rectangular ground samples from work clearings; they now share the surrounding grass. Plant reservations and supplied roads remain. Typecheck/build, 41 unit and 8 focused browser checks pass; the specific bug was reproduced before the fix. See SCENERY_LAYERS_QA.md.

Final static-build verification for the scenery correction: 3 offline production tests PASS. See SCENERY_LAYERS_QA.md.
