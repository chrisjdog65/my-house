/**
 * Basement — room builder entry point. The floor is split across four files:
 *   Basement.hall.ts      mechanicals, breaker panel, storage (room 'basementhall')
 *   Basement.rec.ts       rec room: sectional + TV, pool table, bar, arcade (room 'rec')
 *   Basement.laundry.ts   washer/dryer, sink, shelving (room 'laundry')
 *   Basement.workshop.ts  workbench, pegboard, tools, bikes, mower (room 'workshop')
 */
import type { Ctx } from '../Context';
import type { Structure } from '../Structure';
import { BasementPower } from './Basement.helpers';
import { buildBasementHall } from './Basement.hall';
import { buildRecRoom } from './Basement.rec';
import { buildLaundry } from './Basement.laundry';
import { buildWorkshop } from './Basement.workshop';

export function buildBasement(ctx: Ctx, structure: Structure) {
  void structure;
  const power = new BasementPower(ctx, ['basementhall', 'rec', 'laundry', 'workshop']);
  buildRecRoom(ctx, power);
  buildLaundry(ctx, power);
  buildWorkshop(ctx, power);
  buildBasementHall(ctx, power);
}
