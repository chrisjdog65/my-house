#!/usr/bin/env node
/**
 * Frame-time benchmark. Loads a view, then measures median frame time with individual features
 * toggled so the cost of each can be attributed rather than guessed at.
 *
 *   node tools/bench.mjs [--view rec] [--frames 40] [--w 1280 --h 720]
 *
 * Headless rendering is software (swiftshader), so absolute numbers are far slower than a real GPU.
 * The RATIOS are what matter: a pass that doubles the frame time here is a pass that costs real
 * money on a GPU too.
 */
const pw = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const { chromium } = pw;
import { acquireCaptureLock } from './lock.mjs';

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const VIEW = get('--view', 'living');
const FRAMES = parseInt(get('--frames', '40'));
const W = parseInt(get('--w', '1280')), H = parseInt(get('--h', '720'));

// player x,y,z, playerYaw, camYaw, camPitch, dist
const VIEWS = {
  living: [-3.2, 0, 4.2, -Math.PI / 2, Math.PI / 2 + 0.3, 0.15, 3.6],
  kitchen: [3, 0, -1.5, -Math.PI, 0.25, 0.18, 3.6],
  rec: [-4.5, -2.95, 3, -Math.PI, 0.3, 0.15, 3.6],
  yard: [0, -0.9, 10.5, Math.PI, 0, 0.18, 3.6],
  exterior: [0, -0.9, 14, Math.PI, 0.0, 0.25, 6],
};

const release = await acquireCaptureLock('bench ' + VIEW);
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
try {
  const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  // No hot-module reloads mid-measurement: an editor save would swap the scene out from under us.
  await page.route('**/@vite/client', (r) => r.abort());
  const [x, y, z, yaw, cyaw, cpitch, dist] = VIEWS[VIEW] || VIEWS.living;
  const q = new URLSearchParams({ auto: '1', nolock: '1', q: 'high', x, y, z, yaw, cyaw, cpitch, dist, t: '15.5' });
  await page.goto('http://localhost:5173/?' + q, { waitUntil: 'domcontentloaded' });
  const deadline = Date.now() + 600000;
  while (Date.now() < deadline && !(await page.evaluate(() => window.__ready === true))) await page.waitForTimeout(1000);
  if (!(await page.evaluate(() => window.__ready === true))) throw new Error('scene never became ready');

  // Dynamic resolution scaling would move the target while we measure it.
  await page.evaluate(() => { window.__game.engine.adaptive = false; });

  const measure = async () => page.evaluate(async (n) => {
    const e = window.__game.engine;
    const draw = () => { if (e.postfx) e.postfx.render(0.016); else e.renderer.render(e.scene, e.camera); };
    draw(); draw(); // warm shader compiles for the current configuration
    const ts = [];
    for (let i = 0; i < n; i++) {
      const t0 = performance.now();
      draw();
      ts.push(performance.now() - t0);
    }
    ts.sort((a, b) => a - b);
    return { median: +ts[Math.floor(ts.length / 2)].toFixed(1), best: +ts[0].toFixed(1),
      calls: e.renderer.info.render.calls, tris: e.renderer.info.render.triangles };
  }, FRAMES);

  const apply = async (fn) => page.evaluate(fn);
  const rows = [];
  const run = async (label, setup) => {
    if (setup) await apply(setup);
    const m = await measure();
    rows.push({ label, ...m });
    console.log(`${label.padEnd(34)} ${String(m.median).padStart(7)} ms   (best ${String(m.best).padStart(6)})  calls=${m.calls}`);
  };

  const pr = await page.evaluate(() => window.__game.engine.renderer.getPixelRatio());
  console.log(`view=${VIEW}  ${W}x${H}  pixelRatio=${pr}  frames=${FRAMES}\n`);

  await run('current build');
  // The settings this pass replaced, re-applied at runtime for a like-for-like A/B in one page load.
  await run('  as before this change', () => {
    const e = window.__game.engine, p = e.postfx;
    p.gtao.setSize(e.renderer.domElement.width, e.renderer.domElement.height);
    p.gtao.blendIntensity = 0.9;
    p.gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.0, scale: 1.2, samples: 14, distanceFallOff: 1.0, screenSpaceRadius: false });
    e.scene.traverse((o) => {
      if (o.isDirectionalLight && o.castShadow) { o.shadow.mapSize.set(4096, 4096); o.shadow.map = null; }
      if (o.isPointLight && o.castShadow) { o.shadow.mapSize.set(1024, 1024); o.shadow.map = null; }
    });
  });
  await run('  + at devicePixelRatio 2', () => {
    const e = window.__game.engine;
    e.renderer.setPixelRatio(2); e.resize();
  });
  await run('back to current build', () => {
    const e = window.__game.engine, p = e.postfx;
    e.renderer.setPixelRatio(1); e.resize();
    p.gtao.setSize(e.renderer.domElement.width * 0.5, e.renderer.domElement.height * 0.5);
    p.gtao.blendIntensity = 0.6;
    p.gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.0, scale: 1.0, samples: 10, distanceFallOff: 1.0, screenSpaceRadius: false });
    e.scene.traverse((o) => {
      if (o.isDirectionalLight && o.castShadow) { o.shadow.mapSize.set(2048, 2048); o.shadow.map = null; }
      if (o.isPointLight && o.castShadow) { o.shadow.mapSize.set(512, 512); o.shadow.map = null; }
    });
  });
  await run('- ambient occlusion', () => { window.__game.engine.postfx.gtao.enabled = false; });
  await run('- AO - bloom', () => { window.__game.engine.postfx.bloom.enabled = false; });
  await run('- AO - bloom - SMAA', () => { window.__game.engine.postfx.smaa.enabled = false; });
  await run('no post at all', () => { window.__game.engine.postfx.enabled = false; });
  await run('  + no sun shadow', () => {
    const s = window.__game.engine.scene;
    s.traverse((o) => { if (o.isDirectionalLight) o.castShadow = false; });
  });
  await run('  + no point shadows', () => {
    const s = window.__game.engine.scene;
    s.traverse((o) => { if (o.isPointLight) o.castShadow = false; });
  });
  await run('  + half resolution', () => {
    const e = window.__game.engine;
    e.renderer.setPixelRatio(e.renderer.getPixelRatio() * 0.5);
    e.resize();
  });

  const base = rows[0].median;
  console.log(`\ncurrent build ${base} ms/frame; each later row is the delta from the row above it:`);
  for (let i = 1; i < rows.length; i++) {
    const d = rows[i - 1].median - rows[i].median;
    console.log(`  ${rows[i].label.replace(/^[-+ ]+/, '').padEnd(26)} ${d >= 0 ? '-' : '+'}${Math.abs(d).toFixed(1)} ms`);
  }
  const before = rows.find((r) => r.label.includes('as before'));
  if (before) console.log(`\nrender cost before this change vs after: ${(before.median / base).toFixed(2)}x`);
} finally {
  await browser.close();
  release();
}
