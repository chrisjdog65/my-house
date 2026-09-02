#!/usr/bin/env node
/**
 * Check the single-file build the way a person opens it: double-clicked off the filesystem, no URL
 * parameters, through the main menu. The smoke test drives the game with ?auto=1, which skips the
 * loading screen and the menu entirely, so this covers the path that one does not.
 *
 *   node tools/openfile-check.mjs [--file dist-single/my-house.html] [--shot out.png]
 */
const pw = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const { chromium } = pw;
import path from 'node:path';

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const FILE = path.resolve(get('--file', 'dist-single/my-house.html'));
const SHOT = get('--shot', '');

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`);
};

try {
  await page.goto('file://' + FILE, { waitUntil: 'domcontentloaded' });
  // No dev server and possibly no worker pool, so allow a long first paint of the textures.
  const deadline = Date.now() + 900000;
  while (Date.now() < deadline && !(await page.evaluate(() => window.__ready === true))) await page.waitForTimeout(1000);
  check('loads from file:// with no parameters', await page.evaluate(() => window.__ready === true));

  const menuShown = await page.evaluate(() => !document.getElementById('menu').classList.contains('hidden'));
  check('main menu appears', menuShown);

  await page.click('#btn-play');
  // Settle on the engine clock, not the wall clock: software rendering runs at a few frames a
  // second, and the third-person camera eases out from the player over about a second of sim time.
  {
    const t0 = await page.evaluate(() => window.__game.engine.time);
    const wall = Date.now() + 120000;
    while (Date.now() < wall && (await page.evaluate(() => window.__game.engine.time)) - t0 < 3) {
      await page.waitForTimeout(100);
    }
  }
  const playing = await page.evaluate(() => ({
    menuHidden: document.getElementById('menu').classList.contains('hidden'),
    hud: !document.getElementById('hud').classList.contains('hidden'),
    room: document.getElementById('room-name') ? document.getElementById('room-name').textContent : null,
  }));
  check('Enter the House starts the game', playing.menuHidden && playing.hud, JSON.stringify(playing));

  const st = await page.evaluate(() => window.__stats);
  check('scene is populated', st.interactables > 100 && st.lights > 50,
    `${st.interactables} interactables, ${st.lights} lights, ${st.calls} draw calls`);
  check('character model loaded', await page.evaluate(() => !!window.__game.player.character.root.children.length));
  const settle = async (label) => page.evaluate((l) => {
    const g = window.__game, c = g.camera, cam = g.engine.camera, p = g.player;
    return `${l}: camYaw=${c.yaw.toFixed(2)} camPitch=${c.pitch.toFixed(2)} playerYaw=${p.yaw.toFixed(2)} ` +
      `landBob=${(p.landBob ?? 0).toFixed(2)} grounded=${p.grounded} ` +
      `cam=[${cam.position.toArray().map((n) => n.toFixed(2))}] player=[${p.position.toArray().map((n) => n.toFixed(2))}]`;
  }, label);
  console.log('  ' + await settle('at 3s'));
  {
    const t0 = await page.evaluate(() => window.__game.engine.time);
    const wall = Date.now() + 120000;
    while (Date.now() < wall && (await page.evaluate(() => window.__game.engine.time)) - t0 < 5) await page.waitForTimeout(100);
  }
  console.log('  ' + await settle('at 8s'));
  const view = await page.evaluate(() => {
    const g = window.__game;
    const p = g.player.position, c = g.engine.camera.position;
    return { player: [p.x, p.y, p.z].map((n) => +n.toFixed(2)), camera: [c.x, c.y, c.z].map((n) => +n.toFixed(2)),
      camDist: +c.distanceTo(p).toFixed(2), room: (g.roomAt(p.x, p.y, p.z) || {}).name || 'Outside' };
  });
  check('camera is behind the player, not inside them', view.camDist > 1.2, JSON.stringify(view));
  check('no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));

} catch (e) {
  check('ran to completion', false, String(e.message || e));
}
// A courtesy, not a check: capturing a live WebGL canvas under software rendering can outlast any
// sensible timeout, so park the render loop first and never fail the run over the picture.
if (SHOT) {
  try {
    await page.evaluate(() => window.__game.engine.stop());
    await page.waitForTimeout(1000);
    await page.screenshot({ path: SHOT, timeout: 120000 });
    console.log('wrote ' + SHOT);
  } catch (e) {
    console.log('(screenshot skipped: ' + String(e.message || e).split('\n')[0] + ')');
  }
}
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exit(failed ? 1 : 0);
