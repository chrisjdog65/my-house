/**
 * Global capture lock: headless software rendering saturates the CPU, so only one capture run
 * (screenshot / smoke / perf) executes at a time on this machine. Others wait their turn.
 * Set NO_CAPTURE_LOCK=1 to bypass.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const LOCK_DIR = path.join(os.tmpdir(), 'myhouse-capture.lock');
const STALE_MS = 15 * 60 * 1000;

function safeRead(f) { try { return fs.readFileSync(path.join(LOCK_DIR, f), 'utf8'); } catch { return '?'; } }

function holderAlive() {
  try {
    const pid = parseInt(fs.readFileSync(path.join(LOCK_DIR, 'pid'), 'utf8'), 10);
    if (!pid) return false;
    process.kill(pid, 0);
    const age = Date.now() - fs.statSync(LOCK_DIR).mtimeMs;
    return age < STALE_MS;
  } catch {
    return false;
  }
}

export async function acquireCaptureLock(label = 'capture') {
  if (process.env.NO_CAPTURE_LOCK) return () => {};
  const t0 = Date.now();
  let waited = false;
  for (;;) {
    try {
      fs.mkdirSync(LOCK_DIR);
      fs.writeFileSync(path.join(LOCK_DIR, 'pid'), String(process.pid));
      fs.writeFileSync(path.join(LOCK_DIR, 'label'), label);
      break;
    } catch {
      if (!holderAlive()) { try { fs.rmSync(LOCK_DIR, { recursive: true, force: true }); } catch {} continue; }
      if (!waited) { console.log(`… waiting for another capture run to finish (lock held by ${safeRead('label')} pid ${safeRead('pid')})`); waited = true; }
      await new Promise((r) => setTimeout(r, 3000 + Math.random() * 2000));
    }
  }
  if (waited) console.log(`… lock acquired after ${Math.round((Date.now() - t0) / 1000)}s`);
  const release = () => { try { if (safeRead('pid') === String(process.pid)) fs.rmSync(LOCK_DIR, { recursive: true, force: true }); } catch {} };
  process.on('exit', release);
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { release(); process.exit(1); });
  return release;
}
