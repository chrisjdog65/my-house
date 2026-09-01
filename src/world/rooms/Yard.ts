/**
 * Yard — terrain, lawn, driveway, walk, fence, trees, patio (STUB: to be landscaped).
 */
import type { Ctx } from '../Context';
import type { Structure } from '../Structure';
import { Prim } from '../Builder';
import { HOUSE, LOT } from '../Plan';

export function buildYard(ctx: Ctx, structure: Structure) {
  void structure;
  const ground = Prim.plane(LOT.x1 - LOT.x0 + 40, LOT.z1 - LOT.z0 + 40, ctx.mats.grass, { cast: false });
  ground.position.set(0, HOUSE.groundY, 0);
  ctx.batch.add(ground, { worldUV: true });
}
