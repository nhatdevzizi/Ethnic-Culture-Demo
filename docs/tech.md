# Tech stack

## Engine / runtime
- Engine: Phaser 4.2.1, exact dependency.
- Language: TypeScript with strict checking.
- Target: desktop browser, 960×540 virtual canvas, FIT/AUTO_CENTER.

## Libraries / frameworks
Phaser owns scene graphics, animation, cameras, and Arcade Physics. Vite builds local static files. Vitest tests pure logic. Playwright tests browser controls and captures screenshots. No React.

## Tooling
npm and lockfile; `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`. Release content gate uses `npm run build:release`. Original small generated textures need no Git LFS. System fonts need no network.

## Project layout
`src/game/scenes` owns disposable scene state. `src/game/minigames` owns scene adapters. `src/game/core` owns types, registry, puzzle rules, validation, and saved progress. `src/game/ui` owns DOM overlays. `src/content` and `src/i18n` own text/data. `tests` owns unit/browser checks. `docs` owns design and status.

## Conventions
PascalCase classes; camelCase functions; stable asset keys. Input has one DOM-aware action boundary. Scene shutdown clears scene input and UI handlers. Pause blocks both world motion and puzzle actions; hidden tabs open pause. No timers affect M01. Save schema and content version must match. URL mode/locale override loaded preferences. Debug text snapshot and time hook exist only in development.

## Out-of-scope dependencies
No server, network APIs, UI framework, remote fonts, analytics, or audio libraries. Add audio only with permission metadata.
