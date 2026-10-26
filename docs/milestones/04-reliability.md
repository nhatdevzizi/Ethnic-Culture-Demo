# Phase 4 — Reliability and accessibility

Authorized by the user on 2026-10-26 after the hub layout follow-up. Preserve the 1280×720 canvas, authored campus, local fonts/assets, save schema, registry, and typed result boundary. Use at most the existing three sub-agents; no Qwen.

## Scope and ownership
- UI/accessibility agent: keyboard/focus behavior, fullscreen/resize, explicit low-motion preference, pause on interruption, visible fatal-error stop, captions and controls.
- Reliability agent: safe storage parsing, atomic result handling, content collection validation, localized missing-asset recovery, and focused unit tests.
- QA agent: independent public browser paths, keyboard-only guided play, fullscreen/resize, fault injection, throttled-browser operability, and isolated test artifacts.
- Main: architecture review, bounded integration decisions, returned-output verification/revisions, independent full checks, screenshots, and delivery/troubleshooting documentation.

## Acceptance
- A keyboard-only guided run reaches all activities and an honest ending. Native controls retain their keys; focus is visible and returns to a useful place after dialogs.
- Resizing/fullscreen preserves progress and readable controls at the two desktop targets. Shorter windows must retain usable controls instead of covering station names.
- Low motion is explicitly selectable and respects the operating-system preference by default. It reduces nonessential CSS/Phaser motion without removing necessary rhythm feedback.
- Hidden pages and lost window focus pause activity and sound. Resume cannot replay stale cues or advance a frozen rhythm unexpectedly.
- Missing critical assets show a localized recovery action. Optional fonts/audio can fail without a black screen or blocked visual/captioned play. Unexpected errors freeze gameplay behind the recovery surface.
- Malformed/outdated/inconsistent saves recover safely. Storage denial/quota failure keeps in-memory play functional and reports the storage limitation accurately.
- Invalid typed results cannot partially change progress or transition scenes. Content validators return useful errors for malformed collections and preserve the release gate.
- Existing gameplay, map, content, audio, and offline checks pass. New tests target public behavior and actual failure cases rather than implementation mirrors.
- Record browser performance observations under explicit CPU throttling; do not substitute them for a real low-powered laptop or projector acceptance test.

## Delivery limits
The code cannot supply qualified cultural approval, authentic permitted cultural media, or a physical device rehearsal. Report those as unresolved MVP acceptance items. Do not mark the complete educational MVP presentation-ready or begin Phase 5.

Status: technical implementation verified. Main checks: existing-checkout installation PASS, Phaser 4.2.1 unchanged, typecheck/build PASS, 34 unit PASS, 35 browser PASS with 1 documented real-tab visibility SKIP, and 3 final offline production PASS. Main's final four affected recovery/storage checks also pass after clearing stale loading text. Release validation still rejects the 3 fictional facts. Main reviewed settings/focus/recovery screenshots and actual CPU-throttling observations. See PHASE_4_QA.md and PRESENTER_TROUBLESHOOTING.md. Full MVP acceptance remains incomplete because qualified cultural approval and physical device/rehearsal checks are not supplied. Phase 5 remains deferred.
