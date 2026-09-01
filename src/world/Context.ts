/**
 * Shared build context passed to every world/room builder.
 */
import * as THREE from 'three';
import type { MaterialLibrary } from '../graphics/Materials';
import type { TextureLibrary } from '../graphics/Textures';
import type { StaticBatch } from './Builder';
import type { Physics } from '../core/Physics';
import type { LightManager } from '../graphics/Lighting';
import type { InteractableRegistry } from './Interactables';
import type { AudioManager } from '../core/Audio';

export interface Ctx {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  mats: MaterialLibrary;
  tex: TextureLibrary;
  /** Static geometry sink: `batch.add(mesh)` bakes the mesh's world transform and merges by material. */
  batch: StaticBatch;
  /** Parent for non-batched (animated / interactive / transparent) objects. */
  dynamic: THREE.Group;
  physics: Physics;
  lights: LightManager;
  interact: InteractableRegistry;
  audio: AudioManager;
  /** Register a per-frame updater. */
  onUpdate(fn: (dt: number, t: number) => void): void;
  /** 0 = night, 1 = full daylight */
  daylight(): number;
  /** Player feet position (live). */
  playerPos(): THREE.Vector3;
  /** Show a HUD toast message */
  toast(msg: string): void;
  /** deterministic RNG for placement variety */
  rng(): number;
}
