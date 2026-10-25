# Cultural Trails / Hành Trình Sắc Màu

A working **Phase 0–1 browser game prototype**. Phaser **4.2.1**, strict TypeScript, Vite, and small HTML overlays. No account, backend, runtime CDN, or external service.

**DEMO / UNVERIFIED CONTENT:** the paper-model activity is fictional and non-cultural. It does not teach facts about a real community. This is not the full presentation-ready MVP.

## Install and play

Use Node.js 22.12+ (tested with Node 26.7) and npm.

```powershell
npm install
npm run dev
```

Open http://127.0.0.1:8080/?mode=presentation&lang=vi . Click Start, speak to An, walk right, and enter the yellow pad at Pattern Studio.

Launch options: `?mode=presentation&lang=vi` or `?mode=explore&lang=en`. `?seed=42` is accepted; this slice has a fixed puzzle and map. Guided mode enables presenter skip. Explore mode hides skip. English and Vietnamese UI are local JSON files.

## Controls

| Input | Action |
|---|---|
| WASD / arrows | Move in the hub |
| E / Space | Nearby interaction; native buttons use Enter/Space |
| E | Advance guide dialogue |
| Esc / P | Pause / resume; Esc closes the current panel |
| H | Controls help |
| R | Restart M01 with confirmation |
| N | Skip M01 in presentation mode |
| F | Fullscreen, when permitted by the browser |
| M | Explain the silent demo; no audio assets are included |
| Tab / Enter | Select a paper card, then a numbered slot |

Drag cards into their matching numbered slots. A wrong placement leaves the card available and explains the expected order. There is no timer. Complete all three slots, read the recap, and select Return & collect stamp. A repeated completion does not duplicate the stamp.

Passport and pause buttons are always available during play. Pause includes help, credits, fullscreen, finish, and station return/restart. Leaving a station asks for confirmation; skipping remains skipped. The game pauses when the page is hidden. Menus block both movement and puzzle input.

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
- `src/game/minigames/PatternStudioScene.ts`: M01 scene and disposable interface.
- `src/game/core`: session store, registry, content validator, puzzle rules, and typed result boundary.
- `src/game/ui/OverlayController.ts`: readable, keyboard-accessible HTML panels and presenter controls.
- `src/content`: facts, communities, dialogues, registry metadata, and asset credits.
- `src/i18n`: Vietnamese and English text.
- `public/assets/maps/hub.json`: deterministic fictional garden map.

The map is 48×36 tiles at 32px, smaller than the full MVP map to keep the first slice compact. Camera bounds and Arcade Physics are active. Artwork is original generated pixel geometry, not final sprites. One portal works; three others clearly say available later.

To add learning content, use the record schema in `src/game/core/types.ts`, then follow [CONTENT_SOURCES.md](docs/CONTENT_SOURCES.md). Real claims need direct sources. Release-selected facts need approved status and a reviewer; community and media records need approval too. Register activities in `src/content/minigames.json`. Disabled activities must not point to playable empty scenes.

Progress is stored under `cultural-trails-v1`, with schema and content versions. Invalid or outdated progress resets safely. Blocked browser storage falls back to memory. Stamps, facts, and return position persist at meaningful transitions. Current puzzle-card placement is not saved across reload or station exit.

## Status and troubleshooting

See [IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) and [QA_REPORT.md](docs/QA_REPORT.md) for evidence and limits. Phase 2 has not started.

If the local map cannot load, the game shows an error with Reload. Check that the whole build is hosted and the server is running. If port 4281 is occupied, stop the other service or choose another preview port explicitly. Fullscreen depends on browser policy. This demo is silent; there is no missing soundtrack to troubleshoot.

Test at the actual classroom projector before presenting. Touch movement, final cultural material, audio, M02/M03, and a full guided finale are future milestones.
