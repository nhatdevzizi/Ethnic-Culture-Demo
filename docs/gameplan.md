# Cultural Trails / Hành Trình Sắc Màu

## Pitch
Nhật helps prepare an intercultural exhibition in Cultural Crossroads, a fictional festival garden. Walk, talk, try activities, and record learning in a passport.

## Core gameplay loop
Title → walk through the hub → speak with a guide → enter a station → read instructions → arrange fictional paper-model steps, follow a visual hit/rest rhythm, or question fictional helpers → receive feedback → return to the same portal with a stamp.

## Game rules
WASD/arrows move; E/Space interacts only within range. Dialogue and menus block movement. Mistakes explain the next step and allow unlimited retries. Stamps are unique. Skips stay skipped. Saves contain serializable progress only and recover safely from invalid data.

## Win / lose conditions
The demo has three playable activities. Each earns one unique participation stamp. M02 has normal/slow timing and a fully untimed alternative. There is no permanent failure. Guided mode follows the registry through completed or skipped stations to honest review cards. Phase 4 adds tested accessibility and recovery controls. The full educational MVP still needs reviewed cultural content and hardware acceptance.

## Art style
Supplied pixel artwork provides all visible characters, houses, objects, vegetation, ponds and terrain. A closer 1.25× camera follows the player across an 80×60 tile world. Four trails have distinct meadow, wetland, woodland and rocky highland scenery. Wells stand beside houses; crafts share the studio courtyard; waterwheel and bridge sit at the wetland pond; the campfire has a clearing. Seeded plants stay outside roads and work areas. Generated animals were removed until supplied replacements exist. A small route map shows the player and stations. These landscapes are fictional and do not represent communities or real geography.

## Audio direction
Three original local electronic interface cues support visual rhythm and completion feedback. Sound starts muted and requires user opt-in; volume is adjustable. Pause, hidden tabs, and scene changes stop cues without stale replay. No recordings or cultural music are supplied.

## Player goals
Short term: help assemble a fictional paper exhibition. Full MVP: learn from reviewed material without treating communities as collectibles.

## Anti-goals
No multiplayer, backend, accounts, combat, quiz-only replacement, copied art, or invented cultural claims. Phase 4 hardware/reliability acceptance and M04 remain later work.

## References
- AGENTS.md is the user-approved implementation specification and scope.
- https://phaser.io/download/release/v4.2.1 — engine version.
- https://phaser.io/tutorials/create-game-app — official starter.

## Open questions
No implementation decisions block this slice. Cultural reviewers, sources, and media permission are required before public educational use.

Natural-world refinement: supplied brick, bamboo, earth and cobble roads now wind through the four activity areas. A northern stepping-stone loop, irregular lake and forest borders create a connected, original layout. New matching houses and workshop objects come from the user's sheets. world-trails.json owns route and grove placement; scenery-layout.json owns purposeful props. See NATURE_TRAILS_QA.md.
