/**
 * DiningRoom.decor — small architectural / lighting details for the dining room: a plaster
 * ceiling medallion under the chandelier and brass candle wall sconces (each a virtual light
 * in the room's switch group with an emissive flame that follows the switch).
 */
import * as THREE from 'three';
import { Prim } from '../Builder';
import type { Ctx } from '../Context';
import { addStatic, bulbMaterials } from '../Props';

/**
 * Plaster ceiling medallion centred on (x, ceilY, z). The profile is traversed outward so
 * every face points down into the room; the centre boss hangs 3 cm below the ceiling so the
 * chandelier canopy can tuck up inside it.
 */
export function ceilingMedallion(ctx: Ctx, x: number, ceilY: number, z: number, r = 0.36) {
  const s = r / 0.36;
  const plaster = ctx.mats.trim;
  const profile: [number, number][] = [
    [0, -0.03], [0.085 * s, -0.03], [0.1 * s, -0.012], [0.115 * s, -0.014], [0.2 * s, -0.022], [0.24 * s, -0.03],
    [0.27 * s, -0.026], [0.3 * s, -0.02], [0.33 * s, -0.008], [0.35 * s, -0.004], [0.36 * s, -0.002],
  ];
  const g = new THREE.Group();
  const m = Prim.lathe(profile, plaster, { segments: 40, cast: false });
  g.add(m);
  // a ring of small acanthus "leaves" (flattened spheres) between the two rims
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const leaf = Prim.sphere(0.018 * s, plaster, { segments: 8, cast: false });
    leaf.scale.set(1.0, 0.45, 2.2);
    leaf.position.set(Math.cos(a) * 0.17 * s, -0.026, Math.sin(a) * 0.17 * s);
    leaf.rotation.y = -a;
    g.add(leaf);
  }
  g.position.set(x, ceilY - 0.001, z);
  addStatic(ctx, g, []);
}

/**
 * Brass candle sconce mounted on a wall. Local +z points out of the wall into the room
 * (rotY: 0 faces +z, PI faces -z, PI/2 faces +x, -PI/2 faces -x). (x, y, z) is the centre of
 * the back plate; the flame sits ~0.22 m above it. Adds one virtual point light in `group`.
 */
export function wallSconce(ctx: Ctx, x: number, y: number, z: number, rotY: number, group: string, opts: { intensity?: number } = {}) {
  const mats = ctx.mats;
  const brass = mats.brass;
  const g = new THREE.Group();
  const plate = Prim.rbox(0.085, 0.19, 0.014, 0.007, brass);
  plate.position.z = 0.007;
  g.add(plate);
  const boss = Prim.cylinder(0.022, 0.028, 0.03, brass, { segments: 14 });
  boss.rotation.x = Math.PI / 2;
  boss.position.set(0, 0.0, 0.028);
  g.add(boss);
  // curved arm: quarter circle from the boss (heading out, +z) up to the cup (heading up, +y)
  const R = 0.1;
  const arc = new THREE.TorusGeometry(R, 0.0075, 8, 12, Math.PI / 2);
  arc.rotateZ(-Math.PI / 2); // arc now runs from angle -90 deg (0,-R) to 0 deg (R,0) in the XY plane
  arc.rotateY(-Math.PI / 2); // (x,y,z) -> (-z,y,x): the arc now lies in the YZ plane, starting at (0,-R,0) heading +z, ending at (0,0,R) heading +y
  arc.translate(0, R, 0.04);
  const arm = new THREE.Mesh(arc, brass);
  arm.castShadow = true; arm.receiveShadow = true;
  g.add(arm);
  const cupY = R, cupZ = R + 0.04;
  const cup = Prim.lathe([[0, 0], [0.02, 0], [0.034, 0.02], [0.036, 0.03], [0.03, 0.03], [0.02, 0.012], [0, 0.012]], brass, { segments: 14 });
  cup.position.set(0, cupY - 0.004, cupZ);
  g.add(cup);
  const drip = Prim.torus(0.026, 0.005, brass);
  drip.position.set(0, cupY + 0.026, cupZ);
  g.add(drip);
  const sleeve = Prim.cylinder(0.011, 0.012, 0.09, mats.solid(0xf4efe4, { roughness: 0.5 }), { segments: 12 });
  sleeve.position.set(0, cupY + 0.008 + 0.045, cupZ);
  g.add(sleeve);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  addStatic(ctx, g, []);

  // flame bulb (dynamic so its material can follow the switch)
  const bulbs = bulbMaterials(ctx, 0xffd9a0, 1.2);
  const flame = Prim.sphere(0.018, bulbs.on, { segments: 10, cast: false });
  flame.scale.set(0.75, 1.5, 0.75);
  const flameLocal = new THREE.Vector3(0, cupY + 0.008 + 0.09 + 0.02, cupZ);
  ctx.scene.add(g);
  g.updateWorldMatrix(true, false);
  const flameWorld = g.localToWorld(flameLocal.clone());
  ctx.scene.remove(g);
  flame.position.copy(flameWorld);
  ctx.dynamic.add(flame);
  return ctx.lights.point(flameWorld.x, flameWorld.y + 0.02, flameWorld.z, {
    group, intensity: opts.intensity ?? 3.5, distance: 4.5, color: 0xffdcae, emissives: [{ mesh: flame, on: bulbs.on, off: bulbs.off }],
  });
}
