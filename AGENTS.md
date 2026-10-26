AGENTS.md — Cultural Trails / Hành Trình Sắc Màu
Instructions for AI coding agents working on an educational 2D browser game built with Phaser.
Status: implementation specification. Cultural facts, community names, language samples, recordings, artwork, and captions must be researched and reviewed before public presentation.

Mandatory user rule — Main agent and up to three sub-agents
- Do not use Qwen Local or the qwen-local-orchestrator workflow. This rule replaces the earlier Qwen-only coding requirement.
- The main agent may use at most three sub-agents in total for the active task, including any nested delegation. Reuse those agents for revisions; sub-agents must not create additional agents without the main agent accounting for this limit.
- Coding work may be assigned to sub-agents. The main agent owns task scope, shared contracts, integration decisions, and final verification against the current system architecture.
- Follow this loop: main assigns bounded work and acceptance criteria → sub-agent returns output → main reviews architecture fit and runs relevant checks → main assigns concrete revisions → main verifies the revised output. Repeat until the integrated result matches the existing system and works functionally.
- Review connected callers, state ownership, scene lifecycle, registry, typed events, content boundaries, and input/audio cleanup where affected. A sub-agent success report alone does not prove correctness or passing tests.
- Verify returned work before accepting it or assigning dependent work. Preserve existing changes and keep agent file ownership clear to prevent conflicting edits. Report unresolved external blockers honestly; do not claim completion while functional or architectural failures remain.
- This rule takes precedence over earlier project or skill guidance requiring Qwen or a different agent workflow.

0. Agent mission
Build a complete, playable, presentation-ready, original 2D pixel-art educational adventure inspired by the structural design of Google's Doodle Champion Island Games: one explorable top-down hub, NPCs, portals to mechanically different minigames, short side quests, collectible rewards, and a final recap.

The subject is ethnic communities and cultural diversity. The initial configuration may target communities in Vietnam, but all named communities, geography, written content, and minigame facts must come from external content files so the topic can change without rewriting game logic.

Do not recreate or reuse Champion Island's sprites, characters, maps, dialogue, audio, branding, level layouts, or proprietary art. Create an independent fictional educational hub and original visual identity.

Primary deliverable: a working browser game, not merely mockups, sample scenes, or pseudocode. Ship the MVP described below before optional features. Do not silently replace a game with an informational website or a quiz-only app.
1. Product goals and scope
Player experience
1. The player arrives at a welcoming central plaza named Cultural Crossroads (a fictional festival hub, not a literal map of any ethnic community or region).
2. The player walks through a top-down pixel-art world (WASD or arrow keys).
3. NPCs introduce learning objectives in short, skippable conversations.
4. The player enters distinct stations/portals to play independent minigames.
5. Each minigame teaches a specific, sourced fact or concept before, during, and after gameplay.
6. Completing activities earns passport stamps (not trophies for “mastering” someone else's culture).
7. A concluding scene summarizes what was learned and gives the presenter a closing transition.
Audience and session modes
- Presentation mode (MVP): guided, deterministic route through 3 completed minigames, about 5–7 minutes of audience-facing content; all dialogue can be advanced, failed steps retried, and any challenge skipped by the presenter without blocking the ending.
- Explore mode: free roaming with 4 minigame stations (the fourth can be an optional/post-MVP station). No hard overall time limit.
- Default display is 16:9 landscape, desktop browser and classroom projector first. Responsive pointer/touch controls are a secondary but planned requirement.
- Initial UI language: Vietnamese; provide English localization infrastructure and English UI labels for core navigation. No unsourced translations into a community's language.
- The game runs with no account, backend, multiplayer, external API, or network requirement after assets are hosted locally.
Out of scope for MVP
No multiplayer, global leaderboard, procedural world generation, paid assets, complex combat, backend, personal data collection, or seven simultaneously developed minigames. Do not add these until the core presentation is fully playable.
2. Technology decisions
- Engine: Phaser 4.2.1, pinned in package.json (do not accidentally write Phaser 3-only code).
- Language: TypeScript with strict mode.
- Bundler: Vite; vanilla HTML/CSS for small accessible presentation and dialogue overlays. Do not add React merely for menus.
- World authoring: Tiled JSON tilemaps or equivalent small deterministic local map data.
- Physics: Phaser Arcade Physics for simple top-down collision and movement; custom logic (not physics) for rhythm and drag/drop interactions.
- Storage: in-memory session state plus optional localStorage with safe fallback and schema versioning.
- Testing: Vitest for pure logic and Playwright (or a comparable browser runner) for smoke paths if feasible.
- Deployment: static site distributable with npm run build; all essential fonts, sprites, audio, JSON, and CSS must be local assets.
Bootstrap, when creating a fresh project:
npm create @phaserjs/game@latest cultural-trails
# Select a Vite + TypeScript, framework-free starter if prompted.
cd cultural-trails
npm install phaser@4.2.1 --save-exact
npm install
npm run dev
Inspect the generated scripts instead of assuming their precise names. Prefer the public Phaser 4.2.1 API and official examples. Keep a conventional npm run build, npm run typecheck, and npm test available.
3. Game design principles
1. Gameplay must express knowledge. Do not append unrelated trivia to a generic obstacle course and call it educational.
2. Every station has different input and challenge mechanics. The MVP cannot consist of three reskinned multiple-choice quizzes.
3. Short readable encounters. Each NPC dialogue card should typically fit within 1–3 brief sentences, with a clear Next/Close button.
4. Learn → practice → feedback → remember. Show a short fact/context introduction, teach rules, provide interactive practice, and display a contextual recap.
5. No permanent failure. Incorrect actions receive explanatory feedback, hints, and unlimited retries. Do not grade a culture or community as “good” or “bad.”
6. Presentation-safe. Allow pause, restart, mute, skip, go to hub, and finish at any point, without a soft lock.
7. Progressive enhancement. Gameplay must work with placeholder art and missing optional sound. Polish after functionality.
8. Original and respectful. Use original characters and artwork; don't cosplay or caricature communities for visual novelty.
4. Educational minigames
Implement M01–M03 fully in the MVP. Prepare the registry, data, and a portal for M04; complete M04 after the MVP works. A station can contain examples from multiple communities; do not force one community to be represented by only one trait.
ID	Working name	Primary mechanic	Learning objective	Player loop	MVP
M01	Pattern Studio	Drag-and-drop ordering / spatial puzzle	Learn how a documented textile or craft process works, and what a verified pattern or material represents	Read short explanation → position 3–5 items/steps → get hint or explanation → earn stamp	Yes
M02	Sound Garden	Rhythm / listening / timed inputs	Notice characteristics of a documented instrument or publicly shareable musical example	Listen and read captions → follow simple 4–8 beat pattern → retry at slower speed → recap	Yes
M03	Story Trail	Branching dialogue / evidence-based decisions	Learn how people describe daily life, identity, language, or community participation without stereotypes	Speak to 2–3 NPCs → choose a question/action → observe consequence → revisit information → recap	Yes
M04	Heritage Explorer	Top-down route-finding / clue collection	Connect multiple sourced places, objects, stories, or historical details without turning the game into a false geographical map	Follow clues → navigate compact level → inspect discoveries → solve final clue → recap	After MVP


Content gating: If a real textile sequence, music excerpt, greeting, ritual, or community detail lacks a source/review, substitute clearly fictional, neutral prototype materials or mark the station unpublished. Do not improvise culturally specific words, performances, or symbols.
Required mechanics per minigame
- Introduce its learning objective and controls in an instruction overlay.
- Implement at least one player action that changes the game state (not just clicking Next).
- Present at least one sourced and context-appropriate fact once content is approved.
- Give specific feedback for mistakes and a visible recovery path.
- Emit a typed completion/skip result; do not directly manipulate other scene state.
- Return the player to the same hub portal position, preserve stamps, and avoid leaked input listeners or looping sounds.
- Handle paused/hidden tabs and resize; no rhythm or timer should become impossible after tab switches.
- Provide a reduced-difficulty or untimed accessibility option where timing is involved.
Stretch minigame ideas (do not start before MVP acceptance)
- Community Stories: drag scene elements into a timeline of an approved first-person account.
- Object & Context: matching artifacts to accurate descriptions with explanation; avoid reducing the game to memorization.
- Language Listening: optional, consented recordings with captions and pronunciation context; no AI-invented vocabulary.
- Contemporary Connections: identify everyday scenarios showing that cultures evolve and communities participate in contemporary life.
5. World, story, and visual direction
Story premise
The player is a young visitor name Nhật helping prepare an intercultural learning exhibition. Friendly guides invite the player to visit activity stations, learn from approved information, and assemble a Cultural Passport. The finale celebrates understanding and curiosity, not “collecting cultures.” The guides are characters, not representatives claimed to speak for whole communities.
Hub requirements
- A top-down map, initially approximately 64 × 48 tiles, at 32 px/tile (adjust if it improves layout or performance).
- Clear central plaza, four walkable station entrances, return paths, and a final exhibition board.
- At least 4 interactable NPCs/objects and 3 working portals.
- Camera follow with world bounds, collision boundaries, foreground/background decoration, and simple idle/walk animation.
- Interaction indicators (E / Space) appear only within range; prevent interaction spam.
- Each portal shows station name, a short objective, and status: not started, in progress, completed, or available later.
- Keep an always-accessible passport/progress menu and a small legend for controls.
- The geography is visibly fictional. Do not imply all communities inhabit one generic “ethnic village.”
Art style
- Bright original top-down 2D pixel art inspired by late-1990s adventure games; not Google Doodle asset recreation.
- Virtual canvas target: 960 × 540 with Phaser Scale.FIT and AUTO_CENTER; test 1280 × 720 and 1920 × 1080 browser windows.
- Nearest-neighbor/pixel-art rendering, layered tiles, a compact palette, original silhouettes and environment sprites.
- Prefer 32×32 tiles and coherent sprite sizing. Use readable non-pixel fonts for longer educational text if needed.
- Distinguish stations by activity and UI symbol, not by reductive color/costume stereotypes.
- Text, images, and audio need credits/permission metadata. Use labeled placeholder assets until replacement art is approved.
6. Content accuracy, permissions, and ethics — mandatory
The game is about real people. Representation is a product requirement, not optional polish.
- Describe living, internally diverse, contemporary communities. Avoid exoticizing language (“primitive,” “untouched,” “mysterious tribe”), generalized costumes, or implying everyone has identical beliefs or practices.
- Attribute a claim to a specific community, location, time, and source where relevant. Say “some” or specify context when facts are not universal.
- Separate historical practice, contemporary practice, fictional narrative, and game abstraction.
- Avoid ritual, sacred, restricted, or private media unless explicit appropriate permission exists; public online availability does not imply permission to remix.
- Obtain licensed audio/visual assets and seek consultation/approval from knowledgeable cultural reviewers or community members where feasible.
- No simulated accents, AI-generated “traditional” songs presented as authentic, invented greetings, or mashups of sacred patterns.
- A user must be able to see a short Sources and Credits screen with clickable citations/attribution.
- If information is disputed or unverified, flag it in source data and exclude it from publishable content.
- Do not present educational correctness as a judgment on cultural values. Score task completion, not cultural beliefs.
- Use authentic community names and orthography as provided by verified sources; do not silently normalize names.
Content records
Keep all public-facing learning facts in JSON data files separate from scene code. A valid record must include fields equivalent to:
type ReviewStatus = 'draft' | 'verified' | 'approved';

type LearningFact = {
  id: string;
  communityIds: string[];       // empty for general factual concepts
  title: { vi: string; en?: string };
  body: { vi: string; en?: string };
  context?: { place?: string; period?: string; qualifiers?: string[] };
  sourceUrls: string[];         // at least one for real-world factual claims
  reviewStatus: ReviewStatus;
  reviewer?: string;
  permittedAssetIds?: string[];
};
Additional community records: id, approved display name, alternate names (when appropriate), non-essentialized short description, relevant places only when sourced, sourceUrls, and reviewStatus. Asset manifest records: path, creator, license/permission, attribution text, allowed use, and review status.

Implement validation so a build in presentation/release mode fails if selected facts lack a source or an approved status. During development, show conspicuous DEMO / UNVERIFIED CONTENT labels rather than quietly treating prototype text as verified.
7. Technical architecture
Use Phaser Scenes for gameplay; pure TypeScript services for content and progress; small HTML/CSS overlays for legible dialogs and presentation controls. A Phaser Scene owns graphics and scene-local input, while a central store owns persistent game state.
Suggested directory layout
.
├── AGENTS.md
├── README.md
├── package.json
├── index.html
├── public/
│   └── assets/
│       ├── tiles/               # licensed/original tile spritesheets
│       ├── sprites/             # avatar, NPCs, interactables
│       ├── ui/                  # icons, passports, panels
│       ├── audio/               # approved music and SFX
│       └── maps/                # Tiled JSON and tileset references
├── src/
│   ├── main.ts
│   ├── game/
│   │   ├── config.ts
│   │   ├── scenes/
│   │   │   ├── BootScene.ts
│   │   │   ├── PreloadScene.ts
│   │   │   ├── TitleScene.ts
│   │   │   ├── HubScene.ts
│   │   │   └── EndingScene.ts
│   │   ├── minigames/
│   │   │   ├── PatternStudioScene.ts
│   │   │   ├── SoundGardenScene.ts
│   │   │   ├── StoryTrailScene.ts
│   │   │   └── HeritageExplorerScene.ts
│   │   ├── core/
│   │   │   ├── SessionStore.ts
│   │   │   ├── MinigameRegistry.ts
│   │   │   ├── GameEvents.ts
│   │   │   └── types.ts
│   │   ├── systems/
│   │   │   ├── InteractionSystem.ts
│   │   │   ├── DialogueSystem.ts
│   │   │   ├── AudioManager.ts
│   │   │   └── InputManager.ts
│   │   └── ui/
│   │       └── OverlayController.ts
│   ├── content/
│   │   ├── facts.json
│   │   ├── communities.json
│   │   ├── dialogues.json
│   │   ├── minigames.json
│   │   └── assets-manifest.json
│   ├── i18n/
│   │   ├── vi.json
│   │   └── en.json
│   └── styles/
│       └── main.css
├── scripts/
│   └── validate-content.ts
├── tests/
│   ├── unit/
│   └── e2e/
└── docs/
    ├── GAME_DESIGN.md
    ├── CONTENT_SOURCES.md
    ├── ART_GUIDE.md
    └── IMPLEMENTATION_STATUS.md
Scene lifecycle
Boot → Preload → Title → Hub → Station Instructions → Minigame
                        ↑                            ↓
                        └──── Results + Stamp ───────┘
                                   ↓
                            Ending / Recap
- Boot: configure language, URL mode, storage, and screen setup.
- Preload: load the minimum critical assets with real progress and failure feedback.
- Title: start/continue, settings, and choose guided/free mode.
- Hub: exploration, NPC interactions, station portals, passport.
- Minigame: independent rules and animations, typed outcome.
- Ending: cards summarizing learned facts, credits, return/reset.
Data contracts
Implement types equivalent to these; they may be refined but must stay data-driven:
type GameMode = 'presentation' | 'explore';
type StationStatus = 'not-started' | 'in-progress' | 'completed' | 'skipped';

type MinigameDefinition = {
  id: string;
  sceneKey: string;
  titleKey: string;
  objectiveKey: string;
  factIds: string[];
  estimatedSeconds: number;
  requiredInPresentation: boolean;
  enabled: boolean;
};

type MinigameResult = {
  id: string;
  outcome: 'completed' | 'skipped' | 'abandoned';
  score: number;
  learnedFactIds: string[];
  attempts: number;
};

type SessionState = {
  schemaVersion: number;
  contentVersion: string;
  mode: GameMode;
  locale: 'vi' | 'en';
  statuses: Record<string, StationStatus>;
  passportStamps: string[];
  learnedFactIds: string[];
  hubReturnPosition: { x: number; y: number };
};
Scene integration requirements
1. Register minigames once in a MinigameRegistry. The hub reads this registry to generate portals; the ending reads the same registry to determine the required sequence.
2. Scene input receives a documented payload { minigameId, mode, seed?, returnPosition }.
3. Result emission uses a single typed event or callback. The store updates first, then the scene transitions. No minigame imports another minigame's internal class/state.
4. On entering a minigame, freeze hub movement, suppress hub-level E/Space interactions, and pause/stop previous audio as needed.
5. On leaving, release all timers, input handlers, and sounds registered by the minigame.
6. Persist SessionState safely after meaningful transitions. Validate loaded progress and recover from malformed or outdated saves.
7. Provide a visible error boundary / graceful fallback if any asset fails; never show an unexplained black screen.
8. The launcher URL supports ?mode=presentation&lang=vi and ?mode=explore&lang=en. Optional ?seed=42 gives reproducible runs. Hide developer/test routes in release builds.
8. Presenter experience and accessibility
Required presenter shortcuts
Input	Behavior
WASD / arrows	Move through the hub; minigames show their own distinct controls
E / Space	Interact with nearby object or advance a dialogue, with input debouncing
Esc	Pause/options; from station, offer return to hub (never silently discard progress)
P	Toggle pause
M	Toggle audio mute
H	Show context-sensitive help / controls
R	Restart current minigame, with confirmation where destructive
N	Presenter-only skip/advance when presentation mode is active
F	Toggle full-screen after a user gesture if the browser permits


Expose clickable equivalents for these actions. Prevent scroll/shortcuts from conflicting with gameplay when the canvas is focused. Keep text legible on a projector; never convey success solely by color or audio. Provide captions for audio activities, a rhythm visualizer, keyboard focus indicators on HTML controls, low-motion settings, and a slow/untimed alternative to timed mechanics. Offer sound off by default until a user gesture satisfies browser audio policies.
Presentation flow target (configurable)
Approximate segment	Content
0:00–0:30	Title, premise, quick controls
0:30–1:15	Guided hub movement and first NPC
1:15–2:15	M01 Pattern Studio
2:15–3:15	M02 Sound Garden
3:15–4:30	M03 Story Trail
4:30–5:30	Passport recap, sources, discussion prompt


This is a target, not a hard timer. In presentation mode, NPCs and camera directions should naturally lead to the next station, but the presenter can override the route. A skipped minigame must remain marked skipped, not falsely marked completed.
Embedding and offline use
- Design for full-screen browser playback during a slideshow. Avoid relying on embeddable interactive iframes inside slide software; offer a clear “Open Game” fallback link or switch to the local browser.
- Build locally and test from a local HTTP server; do not assume file:// works with module scripts, JSON, or browser security restrictions.
- Never fetch fonts or audio from a CDN at runtime. A failed network connection must not prevent launching the presentation build.
- Provide README instructions for running the project both in development and after a production build.
9. Milestones and development order
Phase 0 — Planning and content contract
- Create README.md, docs/GAME_DESIGN.md, initial story beats, approved-content workflow, asset inventory, and minigame specs.
- Establish facts.json, localization and validation, adding obviously fictional demo content so mechanics can be tested immediately.
- Define each station's learning objective and uniquely different mechanic before implementation.
- Exit: architecture and content schemas documented; no unsourced cultural claims are shipped as fact.
Phase 1 — Walking vertical slice
- Bootstrap Vite + TypeScript + pinned Phaser 4.2.1.
- Title → playable hub → NPC dialogue → portal → placeholder minigame → hub return.
- Implement camera, collisions, safe scaling, keyboard movement, and persistent return position.
- Use temporary colored pixel tiles if final art does not exist.
- Exit: one continuous browser path works without refreshing or console errors.
Phase 2 — Three distinct minigames
- Build M01 fully with drag/drop, feedback, and result emission.
- Build M02 fully with rhythm input, caption/visual alternative, and adjustable speed.
- Build M03 fully with dialogue choices, evidence, and clear learning recap.
- Integrate statuses, stamps, passport, instructional overlays, and transitions.
- Exit: all three games differ meaningfully in player actions and support retry/skip/return.
Phase 3 — Presentation route and art
- Implement guided route, first-run tutorial, ending, review cards, source links, and presenter panel.
- Replace placeholders with original/licensed approved assets and review content with qualified people/sources.
- Add local audio, captions, adjustable volume, mute, and pause/resume behavior.
- Exit: complete 5–7 minute run can be performed from cold launch on a projector.
Phase 4 — Reliability and accessibility
- Test resizing, fullscreen, keyboard-only routes, low-powered laptop performance, hidden tabs, audio unavailable, missing assets, and malformed saves.
- Add tests for content validation, state transitions, result handling, and end-to-end guided play.
- Document offline build/server startup and presenter troubleshooting.
- Exit: all MVP acceptance checks pass.
Phase 5 — Optional expansion
- Implement M04, side quests, deeper content, mobile-first touch mode, language packs, and additional verified communities only after Phase 4 acceptance.
10. Assignment of AI agents
If multiple agents collaborate, divide responsibilities as follows. The integrator/lead alone changes shared contracts after coordinating with other agents.
Role	Owns	Must deliver
Lead / Integrator	config, scene flow, shared contracts, game registry, merge decisions	Runnable builds after each milestone; coherent cross-scene state
World Agent	HubScene, tilemap, camera, player, NPC portals	Walkable hub with collision, interaction and reproducible return position
Mechanics Agent	M01–M03 minigame scenes and unit tests	Distinct interactive mechanics using the agreed result contract
Content / UX Agent	JSON schemas/data, localization, dialogues, text overlays, attributions	Source-traceable accessible educational content and presenter flow
QA Agent	tests, smoke checks, docs, error handling	Tested routes, reproducible bugs, acceptance report, regression coverage


Handoff rules
- Read this file and docs/IMPLEMENTATION_STATUS.md before working.
- Limit changes to your assigned modules unless an integration blocker is approved.
- Do not change an event name, state schema, scene key, or input mapping unilaterally.
- Do not merge fake cultural data as approved learning content.
- For each task: state files changed, commands run, behavior verified, known issues, and the next task.
- Update docs/IMPLEMENTATION_STATUS.md after each milestone with done / in progress / blocked, including truthful results.
- Prefer a small working vertical slice over mass-generating empty stubs.
- When blocked on artwork/research, implement polished neutral placeholders and visibly document the dependency; continue mechanics work.
11. Definition of done — MVP acceptance tests
The project is not presentation-ready until all of these pass:
- [ ] npm install, npm run typecheck, npm test, and npm run build succeed (use actual documented scripts).
- [ ] Fresh browser start reaches Title, then Hub, with no uncaught exceptions.
- [ ] Player moves with WASD/arrows; walls block movement; camera stays inside map.
- [ ] At least 3 NPC/station interactions appear at correct range with readable dialogue.
- [ ] All 3 MVP minigames are playable with different mechanics, meaningful feedback, retry, and return.
- [ ] Every minigame has intro instructions, an interactive learning step, and a recap.
- [ ] A completed minigame adds exactly one stamp, and returning to a completed station does not duplicate it.
- [ ] A skipped activity remains skipped but does not prevent the presentation finale.
- [ ] Completion and return preserve player position and do not duplicate controls/audio.
- [ ] Presentation mode can start, skip, pause, mute, restart, and finish successfully.
- [ ] No unavoidable time pressure; rhythm game provides visual and slower/untimed alternative.
- [ ] All real-world claims shown in a release build have visible sources and approved review state.
- [ ] All media in release builds are original, licensed, or permission-cleared with credits.
- [ ] Game is usable at 1280×720 and 1920×1080, including browser resize/fullscreen.
- [ ] A cold production build runs without loading any assets from the internet (when served locally).
- [ ] Tested from a realistic presentation laptop: no major dropped-input, soft locks, or unreadable text.
- [ ] The README explains installation, launch, controls, modes, adding content, building and offline presentation.
- [ ] Final QA report distinguishes completed behavior from placeholders and deferred work.
12. Required agent delivery reports
At the end of each implementation phase, respond in this format:
## Implemented
- [working behavior]

## Changed files
- `path/to/file`: purpose

## Verification
- `npm run typecheck`: PASS/FAIL and meaningful output
- `npm test`: PASS/FAIL and meaningful output
- `npm run build`: PASS/FAIL and meaningful output
- Browser gameplay path checked: [exact path]

## Remaining blockers
- [missing/untested/content approval]

## Next prioritized task
- [one concrete next action]
Never claim to have executed tests that were not run or that the game is “complete” while only placeholder stations work.
13. Authoritative implementation references
- Structural game reference: https://doodles.google/doodle/doodle-champion-island-games-begin/
- Phaser documentation: https://docs.phaser.io/
- Phaser 4.2.1 release: https://phaser.io/download/release/v4.2.1
- Phaser Create Game tool: https://phaser.io/tutorials/create-game-app
- Phaser Arcade Physics overview: https://docs.phaser.io/phaser/concepts/physics/arcade
These links are technical/design references, not cultural sources or asset licenses. Maintain separate approved, directly relevant sources for any ethnic community discussed in the game.
14. First execution task for the coding agent
Start now with Phase 0 and Phase 1. Create a working Phaser 4.2.1 / TypeScript / Vite project, a title screen, a small walkable hub with a unique placeholder player sprite, one NPC conversation, one portal, one functioning drag-and-drop M01 prototype, and a correct hub return flow. Add the minigame registry and content validation infrastructure before starting M02. Use clearly marked non-cultural demo data until reviewed content is available. Run available checks, report results, and only then proceed to the remaining phases.
