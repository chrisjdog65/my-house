# My House

A detailed, fully explorable 3D house you walk through in third person — three floors, a yard, and
hundreds of things to touch. Built with **three.js** (PBR rendering, real-time shadows, ambient occlusion,
bloom) and **Rapier** physics (smooth character controller, throwable props, swinging doors), written in
TypeScript with Vite. Every texture is generated procedurally at load time; there are no downloaded assets
except the animated character model.

## Run it

```bash
npm install
npm run dev        # open the printed URL (http://localhost:5173)
```

`npm run build` produces a static site in `dist/` (serve it with any static file server, or `npm run preview`).

The first load paints all textures (a few seconds on a modern machine); they are cached in the browser
(IndexedDB) so later visits are instant.

## Controls

| Key | Action |
| --- | --- |
| `W A S D` / arrows | Move (camera-relative) |
| Mouse | Look (click the game to capture the pointer; drag if pointer lock is unavailable) |
| `Shift` | Sprint |
| `Space` | Jump |
| `C` | Crouch |
| `E` / click | Interact — doors, light switches, lamps, fireplace, TVs, faucets, appliances… |
| click / `G` | Throw the object you are holding |
| `Q` | Drop the held object |
| Scroll | Zoom the camera |
| `V` | Swap camera shoulder |
| `F` | Flashlight |
| `Tab` | Floor-plan map |
| `H` | Hide/show HUD hints |
| `Esc` | Pause / settings |

A gamepad works too (left stick move, right stick look, A jump, X interact, B crouch, RB throw, Start pause).

## What's in the house

Three floors and a yard, all built from code — roughly 190 interactive objects and 90 light sources.

- **Ground floor** — foyer with a coat rack and console, living room with a **working fireplace**
  (animated flames, embers, flickering light, crackle) and a TV that switches on, dining room with a
  chandelier and set table, kitchen with an island, granite counters, a range with an opening oven,
  a French-door fridge, a pop-up toaster and a running faucet, a breakfast nook, powder room, and a
  study with bookshelves and a desk.
- **Upstairs** — master suite (king bed, ceiling fan, en-suite with a freestanding tub, glass shower and
  double vanity, walk-in closet with 24 hanging garments), kids' room with a bunk bed and toy chest,
  guest room, office bedroom, and the hall bathroom with a tub/shower and flushing toilet.
- **Basement** — rec room with a pool table, bar and big TV, laundry room with an opening washer and
  dryer, workshop with a pegboard of tools, plus the furnace, water heater and an electrical panel
  whose main breaker kills every basement light.
- **Yard** — lawn of instanced grass that sways in the wind, paver walk, driveway and street, picket
  fence with a gate that opens, trees, hedges, flower beds, a patio with a table and umbrella, a grill
  and a fire pit you can light, a shed, and path and string lights that come on at dusk.

Nearly everything responds: doors swing away from you, cabinets and drawers open, faucets run, lamps
and switches toggle, and dozens of small objects (mugs, books, fruit, balls, tools) can be picked up,
carried and thrown around with full physics.

Settings (Esc → Settings) let you change quality presets, render scale, shadows, ambient occlusion, bloom,
anti-aliasing, field of view, mouse sensitivity, camera distance, and **time of day** — the sun, sky,
shadows and the house's automatic lights all follow it, and there's an optional day/night cycle.

## Project layout

```
src/
  core/        Engine (renderer + loop), Physics (Rapier wrapper), Input, Audio (procedural SFX), Settings
  graphics/    Procedural PBR textures (painters.ts, worker pool), materials, sky/sun/light pools, post-processing
  world/       Plan.ts (floor plan), Structure.ts (walls/doors/windows/stairs/roof), Props.ts (shared furniture &
               behaviours), Builder.ts (geometry helpers + static batching), rooms/*.ts (one builder per area)
  player/      Animated character, kinematic character controller, third-person camera, carry/throw system
  ui/          Menus, HUD, settings, floor-plan map
tools/         Headless QA harnesses (Playwright): screenshot.mjs, smoke.mjs, perf.mjs, ui-shots.mjs
docs/          BUILDING.md — the API guide used to author rooms
```

### How it stays fast

Every wall, floor and piece of furniture is authored as many small meshes, then merged before the first
frame: materials that differ only in colour are folded into one vertex-coloured master, and a freeze pass
bakes any mesh that provably never moves into the static batch. What is left dynamic is only what actually
moves. Tessellation scales with feature size, the sun's shadow frustum follows the player, interior lights
are virtual and mapped onto a small pool of real lights each frame, and the renderer drops internal
resolution if the frame rate sags. Textures are generated once in a worker pool and cached in IndexedDB.

See `docs/BUILDING.md` if you want to add or change rooms.

## Credits

Character model: "Soldier" from the three.js examples (MIT). Everything else is procedural.
