# Phase 4 — Reliability and accessibility QA

Date: 2026-10-26. **Technical implementation verified. Full MVP acceptance remains incomplete.** Qualified cultural review and physical presentation-device checks are still required. Phase 5 was not started.

## Implemented behavior
- Low motion follows the operating-system preference on startup. Pause/Presenter provides an explicit override with safe separate storage. Walking still works without the nonessential walk animation. Rhythm captions and necessary beat feedback remain.
- Keyboard-only guided play reaches all three activities and the ending. Native Tab/Shift+Tab, Enter/Space, and slider arrows remain usable. Core buttons have 44px minimum targets and visible focus.
- The camera reserves actual HUD space after resize/fullscreen. Short 1280×650 and large 1920×1080 windows retain progress and clear station plaques.
- Window blur and hidden-page handling pause play and sound. Held movement keys reset on interruption. Resume requires an explicit action and does not replay old cues.
- Critical image/map failures show localized recovery. Optional font/audio failures leave visual play available. Audio failure updates an already open caption immediately.
- Fatal errors freeze active scenes, input, and sound behind a focused reload surface. Saved stamps survive reload; the current attempt restarts. Stale loading text is cleared.
- Malformed/outdated/inconsistent saves recover safely. Bad JSON is not mislabeled as a storage outage. Denied storage and quota failures retain playable in-memory progress and a visible warning.
- Result handoffs validate station, mode, seed, destination, result, and return position before a single progress/position commit. Invalid handoffs cannot grant a stamp or start another scene.
- Content collection validation safely reports malformed records, duplicates, unsafe sources, and missing references. The demo/release distinction remains enforced.
- Development and production tests use separate artifact folders to prevent test cleanup conflicts.

```text
Input/result → Validate → Commit once → Scene transition
Fault → Freeze/recovery surface → Reload → Saved progress
```

```text
OS preference / player choice → Low-motion presentation
Blur / hidden page → Pause + stopped audio
Invalid input → No progress mutation
Unapproved content → Release blocked
```

## Independent main-agent checks
| Command/check | Result |
|---|---|
| npm install --no-audit --no-fund | PASS on the existing checkout; up to date |
| npm ls phaser --depth=0 | Phaser 4.2.1, unchanged |
| npm run typecheck | PASS; no diagnostics |
| npm test | PASS; 34 tests in 10 files |
| npm run build | PASS; final demo bundle and strict content validation |
| npm run test:e2e | 35 PASS, 1 SKIP among 36 cases; approximately 1.8 minutes |
| Final recovery/storage regression | 4 PASS after the last loading-message fix |
| Final visual capture checks | 3 PASS; critical recovery, fatal recovery, and low-motion controls |
| npm run test:production | 3 PASS on the final corrected build; 21.0 seconds |
| npm run build:release | Expected rejection of all 3 fictional, unapproved learning facts |
| git diff --check | PASS; no whitespace errors |

The installation did not change package.json or the lockfile. The local npm policy reported two blocked esbuild postinstall scripts. Existing binaries passed the real build and tests. This does not verify a clean installation on a different machine. Restricted Windows execution could not load Vite/Vitest configuration; main ran installation/build/unit checks with normal filesystem access. No game configuration was weakened to bypass that restriction.

The full browser suite passed before the final one-line recovery-toast cleanup. Main then independently reran all four affected recovery/storage cases, rebuilt, and passed all three offline checks. No test assertion was weakened.

## Browser paths and failures exercised
- Title → guide dialogue with Space → M01 card/slot actions → M02 untimed hit/rest actions → M03 evidence conversations and plan → three completed review cards. This new path uses native keyboard navigation without pointer clicks or forced focus.
- Guided/explore routes, all-skipped/unvisited endings, unique stamps, exact returns, station re-entry, camera/collision bounds, and old saved positions remain covered.
- Real fullscreen API enter/exit after a keyboard gesture; separate injected rejection confirms the browser-control fallback.
- Operating-system low motion, explicit override, reload persistence, and movement.
- Short-window controls, visible focus, real HUD/plaque intersections, and retained progress after resize.
- Critical garden image failure in Vietnamese → localized reload → successful title.
- Missing font files → fallback font launch → completed paper puzzle.
- Storage getter denial and write quota failure → warning → completed activity retained in memory.
- Malformed, outdated, and inconsistent saved progress → fresh state without false earned claims or a false storage warning.
- Injected runtime error → frozen world → reload/Continue → retained stamp.
- Missing audio → immediate open-caption warning; visual rhythm still works.
- Synthetic blur and visibility events → frozen timed rhythm and explicit resume.
- Locally served production bundle → working activities and original media with external requests blocked. Development globals remain absent.

## Skipped real-tab check
The second-tab probe called native browser tab activation and waited for document.hidden. Headless Edge kept the page visible. The test records this limit and skips its hidden-page assertion rather than treating it as passed.

Evidence: output/playtest/phase4-visibility.json records observedDocumentHidden=false and physicalAltTabTested=false. Synthetic interruption tests pass, but physical tab/application switching is not accepted by this report.

## Performance proxy
Main's full-suite run recorded actual observations under CDP CPU throttling rate 4 at 1280×720:

| Observation | Recorded value |
|---|---|
| Launch to playable hub | 952.5 ms |
| Whole proxy exercise | 2190.0 ms |
| Captured frame intervals | 187 |
| Median observed interval | 7.0 ms |
| Maximum observed interval | 187.5 ms |
| Movement during the input check | −66.7 world pixels horizontally |
| Uncaught exceptions | 0 |

The exercise also checked incorrect-action feedback, pause/resume, restart, puzzle completion, and return. Raw intervals are in output/playtest/phase4-performance.json. The samples include startup and activity transitions. They do not establish a game FPS guarantee or acceptance on a lower-powered laptop; the maximum interval shows a recorded stall under this proxy.

## Main visual review
Reviewed: phase4-focus-1280x650.png, phase4-keyboard-ending.png, phase4-critical-vi.png, phase4-fatal-recovery.png, and phase4-low-motion-control.png in output/playtest/.

Focus is clear, recovery text and reload controls are readable, and error states no longer display a loading status. Long settings/recap panels scroll; lower actions remain keyboard reachable. These screenshots do not replace audience-distance projector checks.

## Assign → verify → revise → verify
Three existing agents owned UI/accessibility, reliability/core validation, and QA. Main reviewed their outputs and independently ran the checks.

1. Reliability tests exposed false storage-outage reporting and non-atomic invalid handoffs. The reliability agent corrected the shared store/event boundary and verified the failing cases.
2. Browser tests exposed storage warnings being immediately cleared by scene setup. The UI agent fixed the shared toast behavior; the same denial/quota checks passed.
3. Keyboard-only tests needed reverse tab navigation to earlier controls. The helper uses real Tab/Shift+Tab; it does not bypass focus with forced focus or pointer actions.
4. Main screenshot review found stale loading text behind asset recovery. The UI agent cleared it in the error path. QA added the public assertion; main's four targeted checks and final build/offline checks passed.

## Changed files
- src/game/core/AccessibilityPreferences.ts and its unit tests: low-motion preference with safe fallback.
- src/game/ui/OverlayController.ts, main.ts, InputManager.ts, HubScene.ts: accessible controls, focus/interruption handling, fatal recovery, and dynamic HUD clearance.
- src/content/presentation.json, index.html, main.css, presentation.css: localized labels, recovery/settings text, focus/target sizing, and motion styles.
- SessionStore.ts and GameEvents.ts: consistent saved state and atomic validated handoffs.
- ContentValidation.ts and scripts/validate-content.ts: safe whole-content validation and useful build errors.
- PreloadScene.ts and AudioManager.ts: localized critical failure and immediate optional-audio notice.
- tests/unit/accessibility.test.ts, session.test.ts, events.test.ts, content.test.ts, audio.test.ts: focused behavior and trust-boundary checks.
- tests/e2e/phase4.spec.ts and Playwright configs: 17 new reliability/accessibility cases and isolated artifacts.
- README, status/tech/backlog documents, milestone 04, and PRESENTER_TROUBLESHOOTING.md: current behavior, evidence, and physical rehearsal instructions.

## MVP acceptance status
| Requirement group | Status |
|---|---|
| Existing-checkout install, typecheck, tests, and demo build | PASS; clean-device installation remains a separate check |
| Title/hub startup, movement, boundaries, and station interactions | PASS in browser tests |
| Three distinct playable activities, instructions, feedback, retry, and recap | PASS for the labeled fictional demo |
| Unique stamps, honest skips, exact returns, and lifecycle cleanup | PASS |
| Presenter controls and keyboard-only guided ending | PASS |
| Slow/untimed rhythm, captions, focus, and low-motion controls | PASS |
| Target-window resize and native fullscreen API | PASS in headless Edge; physical display acceptance pending |
| Offline production assets and local media credits | PASS |
| Release-ready reviewed cultural facts and authentic permitted material | BLOCKED; no approved real cultural learning records supplied |
| Real lower-powered laptop, speakers, projector readability, and physical tab switching | NOT VERIFIED |
| README, troubleshooting, and truthful QA delivery | DONE |

Technical work is implemented. Full educational/public presentation acceptance is not claimed. Next task: use PRESENTER_TROUBLESHOOTING.md on the intended device and obtain qualified cultural review. Keep M04 and Phase 5 deferred.
