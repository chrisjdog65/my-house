/**
 * Master suite (upper floor, west/front): the master bedroom, its en-suite bathroom and the
 * walk-in closet. Each room lives in its own file; shared helpers are in MasterSuite.shared.ts.
 */
import type { Ctx } from '../Context';
import type { Structure } from '../Structure';
import { buildMasterBedroom } from './MasterSuite.bedroom';
import { buildMasterBath } from './MasterSuite.bath';
import { buildWalkInCloset } from './MasterSuite.closet';

export function buildMasterSuite(ctx: Ctx, structure: Structure) {
  void structure;
  buildMasterBedroom(ctx);
  buildMasterBath(ctx);
  buildWalkInCloset(ctx);
}
