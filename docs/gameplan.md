# Cultural Trails / Hành Trình Sắc Màu

## Pitch
Nhật helps prepare an intercultural exhibition in Cultural Crossroads, a fictional festival garden. Walk, talk, try activities, and record learning in a passport.

## Core gameplay loop
Title → walk through the hub → speak with a guide → enter a station → read instructions → arrange three fictional paper-making steps → receive feedback → return to the same portal with a stamp.

## Game rules
WASD/arrows move; E/Space interacts only within range. Dialogue and menus block movement. Mistakes explain the next step and allow unlimited retries. Stamps are unique. Skips stay skipped. Saves contain serializable progress only and recover safely from invalid data.

## Win / lose conditions
Phase 1 ends when M01 returns to the hub with one stamp. There is no permanent failure or timer. The full MVP later adds three stations and a recap.

## Art style
Original top-down pixel art; warm paper, dark ink, green garden, coral roofs, and golden paths. Camera follows the player within a deterministic map. HTML panels carry long text; the center remains clear while walking.

## Audio direction
Silent prototype. No recordings or cultural music are supplied. Sound will remain off until a user gesture after licensed audio is added.

## Player goals
Short term: help assemble a fictional paper exhibition. Full MVP: learn from reviewed material without treating communities as collectibles.

## Anti-goals
No multiplayer, backend, accounts, combat, quiz-only replacement, copied art, or invented cultural claims. Phase 2 is outside this delivery.

## References
- AGENTS.md is the user-approved implementation specification and scope.
- https://phaser.io/download/release/v4.2.1 — engine version.
- https://phaser.io/tutorials/create-game-app — official starter.

## Open questions
No implementation decisions block this slice. Cultural reviewers, sources, and media permission are required before public educational use.
