/**
 * Bootstrap: engine -> physics -> textures -> world -> player -> UI -> loop.
 */
import * as THREE from 'three';
import { Engine } from './core/Engine';
import { Physics, GROUP, groups } from './core/Physics';
import { Input } from './core/Input';
import { AudioManager } from './core/Audio';
import { settings } from './core/Settings';
import { TextureLibrary } from './graphics/Textures';
import { MaterialLibrary } from './graphics/Materials';
import { DayLight, LightManager } from './graphics/Lighting';
import { StaticBatch, seeded } from './world/Builder';
import { InteractableRegistry } from './world/Interactables';
import type { Ctx } from './world/Context';
import { buildWorld } from './world/House';
import { freezeStaticParts } from './world/Freeze';
import { SPAWN, roomAt, floorAt } from './world/Plan';
import { PlayerController } from './player/Controller';
import { ThirdPersonCamera } from './player/Camera';
import { CarrySystem } from './player/Carry';
import { UI } from './ui/UI';

declare global {
  interface Window {
    __ready: boolean;
    __stats: any;
    __game: any;
    __errors: string[];
  }
}

window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => window.__errors.push(String((e as any).reason)));

const params = new URLSearchParams(location.search);
const AUTO = params.has('auto');

async function main() {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const ui = new UI();
  ui.setState('loading');
  // `auto` is used by the screenshot tooling; preserving the drawing buffer lets headless captures read the canvas.
  const engine = new Engine(canvas, { preserveDrawingBuffer: AUTO });
  engine.adaptive = !AUTO; // fixed resolution for screenshot tooling
  const input = new Input(canvas);
  const audio = new AudioManager();

  if (params.has('t')) settings.data.timeOfDay = parseFloat(params.get('t')!);
  if (params.has('q')) settings.applyQualityPreset(params.get('q') as any);

  ui.setProgress(0.02, 'Waking up the physics engine…');
  const physics = await Physics.create();

  const tex = new TextureLibrary(engine.renderer);
  const q = settings.get('quality');
  tex.scale = q === 'low' ? 0.5 : q === 'medium' ? 0.75 : 1;
  ui.setProgress(0.05, 'Painting textures…');
  await tex.preload((p, label) => ui.setProgress(0.05 + p * 0.5, label));
  const mats = new MaterialLibrary(tex);

  const daylight = new DayLight(engine.renderer, engine.scene);
  const poolSizes = q === 'low' ? { points: 6, spots: 3, shadows: 0 } : q === 'medium' ? { points: 8, spots: 4, shadows: 0 } : q === 'high' ? { points: 10, spots: 6, shadows: 1 } : { points: 12, spots: 8, shadows: 2 };
  const lights = new LightManager(engine.scene, poolSizes);
  const interact = new InteractableRegistry();
  const batchRoot = new THREE.Group();
  batchRoot.name = 'static';
  engine.scene.add(batchRoot);
  const batch = new StaticBatch(batchRoot);
  const dynamic = new THREE.Group();
  dynamic.name = 'dynamic';
  engine.scene.add(dynamic);
  const updaters: ((dt: number, t: number) => void)[] = [];
  const playerPosRef = new THREE.Vector3(SPAWN.x, SPAWN.y, SPAWN.z);
  const rng = seeded(1234);

  const ctx: Ctx = {
    scene: engine.scene, camera: engine.camera, renderer: engine.renderer,
    mats, tex, batch, dynamic, physics, lights, interact, audio,
    onUpdate: (fn) => updaters.push(fn),
    daylight: () => daylight.daylight,
    playerPos: () => playerPosRef,
    toast: (msg) => ui.toast(msg),
    rng,
  };

  const world = await buildWorld(ctx, (p, label) => ui.setProgress(0.55 + p * 0.35, label));
  if (!params.has('nofreeze')) {
    ui.setProgress(0.9, 'Optimizing…');
    const fr = freezeStaticParts(ctx, updaters);
    console.info(`[freeze] baked ${fr.frozen} static parts into the batch; ${fr.kept} dynamic meshes kept (${fr.animated} animate)`);
  }

  ui.setProgress(0.92, 'Waking up the resident…');
  const spawn = new THREE.Vector3(SPAWN.x, SPAWN.y, SPAWN.z);
  const player = new PlayerController(physics, input, audio, spawn, SPAWN.yaw);
  await player.character.load(`${import.meta.env.BASE_URL}models/Soldier.glb`.replace('//', '/'));
  engine.scene.add(player.character.root);
  const camera = new ThirdPersonCamera(engine.camera, physics, input, player);
  const carry = new CarrySystem(physics, audio);
  (ctx as any).carry = carry;
  carry.onChange = (p) => ui.setHeld(p ? p.name : null);

  // flashlight
  const flashlight = new THREE.SpotLight(0xfff4e0, 0, 18, Math.PI / 7, 0.5, 1.5);
  flashlight.castShadow = false;
  engine.scene.add(flashlight);
  engine.scene.add(flashlight.target);
  let flashOn = false;

  ui.setProgress(0.97, 'Compiling shaders…');
  if (params.has('noshadow')) settings.data.shadows = false;
  if (!params.has('nofx')) {
    engine.initPostFX();
    engine.postfx.setSceneBox(world.structure.bounds);
  }
  // warm up shaders
  engine.renderer.compile(engine.scene, engine.camera);
  ui.setProgress(1, 'Ready');

  // ---- URL-driven placement (screenshots / debugging) ----
  const applyParams = () => {
    if (params.has('x')) {
      const p = new THREE.Vector3(parseFloat(params.get('x')!), parseFloat(params.get('y') ?? '0'), parseFloat(params.get('z')!));
      player.setPosition(p, parseFloat(params.get('yaw') ?? '0'));
    }
    if (params.has('cyaw')) camera.yaw = parseFloat(params.get('cyaw')!);
    if (params.has('cpitch')) camera.pitch = parseFloat(params.get('cpitch')!);
    if (params.has('dist')) settings.set('cameraDistance', parseFloat(params.get('dist')!));
  };

  // ---- UI wiring ----
  const enterPlay = () => {
    input.enabled = true;
    audio.unlock();
    if (!params.has('nolock')) input.requestPointerLock();
  };
  ui.onPlay = () => { enterPlay(); audio.play('menu'); };
  ui.onResume = () => enterPlay();
  ui.onQuit = () => { input.enabled = false; input.exitPointerLock(); };
  ui.onTeleport = () => player.setPosition(spawn.clone(), SPAWN.yaw);
  ui.onStateChange = (s) => { input.enabled = s === 'playing'; if (s !== 'playing') input.exitPointerLock(); };
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && ui.state === 'playing' && !params.has('nolock')) ui.pause();
  });
  canvas.addEventListener('mousedown', () => { if (ui.state === 'playing' && !input.pointerLocked && !params.has('nolock')) input.requestPointerLock(); });

  if (AUTO) { applyParams(); ui.play(); } else ui.showMenu();

  // ---- main loop ----
  let frameCount = 0;
  const camDir = new THREE.Vector3();
  const camQuat = new THREE.Quaternion();
  engine.onFps = (f) => ui.setFps(f);
  engine.onUpdate((dt, t) => {
    input.poll();
    const playing = ui.state === 'playing';
    if (playing) {
      if (input.justPressed('pause')) ui.pause();
      if (input.justPressed('map')) ui.toggleMap();
      if (input.justPressed('help')) ui.toggleHelp();
      if (input.justPressed('flashlight')) { flashOn = !flashOn; audio.play('switch'); }
      if (input.justPressed('reset')) player.setPosition(spawn.clone(), SPAWN.yaw);
      player.gatherInput(dt);
      player.cameraYaw = camera.movementYaw;
      engine.camera.getWorldDirection(camDir);
      engine.camera.getWorldQuaternion(camQuat);
      const alpha = physics.step(dt, (fdt) => {
        player.fixedUpdate(fdt);
        carry.fixedUpdate(player.headPosition.clone(), camDir, camQuat);
      });
      physics.sync(alpha);
      player.update(dt, alpha);
      camera.update(dt);
      playerPosRef.copy(player.position);

      // interaction
      const hit = interact.pick(engine.camera, player.position, player.forward, (from, to) => {
        const d = to.clone().sub(from); const len = d.length(); if (len < 0.05) return false;
        const h = physics.raycast(from, d.normalize(), len - 0.05, groups(GROUP.PLAYER, GROUP.STATIC));
        return !!h;
      });
      interact.setHover(hit);
      if (carry.held) {
        ui.setPrompt(null);
        if (input.mouseJustPressed(0) || input.justPressed('throw')) carry.throw(camDir, 9);
        else if (input.justPressed('drop') || input.justPressed('interact')) carry.drop();
      } else {
        ui.setPrompt(hit ? hit.getPrompt() : null);
        if (hit && (input.justPressed('interact') || input.mouseJustPressed(0))) {
          hit.interact({ playerPos: player.position.clone(), cameraDir: camDir.clone(), cameraPos: engine.camera.position.clone() });
        }
      }
      interact.update(dt, t);
      for (const u of updaters) u(dt, t);

      // room label, map, audio
      const room = roomAt(player.position.x, player.position.y, player.position.z);
      ui.setRoom(room ? room.name : 'Outside', dt);
      ui.updateMap(floorAt(player.position.y), player.position.x, player.position.z, player.yaw);
      const outdoor = room ? 0 : 1;
      if (!audio.hasLoop('outdoor')) audio.startLoop('outdoor', 'outdoor', undefined, 0.25);
      audio.update(player.headPosition, outdoor);
    }
    // lights follow the camera focus (player) even when paused so menus look right
    lights.update(dt, player.position, daylight.daylight);
    daylight.follow(player.position);
    // flashlight
    flashlight.intensity += ((flashOn ? 40 : 0) - flashlight.intensity) * (1 - Math.exp(-dt * 12));
    if (flashlight.intensity > 0.01) {
      const chest = player.position.clone().add(new THREE.Vector3(0, 1.35, 0));
      flashlight.position.copy(chest);
      flashlight.target.position.copy(chest.clone().addScaledVector(camDir, 6));
    }
    // optional day/night cycle: one game hour per real minute
    if (settings.get('dayCycle') && playing) {
      settings.data.timeOfDay = (settings.data.timeOfDay + dt / 60) % 24;
      daylight.setTime(settings.data.timeOfDay);
      if (frameCount % 600 === 0) settings.set('timeOfDay', Math.round(settings.data.timeOfDay * 10) / 10);
    }
    ui.setClock(settings.get('timeOfDay'));
    input.endFrame();
    frameCount++;
    if (frameCount === 6) {
      window.__ready = true;
    }
    // screenshot tooling: stop rendering once the capture frame is on screen (saves CPU on the QA box)
    if (frameCount === 8 && params.has('freeze')) engine.stop();
  });
  // stats hook for QA tooling
  window.__game = { engine, player, camera, physics, ctx, world, settings, ui, roomAt, teleport: (x: number, y: number, z: number, yaw = 0) => player.setPosition(new THREE.Vector3(x, y, z), yaw) };
  Object.defineProperty(window, '__stats', { get: () => ({ calls: engine.lastStats.calls, triangles: engine.lastStats.triangles, fps: engine.fps, errors: window.__errors, batches: batch.stats, interactables: interact.items.length, lights: lights.virtual.length }) });
  engine.start();
}

main().catch((e) => {
  console.error(e);
  window.__errors.push(String(e && e.stack ? e.stack : e));
  const label = document.getElementById('progress-label');
  if (label) label.textContent = 'Something went wrong: ' + (e?.message ?? e);
});
