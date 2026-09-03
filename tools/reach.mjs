#!/usr/bin/env node
/**
 * Reachability test: can the player actually walk into every room?
 *
 *   node tools/reach.mjs [--url http://127.0.0.1:5173] [--timeout 240000]
 *
 * Seeing into a room is not the same as being able to enter it. Five doorways were built 0.8 m wide
 * and the player needs about 0.74 m of clear aperture once the open leaf's collider is counted, so
 * the closets, both bathrooms and the powder room could be looked into but never entered. The
 * basement was walled off by the lawn's collider cutting across the stairwell. Each case below
 * stands the player outside, opens the door, walks them forward, and asks which room they ended in.
 */
const pw = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const { chromium } = pw;
import { acquireCaptureLock } from './lock.mjs';

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const URL_BASE = get('--url', 'http://127.0.0.1:5173');
const PAGE_URL = URL_BASE.endsWith('.html') ? URL_BASE : URL_BASE + '/';

// name, start x/y/z, facing yaw, camera yaw, seconds to walk, expected room name
const CASES = [
  ['Powder Room',     0.9,  0,     1.5,  Math.PI / 2, -Math.PI / 2, 2.2, 'Powder Room'],
  ['Bathroom',        0.9,  3.05,  0.0,  Math.PI / 2, -Math.PI / 2, 2.2, 'Bathroom'],
  ['Walk-in Closet', -3.25, 3.05,  2.1,  Math.PI,      0,           2.2, 'Walk-in Closet'],
  ['Master Bathroom', -6.5, 3.05,  2.1,  Math.PI,      0,           2.2, 'Master Bathroom'],
  ['Closet (upper)',  6.5,  3.05, -2.1,  0,            Math.PI,     2.2, 'Closet'],
  ['Basement',       -0.8,  0,    -1.9,  Math.PI,      0,           7.0, 'Basement'],
];

const releaseLock = await acquireCaptureLock('reach');
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage();
await page.route('**/*', (r) => {
  const u = r.request().url();
  const ours = u.startsWith(URL_BASE) || u.startsWith('blob:') || u.startsWith('data:');
  return ours && !u.includes('/@vite/client') ? r.continue() : r.abort();
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

async function advance(seconds) {
  const t0 = await page.evaluate(() => window.__game.engine.time);
  const wall = Date.now() + 180000;
  while (Date.now() < wall) {
    if ((await page.evaluate(() => window.__game.engine.time)) - t0 >= seconds) return;
    await page.waitForTimeout(50);
  }
}

const results = [];
try {
  await page.goto(`${PAGE_URL}?auto=1&nolock=1&q=low&x=0&y=0&z=4.6&yaw=3.1416&cyaw=3.1416&cpitch=0.2&dist=3`, { waitUntil: 'domcontentloaded' });
  const deadline = Date.now() + parseInt(get('--timeout', '240000'));
  while (Date.now() < deadline && !(await page.evaluate(() => window.__ready === true))) await page.waitForTimeout(1000);
  if (!(await page.evaluate(() => window.__ready === true))) throw new Error('scene never became ready');

  for (const [label, x, y, z, yaw, cyaw, secs, expect] of CASES) {
    await page.evaluate(([px, py, pz, pyaw, pcyaw]) => {
      const g = window.__game;
      g.teleport(px, py, pz, pyaw);
      g.camera.yaw = pcyaw; g.camera.pitch = 0.1;
      // open whatever door is in front of us
      const items = g.ctx.interact.items;
      const here = g.player.position;
      for (const it of items) {
        let p = null; try { p = it.getPrompt(); } catch { /* ignore */ }
        if (p && /open door/i.test(p) && it.object && it.object.getWorldPosition) {
          const w = it.object.getWorldPosition(here.clone());
          if (w.distanceTo(here) < 2.2) { try { it.interact({ playerPos: here.clone(), cameraDir: here.clone(), cameraPos: here.clone() }); } catch { /* ignore */ } }
        }
      }
    }, [x, y, z, yaw, cyaw]);
    await advance(0.8);
    await page.keyboard.down('KeyW');
    await advance(secs);
    await page.keyboard.up('KeyW');
    await advance(0.3);
    const got = await page.evaluate(() => {
      const g = window.__game, p = g.player.position;
      const r = g.roomAt(p.x, p.y, p.z);
      return { room: r ? r.name : 'Outside', pos: [p.x, p.y, p.z].map((n) => +n.toFixed(2)) };
    });
    const ok = got.room === expect;
    results.push(ok);
    console.log(`${ok ? '✔' : '✘'} can walk into ${label} — ended in ${got.room} at ${got.pos}`);
  }
  const ok = errors.length === 0;
  results.push(ok);
  console.log(`${ok ? '✔' : '✘'} no runtime errors${ok ? '' : ' — ' + errors.slice(0, 2).join(' | ')}`);
} catch (e) {
  results.push(false);
  console.log('✘ ran to completion — ' + (e.message || e));
} finally {
  await browser.close();
  releaseLock();
}
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} check(s) failed` : 'all rooms reachable');
process.exit(failed ? 1 : 0);
