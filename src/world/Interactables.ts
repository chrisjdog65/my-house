/**
 * Interaction system: registry of interactable objects, picking from the camera, highlight.
 */
import * as THREE from 'three';

export interface InteractContext {
  playerPos: THREE.Vector3;
  cameraDir: THREE.Vector3;
  cameraPos: THREE.Vector3;
}

export interface Interactable {
  /** Object used for raycast picking and highlight. All descendant meshes are pickable. */
  object: THREE.Object3D;
  /** Prompt to show (e.g. "Open door"). Return null to hide/disable. */
  getPrompt(): string | null;
  interact(ctx: InteractContext): void;
  /** Max distance from the player (default 2.6m). */
  radius?: number;
  /** Optional world-space focus point (defaults to object's world position). */
  focus?: THREE.Vector3;
  /** Optional per-frame update */
  update?(dt: number, t: number): void;
  /** If true, the object also counts when it's merely close and in front (no raycast needed). */
  proximity?: boolean;
  /** Custom highlight callback (default: emissive pulse). */
  onHover?(hover: boolean): void;
  name?: string;
}

const _pos = new THREE.Vector3();
const _dir = new THREE.Vector3();

export class InteractableRegistry {
  readonly items: Interactable[] = [];
  private meshes: THREE.Mesh[] = [];
  private raycaster = new THREE.Raycaster();
  private dirty = true;
  hovered: Interactable | null = null;
  private highlightState = new Map<THREE.Mesh, { emissive: THREE.Color; intensity: number }>();

  add<T extends Interactable>(item: T): T {
    this.items.push(item);
    item.object.traverse((o) => {
      if (o instanceof THREE.Mesh) o.userData.interactable = item;
    });
    this.dirty = true;
    return item;
  }

  remove(item: Interactable) {
    const i = this.items.indexOf(item);
    if (i >= 0) this.items.splice(i, 1);
    item.object.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.interactable === item) delete o.userData.interactable;
    });
    if (this.hovered === item) this.setHover(null);
    this.dirty = true;
  }

  private rebuild() {
    this.meshes = [];
    for (const it of this.items) {
      it.object.traverse((o) => {
        if (o instanceof THREE.Mesh) this.meshes.push(o);
      });
    }
    this.dirty = false;
  }

  /**
   * Pick the best interactable: raycast from the camera centre first (must be within the
   * item's radius of the player), then fall back to nearest item in front of the player.
   */
  pick(camera: THREE.Camera, playerPos: THREE.Vector3, playerForward: THREE.Vector3, occluded?: (from: THREE.Vector3, to: THREE.Vector3) => boolean): Interactable | null {
    if (this.dirty) this.rebuild();
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    this.raycaster.far = 8;
    const hits = this.raycaster.intersectObjects(this.meshes, false);
    for (const h of hits) {
      const it: Interactable | undefined = (h.object as THREE.Mesh).userData.interactable;
      if (!it) continue;
      if (it.getPrompt() === null) continue;
      const r = it.radius ?? 2.6;
      const d = h.point.distanceTo(playerPos);
      if (d > r + 0.4) break; // first hit is too far; closer things are behind it anyway
      if (occluded && occluded(playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)), h.point)) continue;
      return it;
    }
    // proximity fallback
    let best: Interactable | null = null;
    let bestScore = Infinity;
    for (const it of this.items) {
      if (!it.proximity) continue;
      if (it.getPrompt() === null) continue;
      const r = it.radius ?? 2.6;
      if (it.focus) _pos.copy(it.focus); else it.object.getWorldPosition(_pos);
      // Height gate: floors are ~3 m apart, so anything more than head-height above the player's
      // feet (or below them) belongs to another storey and must not offer a prompt through the slab.
      const dy = _pos.y - playerPos.y;
      if (dy > 2.2 || dy < -1.2) continue;
      _dir.subVectors(_pos, playerPos);
      _dir.y = 0;
      const d = _dir.length();
      if (d > r) continue;
      _dir.normalize();
      const facing = _dir.dot(playerForward);
      if (facing < 0.2 && d > 0.9) continue;
      const score = d - facing * 0.5;
      if (score >= bestScore) continue;
      // don't offer a prompt for something behind a wall
      if (occluded && d > 0.6 && occluded(playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)), _pos.clone())) continue;
      bestScore = score; best = it;
    }
    return best;
  }

  setHover(item: Interactable | null) {
    if (item === this.hovered) return;
    if (this.hovered) this.applyHighlight(this.hovered, false);
    this.hovered = item;
    if (item) this.applyHighlight(item, true);
  }

  private applyHighlight(item: Interactable, on: boolean) {
    if (item.onHover) { item.onHover(on); return; }
    item.object.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        const sm = m as THREE.MeshStandardMaterial;
        if (!('emissive' in sm)) continue;
        if (on) {
          if (!o.userData.hlOrig) {
            // clone so we don't tint shared materials
            o.userData.hlOrig = o.material;
            const c = (Array.isArray(o.material) ? o.material.map((x) => x.clone()) : o.material.clone()) as THREE.Material | THREE.Material[];
            o.material = c;
            const cms = Array.isArray(c) ? c : [c];
            for (const cm of cms) {
              const s = cm as THREE.MeshStandardMaterial;
              if ('emissive' in s) { s.emissive = new THREE.Color(0xf0b35b); s.emissiveIntensity = 0.22; }
            }
          }
        } else if (o.userData.hlOrig) {
          const cur = o.material;
          o.material = o.userData.hlOrig;
          delete o.userData.hlOrig;
          (Array.isArray(cur) ? cur : [cur]).forEach((x) => x.dispose());
        }
        break;
      }
    });
  }

  update(dt: number, t: number) {
    for (const it of this.items) it.update?.(dt, t);
  }
}
