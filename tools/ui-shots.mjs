#!/usr/bin/env node
/**
 * Captures the UI screens (main menu, settings, controls, pause, HUD with map) for review.
 *   node tools/ui-shots.mjs [--url http://127.0.0.1:5173] [--out shots/ui]
 */
const pw = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const { chromium } = pw;
import fs from 'node:fs';
import { acquireCaptureLock } from './lock.mjs';
import path from 'node:path';
const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const URL_BASE = get('--url', 'http://127.0.0.1:5173');
const OUT = get('--out', 'shots/ui');
fs.mkdirSync(OUT, { recursive: true });
const releaseLock = await acquireCaptureLock('ui-shots');
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
await page.route('**/*', (r) => (r.request().url().startsWith(URL_BASE) && !r.request().url().includes('/@vite/client')) ? r.continue() : r.abort());
const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png'), timeout: 120000 });
await page.goto(`${URL_BASE}/?nolock=1&q=low`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await shot('01-loading');
const deadline = Date.now() + 240000;
while (Date.now() < deadline && !(await page.evaluate(() => !document.getElementById('menu').classList.contains('hidden')))) await page.waitForTimeout(1000);
await page.waitForTimeout(3000);
await shot('02-menu');
await page.click('#btn-settings');
await page.waitForTimeout(500);
await shot('03-settings');
await page.click('#btn-settings-back');
await page.click('#btn-controls');
await page.waitForTimeout(500);
await shot('04-controls');
await page.click('#btn-controls-back');
await page.click('#btn-play');
await page.waitForTimeout(4000);
await shot('05-hud');
await page.keyboard.press('Tab');
await page.waitForTimeout(2500);
await shot('06-map');
await page.keyboard.press('Escape');
await page.waitForTimeout(800);
await shot('07-pause');
await browser.close();
releaseLock();
console.log('done');
