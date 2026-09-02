#!/usr/bin/env node
/**
 * Fold the singlefile build into one self-contained HTML page.
 *
 * Run `vite build --mode singlefile` first (npm run build:single does both). That emits one JS
 * bundle and one stylesheet into dist-single/; this script inlines them into the HTML along with
 * the character model as a data URI, so the result opens straight from the filesystem with nothing
 * beside it.
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'dist-single';
const OUT = path.join(SRC, 'my-house.html');
const MODEL = 'public/models/Soldier.glb';

const read = (p) => fs.readFileSync(p, 'utf8');
const mb = (n) => (n / (1024 * 1024)).toFixed(2) + ' MB';

let html = read(path.join(SRC, 'index.html'));

// stylesheet -> <style>
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_m, href) => {
  const css = read(path.join(SRC, href.replace(/^\.?\//, '')));
  return `<style>\n${css}\n</style>`;
});

// module script -> inline module. Rollup emits no bare "</script>" in its output, but a string
// literal in the source could still close the tag early, so neutralise that sequence.
let bundleBytes = 0;
html = html.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g, (_m, src) => {
  const js = read(path.join(SRC, src.replace(/^\.?\//, '')));
  bundleBytes = Buffer.byteLength(js);
  return `<script type="module">\n${js.replace(/<\/script>/gi, '<\\/script>')}\n</script>`;
});

// character model -> data URI, announced before the bundle runs (see src/main.ts)
const glb = fs.readFileSync(MODEL);
const modelTag =
  `<script>window.__MODEL_URL="data:model/gltf-binary;base64,${glb.toString('base64')}";</script>`;
html = html.replace('<script type="module">', modelTag + '\n<script type="module">');

if (!bundleBytes) throw new Error('no module script found in dist-single/index.html');
fs.writeFileSync(OUT, html);
console.log(`${OUT}  ${mb(Buffer.byteLength(html))}  (bundle ${mb(bundleBytes)}, model ${mb(glb.length)})`);
