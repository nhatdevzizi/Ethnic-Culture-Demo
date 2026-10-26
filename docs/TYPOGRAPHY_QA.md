# Vietnamese typography fix

Date: 2026-10-26. User request: replace fonts with Vietnamese-capable typefaces.

## Change
- Be Vietnam Pro: body, dialogue, buttons, labels and hub canvas text; actual weights 400/600/700/800.
- Lora: all headings, notebook/recap headings and decorative paper/slot type; variable weights 400–700.
- Local TTF files and complete original OFL notices are bundled under `public/assets/fonts/`. Asset credits identify both projects and their sources.
- Shared CSS tokens apply the pair consistently. Heading line height allows Vietnamese accent space. Existing sizes, colors, game state and gameplay remain intact.
- Startup loads all five font faces before creating the Phaser canvas. Failed optional font loads retain the playable fallback path.

## Sources and permissions
[Be Vietnam Pro metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/METADATA.pb) and [Lora metadata](https://raw.githubusercontent.com/google/fonts/main/ofl/lora/METADATA.pb) declare Vietnamese coverage. The original font files and licenses came from the official Google Fonts repository. No font files were modified. The application asset manifest includes the authors, OFL attribution and source links.

## Verification
- Before the fix, the new typography test failed because the game used Segoe UI/Tahoma/Arial.
- After the fix, Chromium's actual platform-font report showed only the intended custom family for Vietnamese text. The probe includes U+1EA0–U+1EF9, Vietnamese base letters, and their NFD combining-mark forms.
- Canvas draw inspection verified that Vietnamese hub labels use Be Vietnam Pro. Font metrics are loaded before those labels are created.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 14 tests.
- `npm run test:e2e`: PASS, 9 tests, including both font tests and all three activities.
- `npm run build`: PASS.
- `npm run test:production`: PASS, 2 tests. The cold Vietnamese build loads all four Be Vietnam Pro weights and the Lora face while external requests are blocked.
- Screenshots reviewed: Vietnamese title at 1280×720 and 1920×1080, hub at 1280×720, and existing activity regression/production screenshots.

## Files
`src/styles/fonts.css`, `src/main.ts`, `src/game/scenes/HubScene.ts`, `public/assets/fonts/*`, `src/content/assets-manifest.json`, `tests/e2e/typography.spec.ts`, and the production font assertions in `tests/production/offline.spec.ts`. The follow-up preserves the existing uncommitted Phase 2 work.

Qwen supplied the initial font CSS/bootstrap draft. Direct review corrected its mistaken CSS `local()` asset references to file URLs and updated canvas font families. Codex supplied the rendering checks and reviewed the screenshots.

## Limits
Tested in installed Edge/Chromium. Other browser engines, physical projector legibility and mobile movement were not re-tested. Cultural content remains the same labeled fictional demo; this typography fix does not grant content approval.
