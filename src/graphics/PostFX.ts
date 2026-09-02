/**
 * Post-processing chain: render -> GTAO -> bloom -> SMAA -> output (tone mapping + sRGB).
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { settings } from '../core/Settings';

/** Ambient occlusion is resolved at this fraction of the render resolution. */
const AO_SCALE = 0.5;

export class PostFX {
  composer: EffectComposer;
  renderPass: RenderPass;
  gtao: GTAOPass;
  bloom: UnrealBloomPass;
  smaa: SMAAPass;
  output: OutputPass;
  private depthTexture: THREE.DepthTexture;
  enabled = true;

  constructor(private renderer: THREE.WebGLRenderer, private scene: THREE.Scene, private camera: THREE.PerspectiveCamera) {
    const size = renderer.getSize(new THREE.Vector2());
    const pr = renderer.getPixelRatio();
    // The composer target carries a depth texture so the AO pass can read the depth the scene has
    // already been rendered with, instead of drawing the whole scene a second time to build its own
    // G-buffer. That second pass was ~400 draw calls a frame, more than the visible render itself.
    const depthTexture = new THREE.DepthTexture(size.x * pr, size.y * pr);
    depthTexture.format = THREE.DepthStencilFormat;
    depthTexture.type = THREE.UnsignedInt248Type;
    const target = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, {
      type: THREE.HalfFloatType,
      samples: 0,
      depthTexture,
    });
    this.depthTexture = depthTexture;
    this.composer = new EffectComposer(renderer, target);
    this.renderPass = new RenderPass(scene, camera);
    // Ambient occlusion runs at half resolution. It is a low-frequency term -- it darkens creases
    // and contact points, nothing with a hard edge -- so resolving it per-pixel bought nothing while
    // costing four times the fill AND a second full scene pass for normals at full size. Half res
    // also widens the denoise footprint in screen space, which is what was reading as static.
    this.gtao = new GTAOPass(scene, camera, size.x * pr * AO_SCALE, size.y * pr * AO_SCALE);
    this.gtao.output = GTAOPass.OUTPUT.Default;
    // Was 0.9 with scale 1.2: enough darkening to grey the whole image, which read as haze.
    this.gtao.blendIntensity = 0.6;
    this.gtao.updateGtaoMaterial({
      radius: 0.35,
      distanceExponent: 1.5,
      thickness: 1.0,
      scale: 1.0,
      samples: 10,
      distanceFallOff: 1.0,
      screenSpaceRadius: false,
    });
    this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 16 });
    // Reuse the scene depth and derive normals from it (passing no normal texture selects the
    // reconstruct-from-depth path), so the pass no longer re-renders the scene for a normal buffer.
    this.gtao.setGBuffer(depthTexture, undefined);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.12, 0.3, 1.35);
    this.smaa = new SMAAPass();
    this.output = new OutputPass();

    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.gtao);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.output);
    this.composer.addPass(this.smaa);
    this.applySettings();
    settings.onChange(() => this.applySettings());
  }

  applySettings() {
    this.gtao.enabled = settings.get('ao');
    this.bloom.enabled = settings.get('bloom');
    this.smaa.enabled = settings.get('antialias');
  }

  setSceneBox(box: THREE.Box3) {
    this.gtao.setSceneClipBox(box);
  }

  setSize(w: number, h: number) {
    this.composer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    this.depthTexture.image.width = w * pr;
    this.depthTexture.image.height = h * pr;
    this.depthTexture.needsUpdate = true;
    this.gtao.setSize(w * pr * AO_SCALE, h * pr * AO_SCALE);
    this.bloom.setSize(w, h);
  }

  render(dt: number) {
    if (this.enabled) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }
}
