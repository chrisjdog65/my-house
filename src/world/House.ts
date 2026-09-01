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

  // Safety ground collider under everything (the yard builder adds the visible terrain).
  ctx.physics.addBox({ x: 0, y: HOUSE.groundY - 0.5, z: 0 }, { x: LOT.x1 - LOT.x0 + 40, y: 1, z: LOT.z1 - LOT.z0 + 40 }, 0, { meta: { surface: 'grass' } });

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
