# ADR 0001: Phaser scenes and external session state

## Status
Accepted by the user's specification and implementation request.

## Date
2026-10-26

## Context
The browser game needs camera following, collisions, and independent station scenes. Progress must survive scene shutdown and remain testable without rendering.

## Decision
Use the official Phaser/Vite/TypeScript starter, pin Phaser 4.2.1, use Arcade Physics, and keep progress/content/puzzle rules outside scenes. Use HTML for readable dialogue and accessibility controls. Use original neutral pixel textures until approved art exists.

## Consequences
### Positive
- Small static offline build; disposable scene objects; pure logic tests.
### Negative
- Canvas graphics need browser screenshots and actual input testing.
- The requested version must be checked against installed public declarations.

## Alternatives considered
- React menus add an unnecessary framework.
- Canvas-only dialogue makes keyboard focus and long text harder.

## Related
[Game design](../GAME_DESIGN.md), [Phase 0–1](../milestones/01-vertical-slice.md).
