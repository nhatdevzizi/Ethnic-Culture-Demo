# Living trails

User-requested refinement: zoom in, enlarge the map, randomize its topology, and give each station a distinct road with its own flora, fauna and landscape.

## Scope

2560×1920 world, 1.25× player-follow camera, seeded winding roads, four fictional nature themes, clear station labels and a small route map. Existing activities, results, progress and presenter actions stay intact. The seed keeps the same world on minigame return and reload. The URL seed can choose another layout.

## Acceptance criteria

- [x] All four roads reach their station approach and stay clear of generated collision obstacles across many seeds.
- [x] Same seed produces identical roads and scenery; another seed changes their layout.
- [x] Meadow, wetland, woodland and highland roads have different ground, path, plants, animals and landmarks.
- [x] Zoom is closer than the previous 0.8× view; camera stays within the larger map on resize.
- [x] Save validation accepts the larger world. Older progress migrates to the new plaza without losing stamps.
- [x] All three activities remain playable and return to the same location; M04 stays available later.
- [x] Typecheck, unit checks, build, affected browser paths and offline loading pass.

## Exit condition

Main verifies seeded reachability, browser movement and minigame return, inspects screenshots, and records any physical playtest limits.

Technical implementation verified: 38 unit passes, 41 browser passes with 1 documented visibility skip, and 3 offline production passes. Main inspected all four regional views and the closer camera. Physical hardware rehearsal remains external. See LIVING_TRAILS_QA.md.
