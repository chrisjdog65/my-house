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

- **Ground floor**: foyer, living room with a working fireplace and TV, dining room, kitchen with island and
  breakfast nook, powder room, study, and the stairs.
- **Upstairs**: master suite (bedroom, en-suite bathroom, walk-in closet), kids' bedroom, guest bedroom,
  office bedroom, hall bathroom.
- **Basement**: rec room (bar, pool table, big TV), laundry room, workshop, furnace room and stairs.
- **Yard**: lawn, walkway, driveway, fence, trees, flower beds, patio with grill and fire pit, shed.

Settings (Esc → Settings) let you change quality presets, render scale, shadows, ambient occlusion, bloom,
anti-aliasing, field of view, mouse sensitivity, camera distance and **time of day** (the sun, sky and
house lights follow it).

## Project layout

```
src/
  core/        Engine (renderer + loop), Physics (Rapier wrapper), Input, Audio (procedural SFX), Settings
  graphics/    Procedural PBR textures (painters.ts, worker pool), materials, sky/sun/light pools, post-processing
  world/       Plan.ts (floor plan), Structure.ts (walls/doors/windows/stairs/roof), Props.ts (shared furniture &
               behaviours), Builder.ts (geometry helpers + static batching), rooms/*.ts (one builder per area)
  player/      Animated character, kinematic character controller, third-person camera, carry/throw system
  ui/          Menus, HUD, settings, floor-plan map
tools/         Headless screenshot + gameplay smoke-test harnesses (Playwright)
docs/          BUILDING.md — the API guide used to author rooms
```

See `docs/BUILDING.md` if you want to add or change rooms.

## Credits

Character model: "Soldier" from the three.js examples (MIT). Everything else is procedural.
