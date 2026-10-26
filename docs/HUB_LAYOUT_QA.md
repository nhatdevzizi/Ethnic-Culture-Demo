# Hub layout and desktop view QA

Date: 2026-10-26. This report records the map follow-up requested after Phase 3. The main agent reviewed three sub-agent outputs, requested visual and test revisions, and independently ran the final checks.

This is the map-delivery record. Later Phase 4 controls, recovery behavior, and current test counts are recorded in [PHASE_4_QA.md](PHASE_4_QA.md).

## Implemented
- Four station plots form a clear two-row layout: M02 northwest, M03 northeast, M04 southwest, M01 southeast.
- The central plaza connects to explicit map-authored paths and outer loops. Southern entrances face down; the loops pass around their building footprints. Four paved forecourts connect doorsteps and entrance pads.
- Tree alleys, four detailed planted stone-edged beds, a northern irregular pond, and benches replace scattered landscaping and flat garden rectangles. Five new original SVGs bring the inventory to 14 SVGs; the three original WAV cues remain unchanged.
- Each station uses one aligned name/status plaque above its roof. Plaques are 264×56 world pixels with 22px names and 16px status text. They remain separate from the actual HTML HUD at the tested resolutions.
- Title backgrounds fill the larger logical canvas. Minigame overlays retain the existing fonts and layout.
- HubLayout shares collision rectangles between Arcade bodies and saved-position recovery. A saved position inside a rebuilt obstacle returns to the plaza without changing stamps or learned facts.

## View measurements
| Measure | Previous | Current |
|---|---|---|
| Logical canvas | 960×540 | 1280×720 |
| Hub camera viewport | 960×540 | 1280×624, beginning at logical y=96 |
| Hub zoom | 1 | 0.8 |
| Visible world extent | 960×540 | 1600×780 |

The visible world is about 67% wider and 44% taller. The map remains 1536×1152 pixels. A 32px grass margin on each side fills the camera view beyond the map border; player movement remains bounded by the map walls.

```text
M02 ── Pond ── M03
       Plaza
M04 ── Paths ─ M01
```

```text
Authored roads → Clear entrances → Normal portal entry → Typed result → Exact hub return
Shared collision rectangles → Safe legacy return → Preserved progress
Camera reserve + aligned plaques → Clear station names outside the HUD
```

## Main-agent verification
| Command/check | Result |
|---|---|
| node scripts/generate-media.mjs | PASS; 14 SVGs and 3 WAVs, geometry/readback/header assertions |
| npm run typecheck | PASS; also repeated by the final build |
| npm test | PASS; 21 tests in 8 files |
| npm run build | PASS; final local demo bundle |
| npm run test:e2e | PASS; all 19 tests, final run approximately 1.5 minutes |
| npm run test:production | PASS; all 3 offline production checks, 21.6 seconds |
| git diff --check | PASS; no whitespace errors |

Browser checks cover actual HUD/plaque intersections at 1280×720, 1920×1080, and 2560×1440; real keyboard walking around the southern buildings; all three playable activities; exact returns; the disabled fourth entrance; collision/camera bounds; blocked legacy saves; and existing tutorial, passport, audio, font, retry, and recovery paths. Production blocks external requests while loading the local map, garden assets, fonts, and cues. Production developer globals remain absent.

The restricted Windows test runner still needs normal filesystem access for Vitest/Vite configuration loading. No test or application configuration was changed to bypass this restriction.

## Review and revisions
1. Main review identified that a straight path to the southern stations would cross their building bodies. The world agent supplied clear outer loops and a northern pond placement that avoids those loops.
2. Main screenshot review requested smaller plaques with more clearance below the HUD and paved forecourts. The world agent revised both. QA added intersection checks against the real HTML controls, not only the camera reserve.
3. Main's first complete browser run passed 18 of 19 tests. The remaining test read the player before the Hub scene had opened after reload. QA added an explicit readiness wait to the shared navigation helper. No application behavior or assertion was weakened. The main agent's full 19-test rerun passed.

## Changed files
- public/assets/maps/hub.json and src/content/minigames.json: authored layout and station positions.
- src/game/core/HubLayout.ts: collision geometry and safe saved positions.
- src/game/scenes/HubScene.ts: rendering, plaques, camera, and map integration.
- src/game/config.ts and scenes/TitleScene.ts: larger logical canvas and adaptive title background.
- scripts/generate-media.mjs, PreloadScene.ts, assets-manifest.json, and local SVGs: original garden assets and credits.
- src/main.ts: development-only camera/plaque observation; no production globals added.
- tests/e2e/helpers/hub.ts and gameplay/production tests: actual road navigation and preserved behavior checks.
- tests/e2e/hub-layout.spec.ts and tests/unit/hub-layout.test.ts: layout and recovery coverage.
- README, art/tech/status documents, and milestone 03a: current behavior and evidence.

## Visual evidence and limits
Main reviewed output/playtest/hub-garden-assets.png and campus-hub-vi-1280.png, campus-hub-vi-1920.png, and campus-hub-vi-2560.png. All four station plaques are visible in the initial view and do not intersect each other or the HUD. Later walking naturally scrolls stations out of view.

These are browser-window checks, not a physical 24-inch monitor or projector rehearsal. Screen size in inches does not determine pixel resolution. Cultural review requirements remain unchanged; all learning content is still visibly fictional. Phase 4 was not started automatically.
