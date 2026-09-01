/**
 * Bedrooms — room builder for the upper floor: upstairs hall, kids bedroom (bedroom2),
 * guest bedroom (bedroom3), office bedroom (bedroom4) and its closet (closet2).
 * Each room lives in its own `Bedrooms.<room>.ts` module; shared helpers are in `Bedrooms.shared.ts`.
 */
import type { Ctx } from '../Context';
import type { Structure } from '../Structure';
import { buildUpperHall } from './Bedrooms.hall';
import { buildKidsRoom } from './Bedrooms.kids';
import { buildGuestRoom } from './Bedrooms.guest';
import { buildOffice } from './Bedrooms.office';
import { buildCloset2 } from './Bedrooms.closet';

export function buildBedrooms(ctx: Ctx, structure: Structure) {
  void structure;
  const rooms: [string, (c: Ctx) => void][] = [
    ['upperhall', buildUpperHall],
    ['bedroom2', buildKidsRoom],
    ['bedroom3', buildGuestRoom],
    ['bedroom4', buildOffice],
    ['closet2', buildCloset2],
  ];
  for (const [id, build] of rooms) {
    try {
      build(ctx);
    } catch (e) {
      console.error(`[bedrooms] ${id} failed:`, e);
    }
  }
}
