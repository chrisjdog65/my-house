/**
 * MasterSuite — room builder (STUB: to be furnished).
 */
import type { Ctx } from '../Context';
import type { Structure } from '../Structure';
import { roomById, LEVELS } from '../Plan';
import { ceilingDome } from '../Props';

export function buildMasterSuite(ctx: Ctx, structure: Structure) {
  void structure;
  const room = roomById('master');
  const lvl = LEVELS[room.floor];
  // placeholder light so the room is visible before furnishing
  ceilingDome(ctx, (room.x0 + room.x1) / 2, lvl.y + lvl.ceiling, (room.z0 + room.z1) / 2, room.id);
}
