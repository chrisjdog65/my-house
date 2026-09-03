/**
 * Material library. Materials are cached and shared so that static geometry can be batched
 * by material. Every textured material carries `userData.texSize` (metres per repeat) which
 * the geometry builder uses to compute metric UVs.
 */
import * as THREE from 'three';
import type { TextureLibrary } from './Textures';

export interface MatOpts {
  color?: THREE.ColorRepresentation;
  roughness?: number;
  metalness?: number;
  normalScale?: number;
  envMapIntensity?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
  clearcoat?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  sheenColor?: THREE.ColorRepresentation;
  transmission?: number;
  ior?: number;
  thickness?: number;
  physical?: boolean;
  flatShading?: boolean;
  /** override metres-per-repeat for UV computation */
  texSize?: number;
  /** rotate texture 90 degrees (swap U/V) when computing UVs */
  rotate?: boolean;
  aoIntensity?: number;
  depthWrite?: boolean;
  alphaTest?: number;
  map?: THREE.Texture;
  bumpScale?: number;
}

export type AnyStandard = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;

export class MaterialLibrary {
  private cache = new Map<string, THREE.Material>();
  /**
   * The scene environment map, assigned to every material this library hands out.
   *
   * This has to be per-material rather than left to `scene.environment`: when a standard material
   * has no `envMap` of its own, three overwrites its `envMapIntensity` uniform with the scene's
   * `environmentIntensity` (WebGLRenderer, "material.envMap === null && scene.environment !== null"),
   * so every per-material value tuned here would be silently ignored and each surface would take the
   * full sky irradiance. Since three's diffuse IBL is close to a whole-environment average, that put
   * a pale blue sky cast on interior surfaces facing away from the sky — ceilings worst of all.
   */
  private env: THREE.Texture | null = null;
  constructor(readonly textures: TextureLibrary) {}

  /**
   * Point every material at the environment map. The texture identity must stay stable across
   * regeneration (the PMREM is rendered back into the same target) because static batching clones
   * materials, and those clones keep whichever texture they were given.
   */
  setEnvironment(env: THREE.Texture | null) {
    this.env = env;
    for (const m of this.cache.values()) {
      if ((m as AnyStandard).isMeshStandardMaterial) {
        (m as AnyStandard).envMap = env;
        m.needsUpdate = true;
      }
    }
  }

  /**
   * Round the numeric knobs to coarse steps before a material is built or looked up.
   *
   * Room builders ask for whatever value read well at the time -- roughness 0.45 here, 0.5 there,
   * envMapIntensity 0.6 and 0.65 -- and each distinct combination becomes its own material, which
   * the static batch then cannot merge: 186 distinct materials meant at least 186 draw calls before
   * a single prop was drawn. Nobody can see the difference between roughness 0.45 and 0.5, so
   * snapping to a grid collapses the set without changing the look.
   */
  private static quantize(opts: MatOpts): MatOpts {
    const q = (v: number | undefined, step: number) => (v === undefined ? undefined : Math.round(v / step) * step);
    const o: MatOpts = { ...opts };
    o.roughness = q(o.roughness, 0.1);
    o.metalness = q(o.metalness, 0.25);
    o.envMapIntensity = q(o.envMapIntensity, 0.25);
    o.normalScale = q(o.normalScale, 0.25);
    o.clearcoat = q(o.clearcoat, 0.25);
    o.clearcoatRoughness = q(o.clearcoatRoughness, 0.25);
    o.emissiveIntensity = q(o.emissiveIntensity, 0.25);
    o.sheen = q(o.sheen, 0.25);
    o.aoIntensity = q(o.aoIntensity, 0.25);
    // Opacity and alphaTest stay exact: they decide whether something reads as glass or as solid.
    for (const k of Object.keys(o) as (keyof MatOpts)[]) if (o[k] === undefined) delete o[k];
    return o;
  }

  /** Textured PBR material by procedural texture name. Cached by (name + opts). */
  tex(name: string, rawOpts: MatOpts = {}): AnyStandard {
    const opts = MaterialLibrary.quantize(rawOpts);
    const key = 'tex:' + name + ':' + JSON.stringify(opts);
    const hit = this.cache.get(key);
    if (hit) return hit as AnyStandard;
    const set = this.textures.get(name);
    const M = opts.physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const m = new M({
      map: set.map,
      normalMap: set.normalMap,
      roughnessMap: set.ormMap,
      metalnessMap: set.ormMap,
      aoMap: set.ormMap,
      color: opts.color ?? 0xffffff,
      roughness: opts.roughness ?? 1,
      metalness: opts.metalness ?? 1,
      normalScale: new THREE.Vector2(opts.normalScale ?? 1, opts.normalScale ?? 1),
      envMap: this.env,
      envMapIntensity: opts.envMapIntensity ?? 0.6,
      aoMapIntensity: opts.aoIntensity ?? 1,
      side: opts.side ?? THREE.FrontSide,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      flatShading: opts.flatShading ?? false,
    });
    if (m instanceof THREE.MeshPhysicalMaterial) {
      if (opts.clearcoat !== undefined) { m.clearcoat = opts.clearcoat; m.clearcoatRoughness = opts.clearcoatRoughness ?? 0.15; }
      if (opts.sheen !== undefined) { m.sheen = opts.sheen; m.sheenColor = new THREE.Color(opts.sheenColor ?? 0xffffff); m.sheenRoughness = 0.6; }
    }
    m.userData.texSize = opts.texSize ?? set.size;
    m.userData.texSizeV = opts.texSize ?? set.sizeV;
    m.userData.rotate = !!opts.rotate;
    m.name = key;
    this.cache.set(key, m);
    return m;
  }

  /** Plain (untextured) PBR material. */
  solid(color: THREE.ColorRepresentation, rawOpts: MatOpts = {}): AnyStandard {
    const opts = MaterialLibrary.quantize(rawOpts);
    const key = 'solid:' + new THREE.Color(color).getHexString() + ':' + JSON.stringify(opts);
    const hit = this.cache.get(key);
    if (hit) return hit as AnyStandard;
    const M = opts.physical || opts.clearcoat !== undefined || opts.transmission !== undefined || opts.sheen !== undefined ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const m = new M({
      color,
      roughness: opts.roughness ?? 0.6,
      metalness: opts.metalness ?? 0,
      envMap: this.env,
      envMapIntensity: opts.envMapIntensity ?? 0.6,
      side: opts.side ?? THREE.FrontSide,
      transparent: opts.transparent ?? (opts.opacity !== undefined && opts.opacity < 1),
      opacity: opts.opacity ?? 1,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      flatShading: opts.flatShading ?? false,
      depthWrite: opts.depthWrite ?? true,
      alphaTest: opts.alphaTest ?? 0,
      map: opts.map ?? null,
    });
    if (m instanceof THREE.MeshPhysicalMaterial) {
      if (opts.clearcoat !== undefined) { m.clearcoat = opts.clearcoat; m.clearcoatRoughness = opts.clearcoatRoughness ?? 0.1; }
      if (opts.transmission !== undefined) { m.transmission = opts.transmission; m.ior = opts.ior ?? 1.5; m.thickness = opts.thickness ?? 0.1; }
      if (opts.sheen !== undefined) { m.sheen = opts.sheen; m.sheenColor = new THREE.Color(opts.sheenColor ?? color); m.sheenRoughness = 0.7; }
    }
    m.userData.texSize = opts.texSize ?? 1;
    m.userData.texSizeV = opts.texSize ?? 1;
    m.name = key;
    this.cache.set(key, m);
    return m;
  }

  /** Glass: reflective, slightly tinted, no transmission pass (cheap and stable). */
  glass(opts: { tint?: THREE.ColorRepresentation; opacity?: number; roughness?: number } = {}): THREE.MeshPhysicalMaterial {
    const key = 'glass:' + JSON.stringify(opts);
    const hit = this.cache.get(key);
    if (hit) return hit as THREE.MeshPhysicalMaterial;
    const m = new THREE.MeshPhysicalMaterial({
      color: opts.tint ?? 0xdfeaf2,
      roughness: opts.roughness ?? 0.05,
      metalness: 0,
      transparent: true,
      opacity: opts.opacity ?? 0.18,
      envMap: this.env,
      envMapIntensity: 1.2,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    m.userData.texSize = 1;
    m.name = key;
    this.cache.set(key, m);
    return m;
  }

  /** Emissive material (bulbs, screens). */
  emissive(color: THREE.ColorRepresentation, intensity = 2, base: THREE.ColorRepresentation = 0x111111): THREE.MeshStandardMaterial {
    const key = 'emi:' + new THREE.Color(color).getHexString() + ':' + intensity + ':' + new THREE.Color(base).getHexString();
    const hit = this.cache.get(key);
    if (hit) return hit as THREE.MeshStandardMaterial;
    const m = new THREE.MeshStandardMaterial({ color: base, emissive: color, emissiveIntensity: intensity, roughness: 0.5, metalness: 0, envMap: this.env, envMapIntensity: 0.4 });
    m.userData.texSize = 1;
    m.name = key;
    this.cache.set(key, m);
    return m;
  }

  /** Material using an arbitrary color texture (art, rug, labels). Not batched-friendly (unique). */
  image(map: THREE.Texture, rawOpts: MatOpts = {}): AnyStandard {
    const opts = MaterialLibrary.quantize(rawOpts);
    const m = new THREE.MeshStandardMaterial({
      map,
      color: opts.color ?? 0xffffff,
      roughness: opts.roughness ?? 0.8,
      metalness: opts.metalness ?? 0,
      envMap: this.env,
      envMapIntensity: opts.envMapIntensity ?? 0.4,
      side: opts.side ?? THREE.FrontSide,
      transparent: opts.transparent ?? false,
      alphaTest: opts.alphaTest ?? 0,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      emissiveMap: opts.emissive !== undefined ? map : null,
    });
    m.userData.texSize = opts.texSize ?? 0; // 0 => keep geometry's own UVs
    return m;
  }

  // -------------------------------------------------------------------------------------------
  // Named presets used across the house
  // -------------------------------------------------------------------------------------------
  get oakFloor() { return this.tex('oakFloor', { normalScale: 0.9, envMapIntensity: 0.7, physical: true, clearcoat: 0.35, clearcoatRoughness: 0.35 }); }
  get walnutFloor() { return this.tex('walnutFloor', { normalScale: 0.9, envMapIntensity: 0.7, physical: true, clearcoat: 0.3, clearcoatRoughness: 0.35 }); }
  get greyPlank() { return this.tex('greyPlank', { normalScale: 0.9, envMapIntensity: 0.5 }); }
  get oak() { return this.tex('oak', { normalScale: 0.5, envMapIntensity: 0.6 }); }
  get walnut() { return this.tex('walnut', { normalScale: 0.5, envMapIntensity: 0.6 }); }
  get maple() { return this.tex('maple', { normalScale: 0.5, envMapIntensity: 0.6 }); }
  get mahogany() { return this.tex('mahogany', { normalScale: 0.5, envMapIntensity: 0.7, physical: true, clearcoat: 0.5, clearcoatRoughness: 0.2 }); }
  get pine() { return this.tex('pine', { normalScale: 0.5, envMapIntensity: 0.5 }); }
  get espresso() { return this.tex('espresso', { normalScale: 0.5, envMapIntensity: 0.6 }); }
  get beadboard() { return this.tex('beadboard', { normalScale: 0.8, envMapIntensity: 0.5 }); }
  wall(color: THREE.ColorRepresentation = 0xf3efe6) { return this.tex('plaster', { color, normalScale: 0.35, envMapIntensity: 0.35 }); }
  // Very low env influence: the environment map is unoccluded sky, so a ceiling that samples it
  // reads blue in rooms with little artificial light (most obviously in the basement).
  // No environment influence at all: three's diffuse IBL is a near-average of the whole environment,
  // so an unoccluded sky tints every downward-facing surface pale blue no matter which way it points.
  // Ceilings are lit by the hemisphere ground bounce and the room's own fixtures instead.
  get ceiling() { return this.tex('ceiling', { color: 0xfafaf7, normalScale: 0.4, envMapIntensity: 0 }); }
  get brick() { return this.tex('brick', { normalScale: 1.0, envMapIntensity: 0.4 }); }
  get brickPale() { return this.tex('brickPale', { normalScale: 1.0, envMapIntensity: 0.4 }); }
  get stone() { return this.tex('stone', { normalScale: 1.0, envMapIntensity: 0.4 }); }
  get concrete() { return this.tex('concrete', { normalScale: 0.7, envMapIntensity: 0.4 }); }
  get concreteDark() { return this.tex('concreteDark', { normalScale: 0.7, envMapIntensity: 0.4 }); }
  get tile() { return this.tex('tile', { normalScale: 0.8, envMapIntensity: 0.8, physical: true, clearcoat: 0.3, clearcoatRoughness: 0.2 }); }
  get tileDark() { return this.tex('tileDark', { normalScale: 0.8, envMapIntensity: 0.8, physical: true, clearcoat: 0.3, clearcoatRoughness: 0.2 }); }
  get tileCheck() { return this.tex('tileCheck', { normalScale: 0.8, envMapIntensity: 0.8 }); }
  get subway() { return this.tex('subway', { normalScale: 0.9, envMapIntensity: 0.9, physical: true, clearcoat: 0.6, clearcoatRoughness: 0.1 }); }
  get marble() { return this.tex('marble', { normalScale: 0.3, envMapIntensity: 1.0, physical: true, clearcoat: 0.8, clearcoatRoughness: 0.08 }); }
  get marbleDark() { return this.tex('marbleDark', { normalScale: 0.3, envMapIntensity: 1.0, physical: true, clearcoat: 0.8, clearcoatRoughness: 0.08 }); }
  get granite() { return this.tex('granite', { normalScale: 0.3, envMapIntensity: 1.0, physical: true, clearcoat: 0.7, clearcoatRoughness: 0.1 }); }
  carpet(color: THREE.ColorRepresentation = 0xffffff) { return this.tex('carpet', { color, normalScale: 0.8, envMapIntensity: 0.25 }); }
  get carpetBlue() { return this.tex('carpetBlue', { normalScale: 0.8, envMapIntensity: 0.25 }); }
  fabric(color: THREE.ColorRepresentation = 0x8a8f9a) { return this.tex('fabric', { color, normalScale: 0.6, envMapIntensity: 0.3, physical: true, sheen: 0.5, sheenColor: 0xffffff }); }
  leather(color: THREE.ColorRepresentation = 0xffffff) { return this.tex('leather', { color, normalScale: 0.8, envMapIntensity: 0.7 }); }
  get leatherBlack() { return this.tex('leatherBlack', { normalScale: 0.8, envMapIntensity: 0.8 }); }
  quilt(color: THREE.ColorRepresentation = 0xffffff) { return this.tex('quilt', { color, normalScale: 0.9, envMapIntensity: 0.3 }); }
  siding(color: THREE.ColorRepresentation = 0xffffff) { return this.tex('siding', { color, normalScale: 1.0, envMapIntensity: 0.4 }); }
  get shingles() { return this.tex('shingles', { normalScale: 1.0, envMapIntensity: 0.3 }); }
  get grass() { return this.tex('grass', { normalScale: 0.8, envMapIntensity: 0.3 }); }
  get asphalt() { return this.tex('asphalt', { normalScale: 0.6, envMapIntensity: 0.3 }); }
  get pavers() { return this.tex('pavers', { normalScale: 0.9, envMapIntensity: 0.4 }); }
  get bark() { return this.tex('bark', { normalScale: 1.0, envMapIntensity: 0.3 }); }
  get steel() { return this.tex('steel', { normalScale: 0.4, envMapIntensity: 1.2 }); }
  paintedMetal(color: THREE.ColorRepresentation = 0xffffff) { return this.tex('paintedMetal', { color, normalScale: 0.3, envMapIntensity: 0.9 }); }
  get soil() { return this.tex('soil', { normalScale: 0.9, envMapIntensity: 0.3 }); }

  // solids
  get white() { return this.solid(0xf7f7f4, { roughness: 0.5 }); }
  get trim() { return this.solid(0xf6f4ee, { roughness: 0.45, envMapIntensity: 0.5 }); }
  get black() { return this.solid(0x1a1a1c, { roughness: 0.5 }); }
  get chrome() { return this.solid(0xdddddd, { roughness: 0.12, metalness: 1, envMapIntensity: 1.5 }); }
  get brass() { return this.solid(0xc9a44a, { roughness: 0.3, metalness: 1, envMapIntensity: 1.3 }); }
  get darkMetal() { return this.solid(0x2a2c30, { roughness: 0.4, metalness: 0.9, envMapIntensity: 1.0 }); }
  get ceramic() { return this.solid(0xfbfbf7, { roughness: 0.15, metalness: 0, envMapIntensity: 1.0, physical: true, clearcoat: 0.9, clearcoatRoughness: 0.05 }); }
  get plasticWhite() { return this.solid(0xf2f2ef, { roughness: 0.4, envMapIntensity: 0.6 }); }
  get plasticBlack() { return this.solid(0x141416, { roughness: 0.35, envMapIntensity: 0.8 }); }
  get screenOff() { return this.solid(0x0b0b0d, { roughness: 0.08, metalness: 0.2, envMapIntensity: 1.5 }); }
  get mirror() { return this.solid(0xffffff, { roughness: 0.02, metalness: 1, envMapIntensity: 2.0 }); }
  get glassClear() { return this.glass(); }
  get glassFrosted() { return this.glass({ opacity: 0.55, roughness: 0.5, tint: 0xf4f6f8 }); }
  get water() { return this.glass({ opacity: 0.4, roughness: 0.05, tint: 0xa9d6ef }); }
}
