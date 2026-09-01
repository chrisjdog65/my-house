/**
 * "Nature channel" for the living-room TV: an animated CanvasTexture redrawn every ~0.5 s.
 * Three looping scenes (highlands / desert sunset / ocean at night) with a channel bug and
 * a lower-third title card.
 */
import * as THREE from 'three';

const TITLES = [
  ['Highlands at Dawn', 'NATURE · LIVE'],
  ['Desert Sunset', 'NATURE · DOCUMENTARY'],
  ['Ocean by Moonlight', 'NATURE · AMBIENT'],
];

export class TvChannel {
  readonly texture: THREE.CanvasTexture;
  private g: CanvasRenderingContext2D;
  private W = 512;
  private H = 288;
  private last = -10;
  private stars: [number, number, number][] = [];

  constructor() {
    const c = document.createElement('canvas');
    c.width = this.W; c.height = this.H;
    this.g = c.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(c);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.generateMipmaps = true;
    let s = 12345;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < 48; i++) this.stars.push([rnd() * this.W, rnd() * this.H * 0.5, 0.6 + rnd() * 1.4]);
    this.draw(0, true);
  }

  /** Redraw at most every 0.5 s. `t` is scene time in seconds. */
  draw(t: number, force = false) {
    if (!force && t - this.last < 0.5) return;
    this.last = t;
    const { g, W, H } = this;
    const scene = Math.floor(t / 10) % 3;
    const u = (t % 10) / 10;
    if (scene === 0) this.highlands(t, u);
    else if (scene === 1) this.desert(t, u);
    else this.ocean(t);
    // channel bug
    g.fillStyle = 'rgba(0,0,0,0.45)';
    this.rrect(W - 100, 12, 88, 26, 6); g.fill();
    g.fillStyle = '#6fcf6a'; g.beginPath(); g.ellipse(W - 86, 25, 6, 9, -0.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('NATURE', W - 74, 25);
    g.font = 'bold 9px sans-serif'; g.fillStyle = '#ffd36b'; g.fillText('HD', W - 26, 25);
    // lower third at the start of each scene
    if (u < 0.42) {
      const a = Math.min(1, (0.42 - u) * 12, u * 20);
      g.globalAlpha = a;
      g.fillStyle = 'rgba(250,248,240,0.9)';
      this.rrect(24, H - 72, 260, 44, 4); g.fill();
      g.fillStyle = '#2d8a4e'; g.fillRect(24, H - 72, 6, 44);
      g.fillStyle = '#1b1b1b'; g.font = 'bold 18px Georgia, serif'; g.textBaseline = 'alphabetic';
      g.fillText(TITLES[scene][0], 40, H - 48);
      g.font = '10px sans-serif'; g.fillStyle = '#555';
      g.fillText(TITLES[scene][1], 40, H - 34);
      g.globalAlpha = 1;
    }
    // subtle vignette
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    this.texture.needsUpdate = true;
  }

  private rrect(x: number, y: number, w: number, h: number, r: number) {
    const g = this.g;
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }

  private hills(layers: string[], base: number, step: number, t: number, amp = 18) {
    const { g, W, H } = this;
    layers.forEach((col, k) => {
      g.fillStyle = col;
      g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) {
        const y = H * (base + k * step) + Math.sin(x * 0.012 + t * (0.15 + 0.08 * k) + k * 2) * amp + Math.sin(x * 0.031 + k * 1.3) * amp * 0.35;
        g.lineTo(x, y);
      }
      g.lineTo(W, H); g.closePath(); g.fill();
    });
  }

  private sun(x: number, y: number, r: number, core: string, glow: string) {
    const g = this.g;
    const rg = g.createRadialGradient(x, y, r * 0.6, x, y, r * 3.2);
    rg.addColorStop(0, glow); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
    g.fillStyle = core; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }

  private highlands(t: number, u: number) {
    const { g, W, H } = this;
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#2f5f9e'); sky.addColorStop(0.55, '#8fc0ea'); sky.addColorStop(1, '#f6dcae');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    this.sun(W * (0.2 + 0.6 * u), H * (0.5 - 0.22 * Math.sin(u * Math.PI)), 20, '#fff4c0', 'rgba(255,230,160,0.55)');
    // clouds
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 4; i++) {
      const cx = ((t * 9 * (1 + i * 0.2) + i * 140) % (W + 160)) - 80, cy = H * (0.14 + i * 0.07);
      g.beginPath(); g.ellipse(cx, cy, 46 + i * 8, 11 + i * 2, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(cx + 20, cy - 6, 26, 12, 0, 0, Math.PI * 2); g.fill();
    }
    this.hills(['#5b8f5a', '#3f7a4a', '#2f5f3a', '#1f4429'], 0.5, 0.11, t);
    // lake
    const lake = g.createLinearGradient(0, H * 0.86, 0, H);
    lake.addColorStop(0, '#6fa4d8'); lake.addColorStop(1, '#2c5c8f');
    g.fillStyle = lake; g.fillRect(0, H * 0.86, W, H * 0.14);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 6; i++) { const y = H * (0.88 + i * 0.02); g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= W; x += 10) g.lineTo(x, y + Math.sin(x * 0.05 + t * 2 + i) * 1.5); g.stroke(); }
    // birds
    g.strokeStyle = '#1b2430'; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const bx = ((t * 38 * (1 + i * 0.12) + i * 95) % (W + 60)) - 30, by = H * (0.22 + 0.1 * Math.sin(t * 0.7 + i * 1.7));
      const flap = Math.sin(t * 9 + i) * 4;
      g.beginPath(); g.moveTo(bx - 7, by + flap); g.lineTo(bx, by - 2); g.lineTo(bx + 7, by + flap); g.stroke();
    }
  }

  private desert(t: number, u: number) {
    const { g, W, H } = this;
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#3b1f4f'); sky.addColorStop(0.5, '#ff7b3a'); sky.addColorStop(1, '#ffd58a');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    this.sun(W * 0.55, H * (0.52 + u * 0.1), 40, '#ffe9a8', 'rgba(255,160,80,0.6)');
    g.fillStyle = 'rgba(120,40,90,0.35)';
    for (let i = 0; i < 3; i++) { const cx = ((t * 6 + i * 200) % (W + 240)) - 120; g.beginPath(); g.ellipse(cx, H * (0.2 + i * 0.1), 90, 8, 0, 0, Math.PI * 2); g.fill(); }
    this.hills(['#c98a4b', '#b0703a', '#8f552c', '#6b3d1f'], 0.58, 0.1, t * 0.4, 12);
    // cactus silhouette drifting with a slow pan
    const cx = W * 0.78 - u * 60, cy = H * 0.72;
    g.fillStyle = '#2a1a12';
    g.fillRect(cx - 7, cy - 70, 14, 70);
    g.fillRect(cx - 26, cy - 45, 10, 26); g.fillRect(cx - 26, cy - 45, 22, 9);
    g.fillRect(cx + 16, cy - 58, 10, 32); g.fillRect(cx + 4, cy - 34, 22, 9);
  }

  private ocean(t: number) {
    const { g, W, H } = this;
    const sky = g.createLinearGradient(0, 0, 0, H * 0.55);
    sky.addColorStop(0, '#050a1c'); sky.addColorStop(1, '#0b2140');
    g.fillStyle = sky; g.fillRect(0, 0, W, H * 0.55);
    for (let i = 0; i < this.stars.length; i++) {
      const [sx, sy, sr] = this.stars[i];
      g.fillStyle = `rgba(255,255,255,${(0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i))).toFixed(2)})`;
      g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();
    }
    this.sun(W * 0.74, H * 0.22, 22, '#f3f1dc', 'rgba(200,210,255,0.35)');
    const sea = g.createLinearGradient(0, H * 0.55, 0, H);
    sea.addColorStop(0, '#12385f'); sea.addColorStop(1, '#061a30');
    g.fillStyle = sea; g.fillRect(0, H * 0.55, W, H * 0.45);
    g.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) {
      const y = H * (0.58 + i * 0.045);
      g.strokeStyle = `rgba(180,210,255,${(0.12 + i * 0.03).toFixed(2)})`;
      g.beginPath();
      for (let x = 0; x <= W; x += 6) g.lineTo(x, y + Math.sin(x * (0.03 + i * 0.004) + t * (1.2 + i * 0.15)) * (2 + i * 0.6));
      g.stroke();
    }
    // moon glitter path
    g.fillStyle = 'rgba(240,240,220,0.7)';
    for (let i = 0; i < 22; i++) {
      const y = H * (0.57 + i * 0.019), w = 6 + i * 2.2;
      const x = W * 0.74 + Math.sin(t * 2.3 + i * 1.9) * (4 + i * 1.5);
      g.fillRect(x - w / 2, y, w, 1.5);
    }
  }
}
