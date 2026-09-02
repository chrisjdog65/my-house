/**
 * Powder room layout constants and the small geometry helpers its builders share.
 *
 * Plan (metres, +x east, +z front): the room is x 1.5..3.5, z 0.5..2.5 on the ground floor with the
 * door on the west wall at z 1.5 (hinge on the south jamb, leaf swinging into the room toward +x).
 * Pedestal sink + oval mirror on the south wall, toilet against the east wall facing west, towel
 * ring beside the sink, wastebasket in the north-west corner under the light switch.
 */
import * as THREE from 'three';
import { Prim } from '../Builder';
import { LEVELS, roomById } from '../Plan';

export const ROOM = roomById('powder');
export const F = LEVELS[ROOM.floor].y;
export const C = F + LEVELS[ROOM.floor].ceiling;
/** inner wall faces (interior walls are 0.12 thick) */
export const WX = ROOM.x0 + 0.06, EX = ROOM.x1 - 0.06, NZ = ROOM.z0 + 0.06, SZ = ROOM.z1 - 0.06;
/** beadboard thickness proud of the plaster */
export const BB = 0.012;
/** top of the wainscot cap rail */
export const WAIN = 1.1;
export const LIGHT_GROUP = 'powder';
/** sink centre x (south wall) */
export const SINK_X = 2.85;
/** toilet axis z (east wall) — kept toward the north wall so the path between it and the sink stays wide */
export const TOILET_Z = 0.9;
/** door casing extents (z) on the west wall; the hinge is on the south jamb */
export const DOOR_Z0 = 1.02, DOOR_Z1 = 1.98;

export type Side = 'n' | 's' | 'e' | 'w';

/** Thin panel against one wall face spanning `a0..a1` along the wall (x for n/s, z for e/w). */
export function wallPanel(g: THREE.Group, side: Side, a0: number, a1: number, yb: number, yt: number, mat: THREE.Material, th: number) {
  if (a1 - a0 < 0.005) return;
  const len = a1 - a0, h = yt - yb, mid = (a0 + a1) / 2, yc = (yb + yt) / 2;
  let b: THREE.Mesh;
  if (side === 'n' || side === 's') {
    b = Prim.box(len, h, th, mat);
    b.position.set(mid, yc, side === 'n' ? NZ + th / 2 : SZ - th / 2);
  } else {
    b = Prim.box(th, h, len, mat);
    b.position.set(side === 'w' ? WX + th / 2 : EX - th / 2, yc, mid);
  }
  g.add(b);
}

export function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Lathe whose faces point INWARD (basins, bowls): mirror the profile and recompute normals. */
export function innerLathe(points: [number, number][], mat: THREE.Material, segments = 32): THREE.Mesh {
  const m = Prim.lathe(points, mat, { segments });
  m.geometry.scale(-1, 1, 1);
  m.geometry.computeVertexNormals();
  return m;
}
