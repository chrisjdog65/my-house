/**
 * Keyboard / mouse / gamepad input with edge detection.
 * Mouse look uses pointer lock when available; otherwise drag-to-look.
 */
export interface Axes {
  moveX: number; // -1..1 (A/D)
  moveY: number; // -1..1 (W/S) forward positive
  lookX: number; // accumulated mouse delta this frame (pixels)
  lookY: number;
  zoom: number; // wheel delta this frame
}

const KEYMAP: Record<string, string> = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  Space: 'jump',
  KeyE: 'interact',
  KeyF: 'flashlight',
  KeyC: 'crouch', ControlLeft: 'crouch',
  KeyV: 'toggleView',
  Escape: 'pause',
  Tab: 'map',
  KeyQ: 'drop',
  KeyR: 'reset',
  KeyG: 'throw',
  KeyH: 'help',
  F3: 'debug',
};

export class Input {
  readonly down = new Set<string>();
  private pressed = new Set<string>();
  private released = new Set<string>();
  readonly axes: Axes = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, zoom: 0 };
  private lookAccX = 0;
  private lookAccY = 0;
  private zoomAcc = 0;
  private mouseButtons = new Set<number>();
  private mousePressed = new Set<number>();
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  pointerLocked = false;
  enabled = true; // set to false when a menu is open
  private el: HTMLElement;
  gamepadIndex: number | null = null;
  private touchLook: { id: number; x: number; y: number } | null = null;

  constructor(el: HTMLElement) {
    this.el = el;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const a = KEYMAP[e.code];
      if (a) {
        this.down.add(a);
        this.pressed.add(a);
        if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F3'].includes(e.code)) e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (a) {
        this.down.delete(a);
        this.released.add(a);
      }
    });
    window.addEventListener('blur', () => {
      this.down.clear();
      this.mouseButtons.clear();
    });

    el.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      this.mouseButtons.add(e.button);
      this.mousePressed.add(e.button);
      if (!this.pointerLocked) {
        this.dragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    });
    window.addEventListener('mouseup', (e) => {
      this.mouseButtons.delete(e.button);
      this.dragging = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.pointerLocked) {
        this.lookAccX += e.movementX;
        this.lookAccY += e.movementY;
      } else if (this.dragging) {
        this.lookAccX += e.clientX - this.lastX;
        this.lookAccY += e.clientY - this.lastY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    });
    el.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      this.zoomAcc += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === el;
    });

    // touch: a finger dragged on the right half of the screen = look (the joystick lives on the left)
    el.addEventListener('touchstart', (e) => {
      if (!this.enabled) return;
      const t = e.changedTouches[0];
      if (t.clientX < window.innerWidth * 0.4) return;
      if (!this.touchLook) this.touchLook = { id: t.identifier, x: t.clientX, y: t.clientY };
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (!this.touchLook) return;
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.touchLook.id) {
          this.lookAccX += (t.clientX - this.touchLook.x) * 1.5;
          this.lookAccY += (t.clientY - this.touchLook.y) * 1.5;
          this.touchLook.x = t.clientX;
          this.touchLook.y = t.clientY;
        }
      }
    }, { passive: true });
    el.addEventListener('touchend', (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (this.touchLook && t.identifier === this.touchLook.id) this.touchLook = null;
      }
    });

    window.addEventListener('gamepadconnected', (e) => { this.gamepadIndex = e.gamepad.index; });
    window.addEventListener('gamepaddisconnected', () => { this.gamepadIndex = null; });

    this.setupTouchControls();
  }

  /** virtual joystick vector (-1..1) */
  private joy = { x: 0, y: 0, active: false };
  readonly isTouchDevice = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0);

  private setupTouchControls() {
    const root = document.getElementById('touch');
    const stick = document.getElementById('joystick');
    const knob = document.getElementById('joystick-knob');
    if (!root || !stick || !knob) return;
    if (!this.isTouchDevice) return;
    root.classList.remove('hidden');
    let id: number | null = null;
    const R = 50;
    const move = (t: Touch) => {
      const r = stick.getBoundingClientRect();
      let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > R) { dx *= R / len; dy *= R / len; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.joy.x = dx / R; this.joy.y = -dy / R; this.joy.active = true;
    };
    stick.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; id = t.identifier; move(t); e.preventDefault(); }, { passive: false });
    stick.addEventListener('touchmove', (e) => { for (const t of Array.from(e.changedTouches)) if (t.identifier === id) move(t); e.preventDefault(); }, { passive: false });
    const end = (e: TouchEvent) => { for (const t of Array.from(e.changedTouches)) if (t.identifier === id) { id = null; this.joy.x = 0; this.joy.y = 0; this.joy.active = false; knob.style.transform = 'translate(-50%, -50%)'; } };
    stick.addEventListener('touchend', end);
    stick.addEventListener('touchcancel', end);
    // the look-drag must ignore touches that start on the joystick / buttons
    const bind = (elId: string, action: string, hold = false) => {
      const el = document.getElementById(elId);
      if (!el) return;
      el.addEventListener('touchstart', (e) => { this.down.add(action); this.pressed.add(action); e.preventDefault(); e.stopPropagation(); }, { passive: false });
      const up = (e: Event) => { this.down.delete(action); this.released.add(action); e.preventDefault(); void hold; };
      el.addEventListener('touchend', up);
      el.addEventListener('touchcancel', up);
    };
    bind('tb-jump', 'jump');
    bind('tb-interact', 'interact');
    bind('tb-sprint', 'sprint', true);
    bind('tb-pause', 'pause');
  }

  requestPointerLock() {
    try {
      const p: any = this.el.requestPointerLock({ unadjustedMovement: true } as any);
      if (p && p.catch) p.catch(() => { try { this.el.requestPointerLock(); } catch { /* ignore */ } });
    } catch {
      try { this.el.requestPointerLock(); } catch { /* unsupported */ }
    }
  }

  exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /** true only on the frame the action was pressed */
  justPressed(action: string): boolean {
    return this.pressed.has(action);
  }
  justReleased(action: string): boolean {
    return this.released.has(action);
  }
  isDown(action: string): boolean {
    return this.enabled && this.down.has(action);
  }
  mouseDown(button = 0): boolean {
    return this.enabled && this.mouseButtons.has(button);
  }
  mouseJustPressed(button = 0): boolean {
    return this.enabled && this.mousePressed.has(button);
  }

  /** Call once per frame BEFORE game logic. */
  poll() {
    let mx = 0, my = 0;
    if (this.enabled) {
      if (this.down.has('right')) mx += 1;
      if (this.down.has('left')) mx -= 1;
      if (this.down.has('forward')) my += 1;
      if (this.down.has('back')) my -= 1;
    }
    if (this.joy.active && this.enabled) { mx += this.joy.x; my += this.joy.y; }
    let gpLookX = 0, gpLookY = 0;
    if (this.gamepadIndex !== null && this.enabled) {
      const gp = navigator.getGamepads()[this.gamepadIndex];
      if (gp) {
        const dz = (v: number) => (Math.abs(v) < 0.15 ? 0 : v);
        mx += dz(gp.axes[0] ?? 0);
        my -= dz(gp.axes[1] ?? 0);
        gpLookX = dz(gp.axes[2] ?? 0) * 18;
        gpLookY = dz(gp.axes[3] ?? 0) * 18;
        const btn = (i: number) => !!gp.buttons[i]?.pressed;
        const map: [number, string][] = [[0, 'jump'], [2, 'interact'], [1, 'crouch'], [10, 'sprint'], [9, 'pause'], [3, 'toggleView'], [5, 'throw'], [4, 'drop']];
        for (const [i, a] of map) {
          const isDown = btn(i);
          const was = this.down.has('gp:' + a);
          if (isDown && !was) { this.down.add('gp:' + a); this.down.add(a); this.pressed.add(a); }
          if (!isDown && was) { this.down.delete('gp:' + a); this.down.delete(a); this.released.add(a); }
        }
      }
    }
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    this.axes.moveX = mx;
    this.axes.moveY = my;
    this.axes.lookX = this.lookAccX + gpLookX;
    this.axes.lookY = this.lookAccY + gpLookY;
    this.axes.zoom = this.zoomAcc;
    this.lookAccX = 0;
    this.lookAccY = 0;
    this.zoomAcc = 0;
  }

  /** Call once per frame AFTER game logic. */
  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.mousePressed.clear();
  }
}
