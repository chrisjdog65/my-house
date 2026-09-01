#!/usr/bin/env node
/**
 * Headless screenshot harness for visual QA.
 *
 * Usage:
 *   node tools/screenshot.mjs [--url http://localhost:5173] [--out shots] [--only living,kitchen] [--w 1280 --h 720]
 *   node tools/screenshot.mjs --custom "name:x,y,z,yaw,cyaw,cpitch,dist[,t]"
 *
 * Each shot loads the game with URL params that auto-start it, teleport the player and aim the camera.
 * Writes PNGs to the output directory and prints render stats + any JS errors as JSON.
 */
const pw = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const { chromium } = pw;
import fs from 'node:fs';
import { acquireCaptureLock } from './lock.mjs';
import path from 'node:path';

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const URL_BASE = get('--url', 'http://localhost:5173');
const OUT = get('--out', 'shots');
const W = parseInt(get('--w', '1280')), H = parseInt(get('--h', '720'));
const ONLY = get('--only', '').split(',').filter(Boolean);
const CUSTOM = args.filter((a, i) => args[i - 1] === '--custom');
const TIME = get('--t', '');
const QUALITY = get('--q', 'high');

// name: [x, y, z, playerYaw, camYaw, camPitch, dist, timeOfDay?]
// camYaw: camera orbit angle; the camera sits at pivot + (sin(yaw), ., cos(yaw)) * dist and looks the opposite way.
// So camYaw = PI means the camera is at -z of the player looking toward +z.
const SHOTS = {
  exterior_front: [0, -0.9, 14, Math.PI, 0.0, 0.25, 6, 15.5],
  exterior_front_dusk: [3, -0.9, 14, Math.PI, 0.3, 0.2, 6, 18.6],
  exterior_side: [12, -0.9, 3, -Math.PI / 2, -Math.PI / 2 + 0.6, 0.25, 6],
  exterior_back: [3, -0.9, -10, 0, Math.PI - 0.3, 0.25, 6],
  porch: [0, 0, 7.5, Math.PI, 0, 0.1, 3],
  foyer: [0, 0, 4.6, Math.PI, 0.15, 0.12, 3.2],
  hall: [0, 0, 1.5, Math.PI, 0.3, 0.15, 3.2],
  living: [-3.2, 0, 4.2, -Math.PI / 2, Math.PI / 2 + 0.3, 0.15, 3.6],
  living_fireplace: [-5.5, 0, 3, -Math.PI / 2, Math.PI / 2, 0.1, 3.4],
  living_from_arch: [-1.8, 0, 1.3, -Math.PI * 0.6, Math.PI * 0.4, 0.12, 3.4],
  dining: [-3.2, 0, -2, -Math.PI * 0.75, Math.PI * 0.25, 0.2, 3.6],
  dining_wide: [-6.8, 0, -5, Math.PI * 0.25, -Math.PI * 0.75, 0.2, 3.4],
  kitchen: [3, 0, -1.5, -Math.PI, 0.25, 0.18, 3.6],
  kitchen_island: [5.5, 0, -1.2, Math.PI, 0.05, 0.22, 3.6],
  kitchen_sink: [4.5, 0, -4.5, Math.PI, 0.0, 0.1, 2.8],
  nook: [4.5, 0, 0.9, Math.PI / 2, -Math.PI / 2 - 0.2, 0.15, 3.4],
  powder: [2.5, 0, 1.5, 0, Math.PI, 0.15, 2.2],
  study: [3, 0, 4.2, Math.PI / 2, -Math.PI / 2 + 0.3, 0.15, 3.4],
  stairs_up: [0.7, 0.2, -1.6, 0, Math.PI, 0.3, 3.4],
  upper_hall: [0, 3.05, 4, 0, Math.PI - 0.4, 0.2, 3.4],
  master: [-4.5, 3.05, 4.5, -Math.PI / 2, Math.PI / 2 - 0.4, 0.15, 3.6],
  master_bed: [-2.5, 3.05, 3, -Math.PI, 0.5, 0.15, 3.6],
  masterbath: [-6.2, 3.05, 0.6, 0, Math.PI, 0.15, 2.6],
  closet: [-3.2, 3.05, 0.8, 0, Math.PI, 0.15, 2.4],
  bedroom2: [-4.5, 3.05, -2.5, 0, Math.PI - 0.4, 0.2, 3.4],
  bedroom3: [3.5, 3.05, 3, Math.PI / 2, -Math.PI / 2 + 0.3, 0.15, 3.6],
  bath: [2.5, 3.05, 0.4, Math.PI / 2, -Math.PI / 2, 0.15, 2.6],
  bedroom4: [3.5, 3.05, -3, Math.PI / 2, -Math.PI / 2 - 0.3, 0.15, 3.6],
  stairs_down: [-0.8, 0, -1.2, 0, Math.PI, 0.35, 2.6],
  basement_hall: [0.5, -2.95, -4, 0, Math.PI, 0.15, 3.2],
  rec: [-4.5, -2.95, 3, -Math.PI, 0.3, 0.15, 3.6],
  rec_wide: [-2.5, -2.95, -3, -Math.PI * 0.75, Math.PI * 0.2, 0.15, 3.6],
  laundry: [3, -2.95, -3.5, Math.PI / 2, -Math.PI / 2 + 0.2, 0.15, 3.4],
  workshop: [3, -2.95, 2.5, Math.PI / 2, -Math.PI / 2 - 0.2, 0.15, 3.4],
  yard_back: [3, -0.9, -8, 0, Math.PI - 0.2, 0.25, 4.5],
  yard_night: [-4, -0.9, 12, Math.PI, 0.2, 0.2, 6, 22.5],
};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const releaseLock = await acquireCaptureLock('screenshot ' + (ONLY.join(',') || 'all'));
  // Persistent profile so the IndexedDB texture cache survives between runs (much faster captures).
  // A template profile is cloned per run so several harness processes can run concurrently.
  const os = await import('node:os');
  const scratch = process.env.SHOT_PROFILE_DIR || path.join(os.tmpdir(), 'myhouse-shots');
  const template = path.join(scratch, 'profile-template');
  const profile = path.join(scratch, `profile-${process.pid}`);
  fs.mkdirSync(scratch, { recursive: true });
  const hadTemplate = fs.existsSync(template);
  if (hadTemplate) fs.cpSync(template, profile, { recursive: true });
  const context = await chromium.launchPersistentContext(profile, {
    headless: true,
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-web-security'],
  });
  const browser = { close: async () => { await context.close(); if (!hadTemplate) { try { fs.cpSync(profile, template, { recursive: true }); } catch {} } try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} } };
  const page = context.pages()[0] || await context.newPage();
  // block anything not served by the dev server (fonts etc.) so page load never stalls on the network
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.includes('/@vite/client')) { route.abort(); return; } // no HMR reloads mid-capture
    if (u.startsWith(URL_BASE) || u.startsWith('data:') || u.startsWith('blob:')) route.continue(); else route.abort();
  });
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
  const results = [];
  let list = Object.entries(SHOTS);
  if (ONLY.length) list = list.filter(([n]) => ONLY.includes(n));
  for (const c of CUSTOM) {
    const [name, rest] = c.split(':');
    list.push([name, rest.split(',').map(Number)]);
  }
  for (const [name, [x, y, z, yaw, cyaw, cpitch, dist, t]] of list) {
    const p = new URLSearchParams({ auto: '1', nolock: '1', freeze: '1', x: String(x), y: String(y), z: String(z), yaw: String(yaw), cyaw: String(cyaw), cpitch: String(cpitch), dist: String(dist), q: QUALITY });
    p.set('t', String(TIME || t || 15.5));
    const url = `${URL_BASE}/?${p}`;
    const t0 = Date.now();
    logs.length = 0;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const deadline = Date.now() + parseInt(get('--timeout', '150000'));
      let ready = false;
      while (Date.now() < deadline) {
        ready = await page.evaluate(() => window.__ready === true);
        if (ready) break;
        await page.waitForTimeout(1000);
        if (process.env.SHOT_VERBOSE) {
          const lbl = await page.evaluate(() => (document.getElementById('progress-label') || {}).textContent + ' | errors=' + JSON.stringify((window.__errors || []).slice(0, 3)));
          console.log(`   … ${name}: ${lbl}`);
        }
      }
      if (!ready) {
        const lbl = await page.evaluate(() => (document.getElementById('progress-label') || {}).textContent + ' | errors=' + JSON.stringify((window.__errors || []).slice(0, 5)));
        throw new Error('timed out waiting for scene: ' + lbl);
      }
      await page.waitForTimeout(400);
      const file = path.join(OUT, `${name}.png`);
      await page.screenshot({ path: file, type: 'png', timeout: 120000 });
      const stats = await page.evaluate(() => window.__stats);
      results.push({ name, file, ms: Date.now() - t0, calls: stats.calls, triangles: stats.triangles, errors: stats.errors, logs: [...logs].slice(0, 20) });
      console.log(`✔ ${name} (${Date.now() - t0}ms) calls=${stats.calls} tris=${stats.triangles}${stats.errors.length ? ' ERRORS=' + stats.errors.join(' | ') : ''}`);
    } catch (e) {
      results.push({ name, error: String(e.message || e), logs: [...logs].slice(0, 40) });
      console.log(`✘ ${name}: ${e.message}`);
      try { await page.screenshot({ path: path.join(OUT, `${name}.FAILED.png`) }); } catch { /* ignore */ }
    }
  }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  await browser.close();
  releaseLock();
}

main().catch((e) => { console.error(e); process.exit(1); });
// never leave a headless browser behind
setTimeout(() => { console.error('capture run exceeded 40 minutes; aborting'); process.exit(2); }, 40 * 60 * 1000).unref();
