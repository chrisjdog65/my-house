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

export class PostFX {
  composer: EffectComposer;
  renderPass: RenderPass;
  gtao: GTAOPass;
  bloom: UnrealBloomPass;
  smaa: SMAAPass;
  output: OutputPass;
  enabled = true;

  constructor(private renderer: THREE.WebGLRenderer, private scene: THREE.Scene, private camera: THREE.PerspectiveCamera) {
    const size = renderer.getSize(new THREE.Vector2());
    const pr = renderer.getPixelRatio();
    const target = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, {
      type: THREE.HalfFloatType,
      samples: 0,
    });
    this.composer = new EffectComposer(renderer, target);
    this.renderPass = new RenderPass(scene, camera);
    this.gtao = new GTAOPass(scene, camera, size.x * pr, size.y * pr);
    this.gtao.output = GTAOPass.OUTPUT.Default;
    this.gtao.blendIntensity = 0.9;
    this.gtao.updateGtaoMaterial({
      radius: 0.35,
      distanceExponent: 1.5,
      thickness: 1.0,
      scale: 1.2,
      samples: 14,
      distanceFallOff: 1.0,
      screenSpaceRadius: false,
    });
    this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 16 });
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
    this.gtao.setSize(w * pr, h * pr);
    this.bloom.setSize(w, h);
  }

  render(dt: number) {
    if (this.enabled) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }
}
