#!/usr/bin/env node
/**
 * Gameplay smoke test: loads the game headlessly, walks forward, opens the front door, picks up
 * an object if one is nearby, and reports what happened. Exit code 1 on failure.
 *
 * Usage:
 *   node tools/smoke.mjs [--url http://127.0.0.1:5173] [--timeout 240000]
 *   node tools/smoke.mjs --url file:///abs/path/my-house.html --timeout 900000
 */
const pw = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const { chromium } = pw;
import { acquireCaptureLock } from './lock.mjs';
const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const URL_BASE = get('--url', 'http://127.0.0.1:5173');
// A --url naming a page (the single-file build, opened over file://) takes the query directly;
// anything else is an origin and needs the trailing slash.
const PAGE_URL = URL_BASE.endsWith('.html') ? URL_BASE : URL_BASE + '/';
const releaseLock = await acquireCaptureLock('smoke');

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 800, height: 450 } });
const page = await context.newPage();
await page.route('**/*', (r) => {
  const u = r.request().url();
  // blob:/data: are the inlined worker and the embedded character model in the single-file build.
  const ours = u.startsWith(URL_BASE) || u.startsWith('blob:') || u.startsWith('data:');
  return ours && !u.includes('/@vite/client') ? r.continue() : r.abort();
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const results = [];
// Hold a key for `simSeconds` of *simulation* time (headless software rendering runs slower than real time).
async function hold(key, simSeconds) {
  const t0 = await page.evaluate(() => window.__game.engine.time);
  await page.keyboard.down(key);
  const wall = Date.now() + 60000;
  while (Date.now() < wall) {
    const t = await page.evaluate(() => window.__game.engine.time);
    if (t - t0 >= simSeconds) break;
    await page.waitForTimeout(50);
  }
  await page.keyboard.up(key);
  await page.waitForTimeout(150);
}
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); };

try {
  await page.goto(`${PAGE_URL}?auto=1&nolock=1&q=low&x=0&y=0&z=4.6&yaw=3.1416&cyaw=3.1416&cpitch=0.2&dist=3`, { waitUntil: 'domcontentloaded' });
  // Generous: the single-file build may have to paint every texture on the main thread.
  const deadline = Date.now() + parseInt(get('--timeout', '240000'));
  while (Date.now() < deadline && !(await page.evaluate(() => window.__ready === true))) await page.waitForTimeout(1000);
  check('scene ready', await page.evaluate(() => window.__ready === true));

  // walk forward (camera faces -z? camYaw=PI => camera at -z looking +z; forward = +z)
  const p0 = await page.evaluate(() => window.__game.player.position.toArray());
  await hold('KeyW', 1.2);
  const p1 = await page.evaluate(() => window.__game.player.position.toArray());
  const moved = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
  check('player walks', moved > 0.3, `moved ${moved.toFixed(2)} m from ${p0.map((n) => n.toFixed(2))} to ${p1.map((n) => n.toFixed(2))}`);
  check('player stays on floor', Math.abs(p1[1]) < 0.2, `y=${p1[1].toFixed(2)}`);

  // teleport in front of the front door and open it with E
  await page.evaluate(() => { const g = window.__game; g.teleport(0, 0, 4.9, 0); g.camera.yaw = Math.PI; g.camera.pitch = 0.1; });
  await page.waitForTimeout(600);
  const prompt = await page.evaluate(() => document.getElementById('prompt').classList.contains('hidden') ? null : document.getElementById('prompt-text').textContent);
  check('door prompt shown', prompt === 'Open door', `prompt=${prompt}`);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(1500);
  const doorState = await page.evaluate(() => { const d = window.__game.world.structure.doors.get('frontDoor'); return { open: d.open, angle: d.angle }; });
  check('front door opens', doorState.open && Math.abs(doorState.angle) > 0.5, JSON.stringify(doorState));

  // walk through the open door onto the porch
  await hold('KeyW', 2.4);
  const p2 = await page.evaluate(() => window.__game.player.position.toArray());
  check('walked through doorway', p2[2] > 6.3, `z=${p2[2].toFixed(2)}`);

  // jump
  await page.evaluate(() => window.__game.teleport(0, 0, 1.0, 0));
  await page.waitForTimeout(400);
  const yBefore = await page.evaluate(() => window.__game.player.position.y);
  await page.keyboard.press('Space');
  let maxY = yBefore;
  const tj = await page.evaluate(() => window.__game.engine.time);
  while ((await page.evaluate(() => window.__game.engine.time)) - tj < 1.0) { await page.waitForTimeout(40); maxY = Math.max(maxY, await page.evaluate(() => window.__game.player.position.y)); }
  check('player jumps', maxY - yBefore > 0.3, `apex +${(maxY - yBefore).toFixed(2)} m`);

  // stairs: walk up from the bottom of the stairs
  await page.evaluate(() => { const g = window.__game; g.teleport(0.75, 0, -1.0, Math.PI); g.camera.yaw = 0; });
  await page.waitForTimeout(400);
  await hold('KeyW', 5.0);
  const p3 = await page.evaluate(() => window.__game.player.position.toArray());
  check('climbs stairs', p3[1] > 2.0, `reached y=${p3[1].toFixed(2)} at z=${p3[2].toFixed(2)}`);

  // pickups
  const pick = await page.evaluate(() => {
    const items = window.__game.ctx.interact.items.filter((i) => i.constructor && i.constructor.name === 'Pickup');
    return items.length;
  });
  check('pickups exist', pick > 5, `${pick} pickups`);
  // --- interaction coverage: light switch, pickup + throw, fireplace, a door on each floor ---
  const findByPrompt = async (needle) => page.evaluate((n) => {
    const items = window.__game.ctx.interact.items;
    for (let i = 0; i < items.length; i++) {
      let p = null; try { p = items[i].getPrompt(); } catch { /* ignore */ }
      if (p && p.toLowerCase().includes(n)) return i;
    }
    return -1;
  }, needle);
  const interactAt = (i) => page.evaluate((idx) => {
    const g = window.__game; const it = g.ctx.interact.items[idx];
    const p = g.player.position.clone();
    it.interact({ playerPos: p, cameraDir: new p.constructor(0, 0, 1), cameraPos: p });
    return it.getPrompt();
  }, i);

  const swIdx = await findByPrompt('turn on');
  if (swIdx >= 0) {
    const before = await page.evaluate((i) => window.__game.ctx.interact.items[i].getPrompt(), swIdx);
    const after = await interactAt(swIdx);
    check('a light toggles', before !== after, `"${before}" -> "${after}"`);
  } else check('a light toggles', false, 'no toggleable light found');

  const fireIdx = await findByPrompt('fireplace');
  if (fireIdx >= 0) {
    const after = await interactAt(fireIdx);
    check('fireplace lights', /extinguish|put out/i.test(after || ''), `prompt now "${after}"`);
  } else check('fireplace lights', false, 'no fireplace interactable');

  const pickIdx = await findByPrompt('pick up');
  if (pickIdx >= 0) {
    await page.evaluate((i) => { const g = window.__game; const it = g.ctx.interact.items[i]; g.ctx.carry.pickUp(it); }, pickIdx);
    await page.waitForTimeout(400);
    const held = await page.evaluate(() => window.__game.ctx.carry.held ? window.__game.ctx.carry.held.name : null);
    check('object can be carried', !!held, `holding ${held}`);
    const p0 = await page.evaluate(() => { const h = window.__game.ctx.carry.held; const t = h.dyn.body.translation(); return [t.x, t.y, t.z]; });
    await page.evaluate(() => window.__game.ctx.carry.throw(new window.__game.player.position.constructor(0, 0.2, 1), 9));
    await page.waitForTimeout(900);
    const p1 = await page.evaluate((idx) => { const t = window.__game.ctx.interact.items[idx].dyn.body.translation(); return [t.x, t.y, t.z]; }, pickIdx);
    const moved = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    check('thrown object flies', moved > 0.3, `travelled ${moved.toFixed(2)} m`);
  } else check('object can be carried', false, 'no pickup found');

  const interior = await page.evaluate(() => {
    const doors = window.__game.world.structure.doors;
    return Array.from(doors.keys());
  });
  check('every planned door exists', interior.length >= 15, `${interior.length} doors: ${interior.slice(0, 4).join(', ')}…`);

  const stats = await page.evaluate(() => window.__stats);
  check('no runtime errors', errors.length === 0 && stats.errors.length === 0, [...errors, ...stats.errors].slice(0, 3).join(' | '));
  console.log(`stats: ${JSON.stringify({ calls: stats.calls, triangles: stats.triangles, interactables: stats.interactables, lights: stats.lights })}`);
} catch (e) {
  check('smoke test ran', false, String(e.message || e));
}
await browser.close();
releaseLock();
process.exit(results.every((r) => r.ok) ? 0 : 1);
