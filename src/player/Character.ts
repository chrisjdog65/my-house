/**
 * Animated character model (Soldier.glb from the three.js examples: Idle / Walk / Run).
 * Falls back to a simple capsule mannequin if the model fails to load.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Character {
  root = new THREE.Group();
  private mixer: THREE.AnimationMixer | null = null;
  private actions: Record<string, THREE.AnimationAction> = {};
  private weights = { idle: 1, walk: 0, run: 0 };
  private model: THREE.Object3D | null = null;
  ready = false;
  height = 1.8;
  private fallback: THREE.Group | null = null;

  async load(url: string): Promise<void> {
    try {
      const gltf = await new GLTFLoader().loadAsync(url);
      const model = gltf.scene;
      model.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
          m.frustumCulled = false;
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat) { mat.envMapIntensity = 0.5; mat.roughness = Math.max(0.5, mat.roughness); }
        }
      });
      // The soldier faces -Z; we want the character's local +Z to be forward.
      model.rotation.y = Math.PI;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const scale = 1.78 / size.y;
      model.scale.setScalar(scale);
      model.position.y = -box.min.y * scale;
      this.root.add(model);
      this.model = model;
      this.mixer = new THREE.AnimationMixer(model);
      for (const clip of gltf.animations) {
        const name = clip.name.toLowerCase();
        const a = this.mixer.clipAction(clip);
        a.enabled = true;
        a.setEffectiveTimeScale(1);
        a.setEffectiveWeight(name === 'idle' ? 1 : 0);
        a.play();
        this.actions[name] = a;
      }
      this.ready = true;
    } catch (e) {
      console.warn('Character model failed to load, using fallback', e);
      this.buildFallback();
    }
  }

  private buildFallback() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x3f6fb5, roughness: 0.6 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xe6c3a5, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.7, 6, 16), mat);
    body.position.y = 0.95; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), skin);
    head.position.y = 1.62; head.castShadow = true;
    g.add(body, head);
    this.root.add(g);
    this.fallback = g;
    this.ready = true;
  }

  /**
   * @param speed horizontal speed in m/s
   * @param maxWalk speed at which walk anim is fully on
   * @param maxRun speed at which run anim is fully on
   */
  update(dt: number, speed: number, maxWalk: number, maxRun: number, grounded: boolean) {
    if (!this.mixer) {
      if (this.fallback) this.fallback.position.y = grounded ? Math.abs(Math.sin(performance.now() * 0.01)) * 0.03 * Math.min(1, speed / maxWalk) : 0;
      return;
    }
    let idle = 0, walk = 0, run = 0;
    if (speed < 0.05) idle = 1;
    else if (speed < maxWalk) { const t = speed / maxWalk; walk = t; idle = 1 - t; }
    else { const t = Math.min(1, (speed - maxWalk) / Math.max(0.01, maxRun - maxWalk)); run = t; walk = 1 - t; }
    if (!grounded) { idle = Math.max(idle, 0.6); walk *= 0.4; run *= 0.4; }
    const k = 1 - Math.exp(-dt * 12);
    this.weights.idle += (idle - this.weights.idle) * k;
    this.weights.walk += (walk - this.weights.walk) * k;
    this.weights.run += (run - this.weights.run) * k;
    this.actions.idle?.setEffectiveWeight(this.weights.idle);
    this.actions.walk?.setEffectiveWeight(this.weights.walk);
    this.actions.run?.setEffectiveWeight(this.weights.run);
    // scale animation playback to match actual speed (walk clip ~ 1.6 m/s, run ~ 4.8 m/s)
    if (this.actions.walk) this.actions.walk.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 1.7, 0.6, 1.6));
    if (this.actions.run) this.actions.run.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / 4.6, 0.7, 1.4));
    this.mixer.update(dt);
  }

  setVisible(v: boolean) {
    this.root.visible = v;
  }
}
