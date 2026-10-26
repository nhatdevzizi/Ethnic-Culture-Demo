# Cultural Trails / Hành Trình Sắc Màu

A working **Phase 0–4 technical browser-game demo**. Phaser **4.2.1**, strict TypeScript, Vite, and small HTML overlays. Phase 4 reliability/accessibility work is implemented and tested. Full MVP acceptance still needs cultural approval and physical presentation-hardware checks. No account, backend, runtime CDN, or external service.

Typography uses bundled **Be Vietnam Pro** for UI/canvas labels and **Lora** for headings, with Vietnamese coverage and original OFL notices. Fonts load locally before the canvas is created. No Google Fonts connection is needed to play.

**DEMO / UNVERIFIED CONTENT:** all three activities are fictional and non-cultural. They do not teach reviewed facts about a real community. This is not the full presentation-ready educational MVP.

## Install and play

Use Node.js 22.12+ (tested with Node 26.7) and npm.

```powershell
npm install
npm run dev
```

Open http://127.0.0.1:8080/?mode=presentation&lang=vi . Click Start and speak to An. Pattern Studio is southeast of the plaza: follow the right-hand outer path down, then approach its yellow entrance pad. Guided Presenter travel can also take you to the entrance.

Three stations now work:

| Station | Where | What to do |
|---|---|---|
| M01 Pattern Studio | Southeast; use the right-hand outer loop | Drag or select/place plan → cut → assemble |
| M02 Sound Garden | Left, then north | Choose Normal, Slow, or Untimed; start; tap hit steps and wait through rests |
| M03 Story Trail | Right, then north | Ask three fictional helpers, record requests, and choose a plan using those notes |

M02 has visual rhythm, captions, and optional original electronic cues. These are synthetic interface sounds, not instrument recordings or cultural performances. Untimed mode has no deadline and uses a clickable/keyboard-accessible Next rest action. M03 allows revisiting an assumption and keeps actual requests in its evidence notebook. M04 remains available later.

Launch options: `?mode=presentation&lang=vi` or `?mode=explore&lang=en`. The landscape is generated from a seed: default `42`; use `?mode=explore&lang=en&seed=43` for a different arrangement. The same seed preserves terrain and roads after minigame return or reload. Guided mode offers a small first-run tutorial, walking directions, and a Presenter panel. Complete or skip each activity to advance M01 → M02 → M03 → review. Presenter travel explicitly moves to the next entrance; it never completes a station. Explore mode hides the guided route, presenter panel, and skip. English and Vietnamese UI are local JSON files.

## Controls

| Input | Action |
|---|---|
| WASD / arrows | Move in the hub |
| E / Space | Nearby interaction, guide dialogue, or M02 tap; native buttons use Enter/Space |
| Esc / P | Pause / resume; Esc closes the current panel |
| H | Current station instructions / controls help |
| R | Restart the current station with confirmation |
| N | Skip the current station in presentation mode |
| F | Fullscreen, when permitted by the browser |
| M | Toggle optional sound; it starts muted |
| Tab / Enter | Select paper cards/slots, rhythm actions, or story choices |

Drag cards into their matching numbered slots. A wrong placement leaves the card available and explains the expected order. There is no timer. Complete all three slots, read the recap, and select Return & collect stamp. A repeated completion does not duplicate the stamp.

Passport and pause buttons are always available during play. Pause includes help, credits, fullscreen, finish, sound/volume, Low motion, and station return/restart. Guided mode also provides a Presenter button and tutorial replay. Leaving a station asks for confirmation; skipping remains skipped. A hidden page or lost window focus pauses the game and clears held movement keys. Resume explicitly. Menus block both movement and puzzle input. Pausing or leaving a scene stops short sound cues; resume does not replay an old cue.

Low motion follows the operating-system preference by default. Its explicit override persists separately from game progress, with a safe in-memory fallback. Walking remains available with a still visitor frame; necessary rhythm captions and beat feedback remain visible. Native keyboard navigation reaches all three activities and the ending. The hub adjusts its HUD reserve after resize/fullscreen, including shorter browser windows.

The ending shows separate completed, skipped, and unvisited cards. Only recorded learning appears as practiced. Source and asset links are available from the title, pause/presenter panels, and ending. See [PRESENTATION_GUIDE.md](docs/PRESENTATION_GUIDE.md) for a suggested 5–7 minute speaking plan; there is no forced timer.

The passport counts the three enabled stations. Completing a station again does not duplicate its stamp. Abandoning a new attempt preserves an earlier completed or skipped result. M02 timed beats freeze under overlays; the scene caps a restored frame's time step. Tests exercise synthetic interruption events. The real hidden-tab probe is explicitly skipped when headless Edge does not expose page hiding; physical tab/application switching still needs rehearsal.

## Checks

```powershell
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run test:production
```

Browser checks use the installed Microsoft Edge through Playwright. If Edge is unavailable, install it or change `channel` in the two Playwright config files to an available browser. `test:production` requires a current `dist` from `npm run build`. It uses port 4281 and refuses to reuse another server. `test:e2e` uses the local dev server at port 8080.

Screenshots are saved in `output/playtest/`. Development builds expose `render_game_to_text()` and `advanceTime(ms)` for testing. Production builds exclude those hooks. Test results and screenshots are ignored by Git.

Current scenery-redesign checks: 40 unit tests pass; the full browser suite has 42 passes and 1 documented visibility skip; 3 offline production checks pass. Separate `test-results/e2e` and `test-results/production` folders prevent artifact cleanup conflicts. The CPU-throttled browser exercise records observations; it does not certify a lower-powered laptop. See [SCENERY_REDESIGN_QA.md](docs/SCENERY_REDESIGN_QA.md) and [PHASE_4_QA.md](docs/PHASE_4_QA.md).

## Build and offline presentation

```powershell
npm run build
npm run preview
```

Open http://127.0.0.1:4281/?mode=presentation&lang=vi . Keep the entire `dist` folder together. Host it on any static HTTP server or use the preview command after installation. Do not open `dist/index.html` through `file://`. Assets, text, and styles are local; internet access is not needed to play after installation/build. Source links in credits need a network only when opened.

The normal build produces a visibly labeled **demo** bundle. `npm run build:release` deliberately fails with current draft facts. Do not remove the label or mark fictional facts approved to bypass the gate. Presentation URL mode is a guided demo route, not a content-approval override.

The starter came from https://github.com/phaserjs/template-vite-ts . The official generator was attempted first; it exits if anonymous reporting is declined. The official template's Vite/TypeScript configuration was copied directly, then Phaser was pinned to 4.2.1. No telemetry script, sample art, or template game was copied. `LICENSE` preserves the starter's MIT license.

## Architecture and content

- `src/game/scenes`: Boot → Preload → Title → Hub → Ending.
- `src/game/minigames/PatternStudioScene.ts`, `SoundGardenScene.ts`, `StoryTrailScene.ts`: three distinct scene adapters and disposable interfaces.
- `src/game/core`: session store, registry, presentation route/tutorial progress, content validator, puzzle rules, and typed result boundary.
- `src/game/systems/AudioManager.ts`: optional local one-shot cues, volume, mute, and lifecycle guards.
- `src/game/ui/OverlayController.ts`: readable, keyboard-accessible HTML panels and presenter controls.
- `src/content`: facts, communities, dialogues, rhythm data, branching story data, registry metadata, and asset credits.
- `src/i18n`: Vietnamese and English text.
- `public/assets/maps/hub.json`: fictional world bounds, plaza and four landscape themes.

The map is 80×60 tiles at 32px (2560×1920). Four winding trails connect the plaza to separate stations. All visible scenery, terrain and characters use the supplied PNG artwork. Wells stand beside houses; the waterwheel sits at a wetland pond with a walkable bridge; studio crafts share a brick courtyard; highland steps/rocks and a campfire have their own clearing. Seeded vegetation stays outside roads, access paths and work areas. Generated animals were removed because the supplied sheets contain no animal sprites. A small route map tracks your position. Three portals work; the fourth clearly says available later. The supplied media remain draft demo art. See [SCENERY_REDESIGN_QA.md](docs/SCENERY_REDESIGN_QA.md). Earlier asset generators remain historical and are not needed to play.

The logical canvas remains 1280×720. The hub camera zooms to 1.25×, with 1024 world pixels visible horizontally, and reserves space for the HUD. Browser-rendered house names and statuses stay sharp above each roof. Checks target 1280×720, 1920×1080, and 2560×1440 desktop windows. Older saves migrate to the new plaza without losing stamps. Current layout saves retain their position unless terrain blocks it. See [LIVING_TRAILS_QA.md](docs/LIVING_TRAILS_QA.md).

To add learning content, use the record schema in `src/game/core/types.ts`, then follow [CONTENT_SOURCES.md](docs/CONTENT_SOURCES.md). Real claims need direct sources. Release-selected facts need approved status and a reviewer; community and media records need approval too. Register activities in `src/content/minigames.json`. Disabled activities must not point to playable empty scenes.

Progress is stored under `cultural-trails-v1`, with schema and content versions. Invalid, outdated, or inconsistent progress resets safely. Malformed data is distinguished from unavailable storage. Blocked/quota-limited storage falls back to memory and shows a warning. Stamps, facts, and return position commit together after result validation. Existing valid Phase 1 saves remain compatible. Current puzzle-card placement, rhythm attempt, and story notes reset across reload or station exit.

## Status and troubleshooting

See [IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md), [PHASE_4_QA.md](docs/PHASE_4_QA.md), and [PRESENTER_TROUBLESHOOTING.md](docs/PRESENTER_TROUBLESHOOTING.md) for current evidence, recovery steps, and physical rehearsal checks. Earlier phase reports preserve their original results.

If a critical local map/image cannot load, the game shows localized recovery with Reload. Unexpected runtime errors freeze play behind that surface; previously saved stamps remain available after reload. Check that the whole build is hosted and the server is running. If port 4281 is occupied, stop the preview you own or choose another port; do not stop an unrelated service. Fullscreen depends on browser policy. Sound starts off; enable it in Pause or Presenter after a user gesture. Optional audio failure immediately updates the caption; continue with visual cues and untimed play.

Test at the actual classroom projector before presenting. Touch movement, reviewed cultural material, authentic permission-cleared recordings, and physical hardware acceptance remain outside this demo delivery.
Natural-world update: the current map uses asset5.png road pieces, selected houses/workshop objects from ảnh2.png and ảnh4.png, a northern loop, an irregular lake, forest borders and seeded groves. Route points and house choices are in src/content/world-trails.json. The reference screenshot informs the arrangement only; its exact layout and images are not copied. See docs/NATURE_TRAILS_QA.md.
