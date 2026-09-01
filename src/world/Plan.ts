/**
 * The floor plan. Every builder (structure, rooms, map, lighting) reads from here so the
 * numbers stay consistent. Units are metres; +Z is the FRONT of the house (street side),
 * +X is east. Y is up.
 *
 * Levels:
 *   basement floor  y = -2.95   (ceiling at -0.35)
 *   ground floor    y = 0       (ceiling at 2.7)
 *   upper floor     y = 3.05    (ceiling at 5.65)
 *   roof base       y = 6.0
 *   terrain         y = -0.9
 */

export type FloorId = 'basement' | 'ground' | 'upper';

export const LEVELS: Record<FloorId, { y: number; ceiling: number; slab: number }> = {
  basement: { y: -2.95, ceiling: 2.6, slab: 0.35 },
  ground: { y: 0, ceiling: 2.7, slab: 0.35 },
  upper: { y: 3.05, ceiling: 2.6, slab: 0.35 },
};

export const HOUSE = {
  x0: -8, x1: 8, z0: -6, z1: 6,
  extWall: 0.3,
  intWall: 0.12,
  groundY: -0.9,
  roofBase: 6.0,
  roofPeak: 9.4,
  eave: 0.6,
};

export const LOT = { x0: -19, x1: 19, z0: -17, z1: 19 };

export interface RoomDef {
  id: string;
  name: string;
  floor: FloorId;
  x0: number; z0: number; x1: number; z1: number;
  /** material key used by the structure builder for the floor */
  floorMat: 'oak' | 'walnut' | 'tile' | 'tileDark' | 'tileCheck' | 'carpet' | 'carpetBlue' | 'concrete' | 'greyPlank';
  wallColor: number;
  /** ceiling light count hint (structure adds simple fixtures if room builders don't) */
  ceilingLights?: number;
}

export const ROOMS: RoomDef[] = [
  // ----- ground floor -----
  { id: 'foyer', name: 'Foyer', floor: 'ground', x0: -1.5, z0: 2.5, x1: 1.5, z1: 6, floorMat: 'tileCheck', wallColor: 0xf1ebdd },
  { id: 'hall', name: 'Hallway', floor: 'ground', x0: -1.5, z0: -1.4, x1: 1.5, z1: 2.5, floorMat: 'oak', wallColor: 0xf1ebdd },
  { id: 'stairwell', name: 'Stairs', floor: 'ground', x0: -1.5, z0: -6, x1: 1.5, z1: -1.4, floorMat: 'oak', wallColor: 0xf1ebdd },
  { id: 'living', name: 'Living Room', floor: 'ground', x0: -8, z0: 0, x1: -1.5, z1: 6, floorMat: 'oak', wallColor: 0xe9e2d0 },
  { id: 'dining', name: 'Dining Room', floor: 'ground', x0: -8, z0: -6, x1: -1.5, z1: 0, floorMat: 'oak', wallColor: 0xdfe6df },
  { id: 'kitchen', name: 'Kitchen', floor: 'ground', x0: 1.5, z0: -6, x1: 8, z1: 0.5, floorMat: 'tile', wallColor: 0xf4f1ea },
  { id: 'nook', name: 'Breakfast Nook', floor: 'ground', x0: 3.5, z0: 0.5, x1: 8, z1: 2.5, floorMat: 'tile', wallColor: 0xf4f1ea },
  { id: 'powder', name: 'Powder Room', floor: 'ground', x0: 1.5, z0: 0.5, x1: 3.5, z1: 2.5, floorMat: 'tileDark', wallColor: 0xd8dfe6 },
  { id: 'study', name: 'Study', floor: 'ground', x0: 1.5, z0: 2.5, x1: 8, z1: 6, floorMat: 'walnut', wallColor: 0xd9d2c2 },
  // ----- upper floor -----
  { id: 'upperhall', name: 'Upstairs Hall', floor: 'upper', x0: -1.5, z0: -6, x1: 1.5, z1: 6, floorMat: 'oak', wallColor: 0xf1ebdd },
  { id: 'master', name: 'Master Bedroom', floor: 'upper', x0: -8, z0: 1.5, x1: -1.5, z1: 6, floorMat: 'carpet', wallColor: 0xe4e8e2 },
  { id: 'masterbath', name: 'Master Bathroom', floor: 'upper', x0: -8, z0: -1.5, x1: -5, z1: 1.5, floorMat: 'tile', wallColor: 0xe6eef2 },
  { id: 'closet', name: 'Walk-in Closet', floor: 'upper', x0: -5, z0: -1.5, x1: -1.5, z1: 1.5, floorMat: 'carpet', wallColor: 0xefeae0 },
  { id: 'bedroom2', name: 'Kids Bedroom', floor: 'upper', x0: -8, z0: -6, x1: -1.5, z1: -1.5, floorMat: 'carpetBlue', wallColor: 0xdde8f0 },
  { id: 'bedroom3', name: 'Guest Bedroom', floor: 'upper', x0: 1.5, z0: 1.5, x1: 8, z1: 6, floorMat: 'carpet', wallColor: 0xeee6d8 },
  { id: 'bath', name: 'Bathroom', floor: 'upper', x0: 1.5, z0: -1.5, x1: 5, z1: 1.5, floorMat: 'tile', wallColor: 0xe2ecef },
  { id: 'closet2', name: 'Closet', floor: 'upper', x0: 5, z0: -1.5, x1: 8, z1: 1.5, floorMat: 'carpet', wallColor: 0xefeae0 },
  { id: 'bedroom4', name: 'Office Bedroom', floor: 'upper', x0: 1.5, z0: -6, x1: 8, z1: -1.5, floorMat: 'oak', wallColor: 0xe8e4dc },
  // ----- basement -----
  { id: 'basementhall', name: 'Basement', floor: 'basement', x0: -1.5, z0: -6, x1: 1.5, z1: 6, floorMat: 'concrete', wallColor: 0xd8d8d4 },
  { id: 'rec', name: 'Rec Room', floor: 'basement', x0: -8, z0: -6, x1: -1.5, z1: 6, floorMat: 'greyPlank', wallColor: 0xd9d4c8 },
  { id: 'laundry', name: 'Laundry Room', floor: 'basement', x0: 1.5, z0: -6, x1: 8, z1: -1, floorMat: 'concrete', wallColor: 0xdcdcd8 },
  { id: 'workshop', name: 'Workshop', floor: 'basement', x0: 1.5, z0: -1, x1: 8, z1: 6, floorMat: 'concrete', wallColor: 0xd4d4d0 },
];

export function roomById(id: string): RoomDef {
  const r = ROOMS.find((r) => r.id === id);
  if (!r) throw new Error('no room ' + id);
  return r;
}

export type OpeningKind = 'door' | 'window' | 'arch' | 'passage' | 'exteriorDoor' | 'basementWindow';

export interface OpeningDef {
  /** centre position on the wall line */
  x: number; z: number;
  /** width along the wall */
  w: number;
  /** height of the opening */
  h: number;
  /** bottom of the opening above the floor */
  bottom: number;
  kind: OpeningKind;
  /** for doors: which side the hinge is on when looking from -normal side; and swing direction */
  hinge?: 'left' | 'right';
  /** door swings toward this side of the wall (+1 = toward +normal). Wall normal is +X for walls along Z, +Z for walls along X. */
  swing?: 1 | -1;
  /** identifier so room builders can find the door (e.g. to attach behaviour) */
  id?: string;
  /** window style */
  style?: 'single' | 'double' | 'wide' | 'frosted';
}

export interface WallDef {
  floor: FloorId;
  x0: number; z0: number; x1: number; z1: number;
  thickness: number;
  exterior: boolean;
  /** override height (metres) e.g. for a half wall */
  height?: number;
  /** material override key ('siding' | 'concrete' | 'plaster') */
  material?: 'siding' | 'concrete' | 'plaster' | 'brick';
}

const EXT = HOUSE.extWall, INT = HOUSE.intWall;
const { x0: X0, x1: X1, z0: Z0, z1: Z1 } = HOUSE;

function perimeter(floor: FloorId, material: WallDef['material']): WallDef[] {
  return [
    { floor, x0: X0, z0: Z1, x1: X1, z1: Z1, thickness: EXT, exterior: true, material }, // front (+z)
    { floor, x0: X0, z0: Z0, x1: X1, z1: Z0, thickness: EXT, exterior: true, material }, // back (-z)
    { floor, x0: X0, z0: Z0, x1: X0, z1: Z1, thickness: EXT, exterior: true, material }, // west
    { floor, x0: X1, z0: Z0, x1: X1, z1: Z1, thickness: EXT, exterior: true, material }, // east
  ];
}

export const WALLS: WallDef[] = [
  ...perimeter('ground', 'siding'),
  ...perimeter('upper', 'siding'),
  ...perimeter('basement', 'concrete'),
  // ground interior
  { floor: 'ground', x0: -1.5, z0: -6, x1: -1.5, z1: 6, thickness: INT, exterior: false },
  { floor: 'ground', x0: -8, z0: 0, x1: -1.5, z1: 0, thickness: INT, exterior: false },
  { floor: 'ground', x0: 1.5, z0: -6, x1: 1.5, z1: 6, thickness: INT, exterior: false },
  { floor: 'ground', x0: 1.5, z0: 2.5, x1: 8, z1: 2.5, thickness: INT, exterior: false },
  { floor: 'ground', x0: 3.5, z0: 0.5, x1: 3.5, z1: 2.5, thickness: INT, exterior: false },
  { floor: 'ground', x0: 1.5, z0: 0.5, x1: 3.5, z1: 0.5, thickness: INT, exterior: false },
  { floor: 'ground', x0: -0.05, z0: -6, x1: -0.05, z1: -1.4, thickness: 0.1, exterior: false }, // between stair runs
  { floor: 'ground', x0: -1.5, z0: -1.4, x1: -0.05, z1: -1.4, thickness: INT, exterior: false }, // basement stair door wall
  // upper interior
  { floor: 'upper', x0: -1.5, z0: -6, x1: -1.5, z1: 6, thickness: INT, exterior: false },
  { floor: 'upper', x0: -8, z0: 1.5, x1: -1.5, z1: 1.5, thickness: INT, exterior: false },
  { floor: 'upper', x0: -5, z0: -1.5, x1: -5, z1: 1.5, thickness: INT, exterior: false },
  { floor: 'upper', x0: -8, z0: -1.5, x1: -1.5, z1: -1.5, thickness: INT, exterior: false },
  { floor: 'upper', x0: 1.5, z0: -6, x1: 1.5, z1: 6, thickness: INT, exterior: false },
  { floor: 'upper', x0: 1.5, z0: 1.5, x1: 8, z1: 1.5, thickness: INT, exterior: false },
  { floor: 'upper', x0: 1.5, z0: -1.5, x1: 8, z1: -1.5, thickness: INT, exterior: false },
  { floor: 'upper', x0: 5, z0: -1.5, x1: 5, z1: 1.5, thickness: INT, exterior: false },
  // basement interior
  { floor: 'basement', x0: 1.5, z0: -6, x1: 1.5, z1: 6, thickness: INT, exterior: false },
  { floor: 'basement', x0: 1.5, z0: -1, x1: 8, z1: -1, thickness: INT, exterior: false },
  { floor: 'basement', x0: -1.5, z0: -6, x1: -1.5, z1: 6, thickness: INT, exterior: false },
];

const DOOR_H = 2.1;
const WIN_H = 1.45, WIN_B = 0.85;

export const OPENINGS: Record<FloorId, OpeningDef[]> = {
  ground: [
    // exterior
    { x: 0, z: 6, w: 1.05, h: DOOR_H, bottom: 0, kind: 'exteriorDoor', hinge: 'left', swing: -1, id: 'frontDoor' },
    { x: 7.0, z: -6, w: 0.95, h: DOOR_H, bottom: 0, kind: 'exteriorDoor', hinge: 'right', swing: 1, id: 'backDoor' },
    { x: -6, z: 6, w: 1.5, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'double' },
    { x: -3.5, z: 6, w: 1.5, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'double' },
    { x: 4.75, z: 6, w: 1.5, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'double' },
    { x: 6.75, z: 6, w: 1.0, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'single' },
    { x: -8, z: -3, w: 1.6, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'double' },
    { x: -4.75, z: -6, w: 1.8, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'wide' },
    { x: 4.5, z: -6, w: 1.4, h: 1.1, bottom: 1.15, kind: 'window', style: 'double' },
    { x: 8, z: 1.5, w: 1.6, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'wide' },
    { x: 8, z: -3.5, w: 1.2, h: 1.1, bottom: 1.15, kind: 'window', style: 'single' },
    { x: 8, z: 4.25, w: 1.6, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'double' },
    // interior
    { x: -1.5, z: 1.25, w: 2.0, h: 2.25, bottom: 0, kind: 'arch' },
    { x: -1.5, z: 4.25, w: 2.2, h: 2.25, bottom: 0, kind: 'arch' },
    { x: -1.5, z: -0.7, w: 0.9, h: DOOR_H, bottom: 0, kind: 'door', hinge: 'left', swing: -1, id: 'diningDoor' },
    { x: -4.75, z: 0, w: 3.2, h: 2.3, bottom: 0, kind: 'arch' },
    { x: 1.5, z: -0.45, w: 1.6, h: 2.25, bottom: 0, kind: 'arch' },
    { x: 1.5, z: 1.5, w: 0.8, h: DOOR_H, bottom: 0, kind: 'door', hinge: 'right', swing: 1, id: 'powderDoor' },
    { x: 1.5, z: 4.25, w: 0.9, h: DOOR_H, bottom: 0, kind: 'door', hinge: 'left', swing: 1, id: 'studyDoor' },
    { x: -0.775, z: -1.4, w: 0.9, h: DOOR_H, bottom: 0, kind: 'door', hinge: 'left', swing: 1, id: 'basementDoor' },
  ],
  upper: [
    { x: -6, z: 6, w: 1.5, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'double' },
    { x: -3.5, z: 6, w: 1.5, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'double' },
    { x: 0, z: 6, w: 1.2, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'single' },
    { x: 4.75, z: 6, w: 1.5, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'double' },
    { x: -8, z: 3.75, w: 1.4, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'double' },
    { x: -8, z: 0, w: 0.8, h: 0.9, bottom: 1.35, kind: 'window', style: 'frosted' },
    { x: -8, z: -3.75, w: 1.4, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'double' },
    { x: -4.75, z: -6, w: 1.6, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'double' },
    { x: 4.75, z: -6, w: 1.6, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'double' },
    { x: 8, z: 3.75, w: 1.4, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'double' },
    { x: 8, z: 0, w: 0.8, h: 0.9, bottom: 1.35, kind: 'window', style: 'frosted' },
    { x: 8, z: -3.75, w: 1.4, h: WIN_H, bottom: WIN_B, kind: 'window', style: 'double' },
    // interior
    { x: -1.5, z: 4, w: 0.9, h: DOOR_H, bottom: 0, kind: 'door', hinge: 'left', swing: -1, id: 'masterDoor' },
    { x: -1.5, z: -3.5, w: 0.9, h: DOOR_H, bottom: 0, kind: 'door', hinge: 'right', swing: -1, id: 'bedroom2Door' },
    { x: -6.5, z: 1.5, w: 0.8, h: DOOR_H, bottom: 0, kind: 'door', hinge: 'left', swing: -1, id: 'masterBathDoor' },
    { x: -3.25, z: 1.5, w: 0.8, h: DOOR_H, bottom: 0, kind: 'door', hinge: 'right', swing: -1, id: 'closetDoor' },
    { x: 1.5, z: 4, w: 0.9, h: DOOR_H, bottom: 0, kind: 'door', hinge: 'right', swing: 1, id: 'bedroom3Door' },
    { x: 1.5, z: 0, w: 0.8, h: DOOR_H, bottom: 0, kind: 'door', hinge: 'left', swing: 1, id: 'bathDoor' },
    { x: 1.5, z: -3.5, w: 0.9, h: DOOR_H, bottom: 0, kind: 'door', hinge: 'left', swing: 1, id: 'bedroom4Door' },
    { x: 6.5, z: -1.5, w: 0.8, h: DOOR_H, bottom: 0, kind: 'door', hinge: 'left', swing: 1, id: 'closet2Door' },
  ],
  basement: [
    { x: -5, z: 6, w: 0.8, h: 0.42, bottom: 2.05, kind: 'basementWindow' },
    { x: 5, z: 6, w: 0.8, h: 0.42, bottom: 2.05, kind: 'basementWindow' },
    { x: -5, z: -6, w: 0.8, h: 0.42, bottom: 2.05, kind: 'basementWindow' },
    { x: 5, z: -6, w: 0.8, h: 0.42, bottom: 2.05, kind: 'basementWindow' },
    { x: -8, z: 2, w: 0.8, h: 0.42, bottom: 2.05, kind: 'basementWindow' },
    { x: 8, z: 3, w: 0.8, h: 0.42, bottom: 2.05, kind: 'basementWindow' },
    { x: 1.5, z: -3.5, w: 0.9, h: DOOR_H, bottom: 0, kind: 'door', hinge: 'left', swing: 1, id: 'laundryDoor' },
    { x: 1.5, z: 2.5, w: 0.9, h: DOOR_H, bottom: 0, kind: 'door', hinge: 'right', swing: 1, id: 'workshopDoor' },
    { x: -1.5, z: 1, w: 2.6, h: 2.2, bottom: 0, kind: 'arch' },
  ],
};

/** Stairs: straight runs. `dir` is the direction of ascent. */
export interface StairDef {
  id: string;
  /** x range (width) */
  x0: number; x1: number;
  /** z where the bottom riser is */
  zStart: number;
  /** ascend toward -z */
  dir: -1 | 1;
  yBottom: number;
  yTop: number;
  risers: number;
  tread: number;
  floorBottom: FloorId;
  floorTop: FloorId;
}

export const STAIRS: StairDef[] = [
  { id: 'up', x0: 0.05, x1: 1.44, zStart: -1.4, dir: -1, yBottom: 0, yTop: 3.05, risers: 17, tread: 0.27, floorBottom: 'ground', floorTop: 'upper' },
  { id: 'down', x0: -1.44, x1: -0.15, zStart: -1.4, dir: -1, yBottom: -2.95, yTop: 0, risers: 16, tread: 0.27, floorBottom: 'basement', floorTop: 'ground' },
];

/** Holes in floor slabs (stair openings) [x0,z0,x1,z1] */
export const FLOOR_HOLES: Record<FloorId, [number, number, number, number][]> = {
  basement: [],
  ground: [[-1.5, -5.85, -0.1, -1.4]], // hole in the ground slab for the basement stairs
  upper: [[0.05, -5.85, 1.5, -2.6]], // hole in the upper slab for the stairs up
};

/** Railing runs along the upper-floor stair opening [x0,z0,x1,z1] */
export const RAILINGS: { floor: FloorId; x0: number; z0: number; x1: number; z1: number }[] = [
  { floor: 'upper', x0: 0.05, z0: -5.85, x1: 0.05, z1: -2.6 },
  { floor: 'upper', x0: 0.05, z0: -2.6, x1: 1.44, z1: -2.6 },
];

export const PORCH = { x0: -2.6, x1: 2.6, z0: 6, z1: 8.4, y: 0, roofY: 3.0 };
export const PATIO = { x0: 3, x1: 8.5, z0: -9.5, z1: -6 };
export const DRIVEWAY = { x0: 9.5, x1: 13, z0: -1, z1: LOT.z1 };
export const WALKWAY = { x0: -0.75, x1: 0.75, z0: PORCH.z1, z1: LOT.z1 };

export const SPAWN = { x: 0, y: 0, z: 10.5, yaw: Math.PI }; // on the front walk, facing the house

export function roomAt(x: number, y: number, z: number): RoomDef | null {
  let floor: FloorId = 'ground';
  if (y < -1.2) floor = 'basement';
  else if (y > 1.9) floor = 'upper';
  for (const r of ROOMS) {
    if (r.floor !== floor) continue;
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r;
  }
  return null;
}

export function floorAt(y: number): FloorId {
  if (y < -1.2) return 'basement';
  if (y > 1.9) return 'upper';
  return 'ground';
}
