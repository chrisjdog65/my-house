#!/usr/bin/env node
/**
 * Scene performance profile: draw calls, triangles, static vs dynamic meshes, per-room dynamic
 * mesh counts and the heaviest objects. Use it to find rooms that need batching/merging.
 *
 *   node tools/perf.mjs [--url http://127.0.0.1:5173] [--room living]
 */
const pw = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const { chromium } = pw;
import { acquireCaptureLock } from './lock.mjs';
const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const URL_BASE = get('--url', 'http://127.0.0.1:5173');
const ROOM = get('--room', '');
const releaseLock = await acquireCaptureLock('perf');

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 320, height: 180 } });
const page = await context.newPage();
await page.route('**/*', (r) => (r.request().url().startsWith(URL_BASE) && !r.request().url().includes('/@vite/client')) ? r.continue() : r.abort());
await page.goto(`${URL_BASE}/?auto=1&nolock=1&q=low&nofx=1&noshadow=1&x=0&y=0&z=1&yaw=0&cyaw=0&cpitch=0.2&dist=3`, { waitUntil: 'domcontentloaded' });
const deadline = Date.now() + 400000;
while (Date.now() < deadline && !(await page.evaluate(() => window.__ready === true))) await page.waitForTimeout(1000);
const out = await page.evaluate((ROOM) => {
  const g = window.__game; const scene = g.engine.scene;
  const tri = (m) => { const geo = m.geometry; if (!geo) return 0; const idx = geo.index; return idx ? idx.count / 3 : (geo.attributes.position ? geo.attributes.position.count / 3 : 0); };
  const pos = new g.player.position.constructor();
  const rows = [];
  let stat = 0, statTris = 0, dyn = 0, dynTris = 0;
  const perRoom = {};
  const path = (o) => { const p = []; let c = o; while (c && c !== scene) { p.unshift(c.name || c.type); c = c.parent; } return p.join('/'); };
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (!o.isMesh && !o.isPoints) return;
    const t = tri(o);
    let inStatic = false; let c = o; while (c) { if (c.name === 'static') inStatic = true; c = c.parent; }
    if (inStatic) { stat++; statTris += t; return; }
    dyn++; dynTris += t;
    o.getWorldPosition(pos);
    const room = g.roomAt(pos.x, pos.y, pos.z);
    const key = room ? room.id : 'outside';
    perRoom[key] = perRoom[key] || { meshes: 0, tris: 0 };
    perRoom[key].meshes++; perRoom[key].tris += t;
    if (!ROOM || key === ROOM) rows.push({ t: Math.round(t), room: key, path: path(o).slice(0, 80), mat: (o.material && (o.material.name || o.material.type)) || '?', shadow: o.castShadow });
  });
  rows.sort((a, b) => b.t - a.t);
  const staticBatches = scene.getObjectByName('static').children.length;
  return { calls: g.engine.lastStats.calls, triangles: g.engine.lastStats.triangles, staticBatches, stat, statTris: Math.round(statTris), dyn, dynTris: Math.round(dynTris), perRoom, top: rows.slice(0, 40), dynamicTop: g.ctx.dynamic.children.length, interactables: g.ctx.interact.items.length, lights: g.ctx.lights.virtual.length };
}, ROOM);
console.log(`frame: ${out.calls} draw calls, ${out.triangles} triangles (low quality, no shadows/post)`);
console.log(`static: ${out.staticBatches} batches, ${out.statTris} tris | dynamic: ${out.dyn} meshes in ${out.dynamicTop} top-level objects, ${out.dynTris} tris | interactables ${out.interactables} | lights ${out.lights}`);
console.log('dynamic meshes per room (target: <= 40 per room, tiny things merged):');
for (const [k, v] of Object.entries(out.perRoom).sort((a, b) => b[1].meshes - a[1].meshes)) console.log(`  ${String(v.meshes).padStart(5)} meshes ${String(Math.round(v.tris)).padStart(8)} tris  ${k}`);
console.log(`heaviest dynamic meshes${ROOM ? ' in ' + ROOM : ''}:`);
for (const r of out.top) console.log(`  ${String(r.t).padStart(7)} ${r.shadow ? 'S' : '-'} ${r.room.padEnd(12)} ${r.path} [${r.mat}]`);
await browser.close();
releaseLock();
