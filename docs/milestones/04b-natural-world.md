# Natural trails and supplied roads

## Request and scope

Use the user's new matching assets and road sheet. Redesign the map with the attached forest-map image as a reference. Keep an original arrangement.

## Implemented

- Four winding routes use brick, bamboo, earth and cobble pieces from asset5.png. A stepping-stone loop joins the two northern routes.
- A masked lake, forest borders, clustered groves and open station approaches replace the previous symmetric layout.
- Matching front-facing houses come from ảnh2.png and ảnh4.png. The new upright loom, bamboo instrument, anvil and cooking hearth have fixed activity areas.
- Road generation, reserved plant space, collision checks and the map guide use the same route data. The same seed gives the same world.
- Original source files stay unchanged. Transparent PNG copies are local. Duplicate objects and ceremony scenes were not selected.

## Verification

Current results and limits are in ../NATURE_TRAILS_QA.md. This milestone changes the world view; it does not approve cultural content or enable M04.

Verified: typecheck/build PASS; 41 unit tests PASS; focused browser 7 PASS; full browser 42 PASS / 1 existing visibility SKIP; offline production 3 PASS. Shared route and water-mask checks pass across ten seeds. The release gate rejects draft content and media as expected. Main inspected the final supplied-frame sheet, lake, station views and whole-map overview.
