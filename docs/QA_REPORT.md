# Phase 0–1 QA report

Date: 2026-10-26. Scope: one local player in a desktop browser. Tested with installed Microsoft Edge through Playwright. This is a playable fictional demo, not the full educational MVP.

## What this change does:
The game starts at a title screen and opens a top-down garden. The player can talk to An, arrange three fictional paper-model steps, and return to the same portal with one participation stamp.

## Final checks

| Check | Result | Evidence |
|---|---|---|
| Dependency install | PASS | npm installed dependencies; zero reported vulnerabilities at install |
| Exact engine | PASS | `npm ls --depth=0`: phaser@4.2.1 |
| `npm run typecheck` | PASS | Strict TypeScript; no diagnostics |
| `npm test` | PASS | 3 files, 5 tests |
| `npm run build` | PASS | Content validator and Vite production demo bundle |
| `npm run test:e2e` | PASS | 3 browser tests; final run 16.3 seconds |
| `npm run test:production` | PASS | 1 browser test; final run 4.1 seconds |
| `npm run build:release` | EXPECTED REJECTION | Draft fact lacks approval/reviewer/source and is explicitly fictional |
| `git diff --check` | PASS | No whitespace errors; Git warns about local LF/CRLF conversion |

The shell's restricted runner could not let esbuild traverse the local project path. Approved local execution ran the checks successfully. No check success is inferred from Qwen's output.

## Browser paths exercised

1. English guided title → Start → guide in range → E dialogue → Next/Close → walk right → M01 portal → instructions → wrong drag with explanation → correct three-card drag order → recap → return to exact saved position → one stamp.
2. Pause blocks held movement. Repeat M01 with keyboard select/place → still one stamp. Reload → Continue → preserved stamp.
3. Move into a flowerbed → collision. Walk to west wall → blocked. Camera scroll clamps at zero. Restart M01 with confirmation → empty puzzle. Esc opens/closes pause from a focused card. N skip → skipped status and zero stamps. Resize to 1920×1080 → 16:9 canvas. Finish → ending screen.
4. Abort local map load → persistent readable error and Reload. Esc cannot dismiss the error. Restore map request, load malformed save → title and hub recover without a stamp.
5. Cold static production build, Vietnamese explore mode → start → M01 → click-select/place → return with one stamp. All non-local requests were blocked and recorded; **zero external requests** occurred. Development snapshot/time hooks were absent. Explore mode had no skip button.

## Screenshot review

Reviewed title at 1280×720, hub at 1280×720 and 1920×1080, M01 initial and completed states at 1280×720. Pixel sprites, visible station buildings, garden beds, readable dialogue/puzzle text, and a clear center playfield are present.

Files: `output/playtest/title-1280.png`, `hub-1280.png`, `hub-1920.png`, `m01-1280.png`, `m01-completed-1280.png`, `production-vi-return.png`. These generated files are local and ignored by Git.

## Defects found and resolved

- Guide was two pixels outside its intended initial interaction range: moved guide into range.
- Qwen omitted used-card detection and excluded incorrect attempts: corrected pure rules against the existing failing test.
- Qwen narrowed the shared test command and wrote an extra harness outside its task: stopped job, restored `vitest run`, removed harness.
- Ground tiles covered world graphics: gave garden/building graphics an explicit layer.
- Completion focus scrolled the studio awkwardly: collapsed the used tray and prevented focus scrolling.
- Global shortcuts failed while a card button had focus: retain native Enter/Space but handle presenter keys globally.
- An unrelated app occupied default preview port 4173: use dedicated strict port 4281, never reuse that unrelated server.
- The return-position test read the avatar before the final movement frame settled: wait two animation frames after key release, then compare with the same strict position assertion.

## Review

Ponytail review read session storage, validation, result handling, all scene transitions, input cleanup, UI callbacks, tests, and README. Standards: strict TS, pinned engine, disposable input, external content and central progress. Spec: Phase 0–1 path, one working activity, honest disabled stations, release content gate. No unresolved blocking finding for this slice.

Qwen3-Coder 30B was verified in the local runtime and called for PatternPuzzle only. Its task was cancelled after review found incorrect behavior and edits outside the allowed files. The lead corrected and independently verified the final code. There was no successful Qwen handoff. Baseline: `e7501da98075b2e0b1129185acb862b4aea41760`.

The formal two-agent `code-review` workflow was not run: no originating issue-tracker configuration or user-supplied comparison revision exists. This report records the lead's direct Standards/Spec review and Ponytail review, not an independent review.

Verdict: Ship the Phase 1 demo for user playtest.

## Not checked / remaining risks

No real cultural content, community review, licensed audio, final art, M02/M03, or full 5–7 minute guided ending. No real projector or low-powered presentation-laptop feel test. Mobile movement/touch-first play, hidden-tab recovery, user-gesture fullscreen, broader browser coverage, and sustained performance profiling remain later checks. The map and artwork are original placeholders. Sources/credits links are provided, but no cultural claim is presented as reviewed fact.
