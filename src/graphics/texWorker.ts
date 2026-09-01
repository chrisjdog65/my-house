/// <reference lib="webworker" />
import { generateTexture } from './painters';

self.onmessage = (e: MessageEvent<{ id: number; name: string; size: number }>) => {
  const { id, name, size } = e.data;
  try {
    const t = generateTexture(name, size);
    (self as any).postMessage({ id, ok: true, tex: t }, [t.color.buffer, t.normal.buffer, t.orm.buffer]);
  } catch (err: any) {
    (self as any).postMessage({ id, ok: false, error: String(err && err.message ? err.message : err) });
  }
};
