# Building the house — API guide for room builders

Everything in the world is built procedurally from code. This guide is the contract every room
builder follows so that rooms look consistent, batch efficiently, and collide correctly.

## Coordinates & conventions

- Units are **metres**, Y is up, **+Z is the front of the house (street)**, +X is east.
- Floor levels (`LEVELS` in `src/world/Plan.ts`): basement `y=-2.95` (2.6 clear), ground `y=0` (2.7 clear), upper `y=3.05` (2.6 clear).
- Room rectangles, walls, doors and windows are defined in `src/world/Plan.ts` (`ROOMS`, `WALLS`, `OPENINGS`, `STAIRS`).
  Use `roomById('kitchen')` to get `{x0,z0,x1,z1,floor,...}`. Interior walls are 0.12 thick (so a room's usable
  space starts 0.06 inside the rectangle edge), exterior walls are 0.30 thick (0.15 inside the edge).
- Doors swing into the room indicated by `swing` in `OPENINGS` — keep a 1 m clear arc in front of every door.
- Every room builder receives `(ctx: Ctx, structure: Structure)`. `structure.doors.get('frontDoor')` gives a `Door`.

## The `Ctx` object (`src/world/Context.ts`)

| member | use |
| --- | --- |
| `ctx.mats` | `MaterialLibrary` — cached PBR materials. **Always reuse these** (a unique material breaks batching). |
| `ctx.tex` | `TextureLibrary` — canvas artwork: `art(i)`, `photo(i)`, `rug(variant, aspect)`, `bookRow(seed)`, `label(text, opts)`, `chalkboard()`, `foliage(kind)`, `clockFace()`. |
| `ctx.batch.add(obj, {worldUV?})` | Static geometry sink. Bakes the object's **world** transform and merges by material. The object must NOT also be in the scene. |
| `ctx.dynamic` | `THREE.Group` for things that move, animate, are transparent, or are interactable. |
| `ctx.physics` | `addBox(center, size, rotY?)`, `addCylinder(center, r, h)`, `addBoxForObject(obj, size, localCenter)`, `addDynamic(...)`. |
| `ctx.lights` | `point(x,y,z,opts)`, `spot(x,y,z,opts)`, `setGroup(group, on)`, `toggleGroup`. Lights are virtual; the nearest ones are rendered. |
| `ctx.interact.add(item)` | Register an `Interactable` (`object`, `getPrompt()`, `interact()`, optional `update(dt)`, `proximity`, `radius`). |
| `ctx.audio.play(name, pos?)` / `startLoop(id, kind, pos)` | Procedural sound effects. |
| `ctx.onUpdate((dt, t) => …)` | Per-frame callback (animation). |
| `ctx.rng()` | Deterministic random in [0,1) for placement variety. |
| `ctx.daylight()` | 0 (night) … 1 (day). |

## Geometry helpers (`src/world/Builder.ts`)

`Prim.box(w,h,d,mat)`, `Prim.boxUp(w,h,d,mat)` (bottom at y=0), `Prim.rbox(w,h,d,radius,mat)` (rounded/bevelled),
`Prim.rboxUp`, `Prim.cylinder(rTop,rBottom,h,mat)`, `Prim.cylinderUp`, `Prim.sphere(r,mat)`, `Prim.capsule`, `Prim.lathe(points,mat)`,
`Prim.plane(w,d,mat)` (faces +Y), `Prim.quad(w,h,mat)` (faces +Z), `Prim.extrude(shape, depth, mat)`, `Prim.torus`, `Prim.cone`.

All `Prim` meshes get **metric UVs** automatically (1 texture repeat = `material.userData.texSize` metres), so wood grain and
tiles stay at real-world scale regardless of the mesh size. Pass `{ keepUV: true }` for image-mapped meshes (art, rugs, labels).

`place(obj, x, y, z, rotY)` sets position/rotation. `mergeByMaterial(group)` collapses a compound object into one mesh per
material — use it for dynamic compound objects (an appliance with a hinged door, a lamp) to keep draw calls low.

## Shared props (`src/world/Props.ts`)

- `addStatic(ctx, group, [{ size:[w,h,d], center:[x,y,z] }...], { surface })` — batch a finished group **and** add box colliders (in the group's local space).
- `collider(ctx, x, y, z, w, h, d, rotY)` — a static box collider in world space.
- Pickups (physics props you can carry/throw): `pickup(ctx, mesh, { name, mass, shape })`, `looseBook(ctx,x,y,z,rotY,color,name)`, `mug(ctx,x,y,z,color)`, `ball(ctx,x,y,z,r,color)`.
- Lights: `recessedLight(ctx,x,ceilY,z,group)`, `ceilingDome(ctx,x,ceilY,z,group)`, `pendant(ctx,x,ceilY,z,drop,group,{shadeColor})`,
  `tableLamp(ctx,x,y,z,{group,label})`, `floorLamp(ctx,x,y,z,{group})`, `lightSwitch(ctx,x,y,z,rotY,group,label)` (rotY: 0 faces +z, π faces −z, π/2 faces +x, −π/2 faces −x).
  **Every room needs at least one light group and a switch by its door** (switch centre 1.2 m above the floor, ~0.15 m beside the door casing, plate 0.01 m proud of the wall face).
- Decor: `pictureFrame(ctx,x,y,z,rotY,w,h,texture)`, `rug(ctx,x,y,z,w,d,variant,rotY)`, `plant(ctx,x,y,z,size)`, `bookRow(ctx,x,y,z,width,rotY)`,
  `curtains(ctx,x,y,z,rotY,windowW,top)`, `wallClock(ctx,x,y,z,rotY)`.
- Behaviours: `Toggle(object, {on,off}, onChange)`, `hinged(ctx, parent, hingePos, build(pivot), label, {maxAngle, axis, sfx})` for cabinet/fridge/oven doors.

## Materials (`ctx.mats`)

Textured presets: `oakFloor walnutFloor greyPlank oak walnut maple mahogany pine espresso beadboard wall(color) ceiling brick brickPale stone concrete concreteDark
tile tileDark tileCheck subway marble marbleDark granite carpet(color) carpetBlue fabric(color) leather(color) leatherBlack quilt(color) siding(color) shingles grass asphalt pavers bark steel paintedMetal(color) soil`.
Solids: `white trim black chrome brass darkMetal ceramic plasticWhite plasticBlack screenOff mirror glassClear glassFrosted water`,
plus `solid(color, {roughness, metalness, clearcoat, sheen, opacity, ...})`, `emissive(color, intensity)`, `image(texture, opts)`.

## Rules for a good room

1. **Static vs dynamic.** Furniture, trim, decor → build in a `THREE.Group`, position it, then `addStatic(ctx, group, colliders)`.
   Only interactable or animated things go to `ctx.dynamic` (and use `mergeByMaterial` for compound ones).
2. **Colliders** on everything the player could walk into (boxes are fine; approximate). Nothing on small decor (books on a shelf, cups).
3. **Realistic scale** (chair seat 0.45 m, table 0.75 m, counter 0.9 m, bed 0.55 m top, door handle 1.0 m, switch 1.2 m, art centre 1.55 m).
4. **Keep clearances**: door swings, window sills (don't put tall furniture in front of windows), walking paths ≥ 0.9 m.
5. **Detail**: bevel edges (`rbox`), add small objects (cups, books, remotes, cushions, towels), vary colours with `ctx.rng()`.
6. **Interactions**: each room should have several — lamps, switches, appliances with hinged doors, pickups, toggles with sound.
7. **Performance**: reuse `ctx.mats.*`; avoid per-object `new THREE.MeshStandardMaterial`; prefer boxes/lathes over high-poly spheres.
   The static batch folds materials that differ only by colour into one vertex-coloured draw call, so colour variety is free —
   but every mesh left in `ctx.dynamic` costs a draw call in *every* pass (main, sun shadow, point shadow ×6, AO). Rules:
   - Only the parts that actually move or change material go in `ctx.dynamic`; the rest of the same object goes through `addStatic`.
   - Compound dynamic objects (appliance + hinged door, lamp base + shade) must be collapsed with `mergeByMaterial` — aim for ≤ 3 meshes per object.
   - Budget: ≤ 40 dynamic meshes per room, ≤ 1.5k triangles per dynamic object. `node tools/perf.mjs --room <id>` lists the offenders.
   - `Prim` already clamps tessellation by size (tiny knobs get 8 segments, small bevels 1 subdivision) — don't pass large `segments` for small parts.
8. **Check**: `npx tsc --noEmit` must pass. Capture your room with
   `node tools/screenshot.mjs --url http://127.0.0.1:5173 --out shots/<room> --only <shotNames> --w 1024 --h 576` and look at the PNGs.
   Custom views: `--custom "name:x,y,z,playerYaw,camYaw,camPitch,dist"` (camera sits at pivot + (sin camYaw, ·, cos camYaw) × dist and looks back).
