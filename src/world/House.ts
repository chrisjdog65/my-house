/**
 * Assembles the whole world: structure + every room + yard.
 */
import * as THREE from 'three';
import type { Ctx } from './Context';
import { Structure } from './Structure';
import { buildLivingRoom } from './rooms/LivingRoom';
import { buildDiningRoom } from './rooms/DiningRoom';
import { buildKitchen } from './rooms/Kitchen';
import { buildFoyerHallStudy } from './rooms/FoyerHallStudy';
import { buildPowderRoom } from './rooms/PowderRoom';
import { buildMasterSuite } from './rooms/MasterSuite';
import { buildBedrooms } from './rooms/Bedrooms';
import { buildBathroom } from './rooms/Bathroom';
import { buildBasement } from './rooms/Basement';
import { buildYard } from './rooms/Yard';
import { HOUSE, LOT } from './Plan';

export interface World {
  structure: Structure;
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export async function buildWorld(ctx: Ctx, progress: (p: number, label: string) => void): Promise<World> {
  progress(0, 'Framing the house…');
  await nextFrame();
  const structure = new Structure(ctx);
  structure.build();

  // Safety ground collider under the yard (the yard builder adds the visible terrain). It has to
  // stop at the house footprint: its top face is at HOUSE.groundY = -0.9, two metres ABOVE the
  // basement floor, so carrying it straight across the footprint walled the player off partway down
  // the basement stair. Four bands around the house instead of one slab through it.
  {
    const gx0 = HOUSE.x0 - HOUSE.extWall / 2, gx1 = HOUSE.x1 + HOUSE.extWall / 2;
    const gz0 = HOUSE.z0 - HOUSE.extWall / 2, gz1 = HOUSE.z1 + HOUSE.extWall / 2;
    const fx0 = LOT.x0 - 20, fx1 = LOT.x1 + 20, fz0 = LOT.z0 - 20, fz1 = LOT.z1 + 20;
    const bands: [number, number, number, number][] = [
      [fx0, fz0, fx1, gz0], [fx0, gz1, fx1, fz1], [fx0, gz0, gx0, gz1], [gx1, gz0, fx1, gz1],
    ];
    for (const [x0, z0, x1, z1] of bands) {
      ctx.physics.addBox({ x: (x0 + x1) / 2, y: HOUSE.groundY - 0.5, z: (z0 + z1) / 2 },
        { x: x1 - x0, y: 1, z: z1 - z0 }, 0, { meta: { surface: 'grass' } });
    }
  }

  const steps: [string, (c: Ctx, s: Structure) => void][] = [
    ['Arranging the living room…', buildLivingRoom],
    ['Setting the dining table…', buildDiningRoom],
    ['Stocking the kitchen…', buildKitchen],
    ['Decorating the foyer and study…', buildFoyerHallStudy],
    ['Tiling the powder room…', buildPowderRoom],
    ['Making the master bed…', buildMasterSuite],
    ['Furnishing the bedrooms…', buildBedrooms],
    ['Plumbing the bathroom…', buildBathroom],
    ['Finishing the basement…', buildBasement],
    ['Landscaping the yard…', buildYard],
  ];
  for (let i = 0; i < steps.length; i++) {
    progress((i + 1) / (steps.length + 1), steps[i][0]);
    await nextFrame();
    try {
      steps[i][1](ctx, structure);
    } catch (e) {
      console.error('Room builder failed:', steps[i][0], e);
    }
  }
  progress(1, 'Merging geometry…');
  await nextFrame();
  const meshes = ctx.batch.build();
  const opt = optimizeDynamic(ctx.dynamic);
  console.info(`[world] static batches: ${meshes.length} (from ${ctx.batch.stats.added} parts); dynamic objects: ${ctx.dynamic.children.length} (${opt.meshes} meshes, ${opt.tinyNoShadow} tiny non-casters); interactables: ${ctx.interact.items.length}; lights: ${ctx.lights.virtual.length}`);
  return { structure };
}

/** Cheap wins on the dynamic set: tiny objects don't cast shadows (they'd only add shadow-pass draw calls). */
function optimizeDynamic(root: THREE.Object3D) {
  let meshes = 0, tinyNoShadow = 0;
  const s = new THREE.Vector3();
  root.updateWorldMatrix(true, true);
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    meshes++;
    if (!o.castShadow) return;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const bs = o.geometry.boundingSphere;
    if (!bs) return;
    o.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), s);
    const r = bs.radius * Math.max(s.x, s.y, s.z);
    if (r < 0.12) { o.castShadow = false; tinyNoShadow++; }
  });
  return { meshes, tinyNoShadow };
}

export { THREE };
