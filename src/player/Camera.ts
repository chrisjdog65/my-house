/**
 * Third-person orbit camera with collision (sphere cast), shoulder offset, zoom, smoothing,
 * sprint FOV kick and subtle sway.
 */
import * as THREE from 'three';
import type { Physics } from '../core/Physics';
import type { Input } from '../core/Input';
import { settings } from '../core/Settings';
import type { PlayerController } from './Controller';

export class ThirdPersonCamera {
  yaw = 0;
  pitch = 0.18;
  distance = 3.6;
  private targetDistance = 3.6;
  private currentDistance = 3.6;
  private shoulder = 1; // 1 right, -1 left
  private shoulderCur = 1;
  private followPos = new THREE.Vector3();
  private lookAt = new THREE.Vector3();
  private baseFov = 60;
  private fovKick = 0;
  private swayT = 0;
  private lastHeadY = 0;
  private headYSmooth = 0;
  firstPerson = false;

  constructor(private camera: THREE.PerspectiveCamera, private physics: Physics, private input: Input, private player: PlayerController) {
    this.yaw = player.yaw + Math.PI; // start behind the player
    this.targetDistance = settings.get('cameraDistance');
    this.distance = this.targetDistance;
    this.currentDistance = this.targetDistance;
    this.followPos.copy(player.position);
    this.headYSmooth = player.position.y;
    settings.onChange((s, k) => { if (k === 'cameraDistance') { this.targetDistance = s.cameraDistance; } });
  }

  update(dt: number) {
    const ax = this.input.axes;
    const sens = settings.get('sensitivity') * 0.0022;
    const inv = settings.get('invertY') ? -1 : 1;
    this.yaw -= ax.lookX * sens;
    this.pitch += ax.lookY * sens * inv;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -0.55, 1.15);
    if (ax.zoom) {
      this.targetDistance = THREE.MathUtils.clamp(this.targetDistance + ax.zoom * 0.35, 1.2, 7);
      settings.set('cameraDistance', Math.round(this.targetDistance * 10) / 10);
    }
    if (this.input.justPressed('toggleView')) this.shoulder *= -1;
    this.shoulderCur += (this.shoulder - this.shoulderCur) * (1 - Math.exp(-dt * 8));
    this.distance += (this.targetDistance - this.distance) * (1 - Math.exp(-dt * 10));

    // follow point: smooth horizontal, smoother vertical (stairs)
    const p = this.player.position;
    const kx = 1 - Math.exp(-dt * 18);
    this.followPos.x += (p.x - this.followPos.x) * kx;
    this.followPos.z += (p.z - this.followPos.z) * kx;
    this.headYSmooth += (p.y - this.headYSmooth) * (1 - Math.exp(-dt * (this.player.grounded ? 9 : 14)));
    this.followPos.y = this.headYSmooth;

    const headH = this.player.crouching ? 1.15 : 1.5;
    const pivot = new THREE.Vector3(this.followPos.x, this.followPos.y + headH, this.followPos.z);
    // camera basis from yaw/pitch
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const dir = new THREE.Vector3(Math.sin(this.yaw) * cp, sp, Math.cos(this.yaw) * cp); // from pivot toward camera
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const shoulderOff = right.clone().multiplyScalar(0.42 * this.shoulderCur * Math.min(1, this.distance / 2.5));
    // shoulder offset itself must not push through walls
    const pivotShifted = pivot.clone();
    const fracS = this.physics.sphereCastFraction(pivot, pivot.clone().add(shoulderOff), 0.2, undefined, this.player.rigidBody);
    pivotShifted.add(shoulderOff.multiplyScalar(fracS));

    const desired = pivotShifted.clone().addScaledVector(dir, this.distance);
    const frac = this.physics.sphereCastFraction(pivotShifted, desired, 0.22, undefined, this.player.rigidBody);
    const allowed = this.distance * frac;
    // snap in fast, ease out slowly
    if (allowed < this.currentDistance) this.currentDistance = allowed;
    else this.currentDistance += (allowed - this.currentDistance) * (1 - Math.exp(-dt * 4));
    const camPos = pivotShifted.clone().addScaledVector(dir, this.currentDistance);

    // sway
    if (settings.get('headBob') && this.player.grounded && this.player.speed > 0.5) {
      this.swayT += dt * (this.player.sprinting ? 9 : 6.5);
      const amp = this.player.sprinting ? 0.022 : 0.012;
      camPos.y += Math.sin(this.swayT * 2) * amp;
      camPos.addScaledVector(right, Math.sin(this.swayT) * amp * 0.8);
    }
    camPos.y -= this.player.landBob * 0.12;

    this.camera.position.copy(camPos);
    const look = pivotShifted.clone().addScaledVector(dir, -1);
    this.lookAt.copy(look);
    this.camera.lookAt(look);

    // fov kick when sprinting
    this.baseFov = settings.get('fov');
    const targetKick = this.player.sprinting && this.player.speed > 3 ? 7 : 0;
    this.fovKick += (targetKick - this.fovKick) * (1 - Math.exp(-dt * 6));
    const fov = this.baseFov + this.fovKick;
    if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }

    // hide the character when the camera is too close
    this.firstPerson = this.currentDistance < 0.75;
    this.player.character.setVisible(!this.firstPerson);
    this.lastHeadY = pivot.y;
  }

  get forwardOnGround() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  /** yaw such that "forward" for movement is where the camera looks */
  get movementYaw() {
    return this.yaw + Math.PI;
  }
}
