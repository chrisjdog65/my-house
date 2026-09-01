/**
 * Persisted user settings (graphics + controls). Stored in localStorage.
 */
export type Quality = 'low' | 'medium' | 'high' | 'ultra';

export interface SettingsData {
  quality: Quality;
  shadows: boolean;
  ao: boolean;
  bloom: boolean;
  antialias: boolean;
  resolutionScale: number; // 0.5..2 multiplier of device pixel ratio
  fov: number;
  sensitivity: number; // 0.2..3
  invertY: boolean;
  timeOfDay: number; // 0..24 hours
  showFps: boolean;
  volume: number; // 0..1
  cameraDistance: number; // preferred third-person distance
  headBob: boolean;
}

const DEFAULTS: SettingsData = {
  quality: 'high',
  shadows: true,
  ao: true,
  bloom: true,
  antialias: true,
  resolutionScale: 1,
  fov: 60,
  sensitivity: 1,
  invertY: false,
  timeOfDay: 15.5,
  showFps: false,
  volume: 0.7,
  cameraDistance: 3.6,
  headBob: true,
};

const KEY = 'myhouse.settings.v1';

type Listener = (s: SettingsData, changedKey: keyof SettingsData | null) => void;

class SettingsStore {
  data: SettingsData;
  private listeners = new Set<Listener>();

  constructor() {
    this.data = { ...DEFAULTS };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        for (const k of Object.keys(DEFAULTS) as (keyof SettingsData)[]) {
          if (parsed[k] !== undefined && typeof parsed[k] === typeof DEFAULTS[k]) {
            (this.data as any)[k] = parsed[k];
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  get<K extends keyof SettingsData>(k: K): SettingsData[K] {
    return this.data[k];
  }

  set<K extends keyof SettingsData>(k: K, v: SettingsData[K]) {
    if (this.data[k] === v) return;
    this.data[k] = v;
    this.save();
    for (const l of this.listeners) l(this.data, k);
  }

  applyQualityPreset(q: Quality) {
    this.data.quality = q;
    switch (q) {
      case 'low':
        Object.assign(this.data, { shadows: false, ao: false, bloom: false, antialias: false, resolutionScale: 0.75 });
        break;
      case 'medium':
        Object.assign(this.data, { shadows: true, ao: false, bloom: true, antialias: true, resolutionScale: 1 });
        break;
      case 'high':
        Object.assign(this.data, { shadows: true, ao: true, bloom: true, antialias: true, resolutionScale: 1 });
        break;
      case 'ultra':
        Object.assign(this.data, { shadows: true, ao: true, bloom: true, antialias: true, resolutionScale: 1.5 });
        break;
    }
    this.save();
    for (const l of this.listeners) l(this.data, null);
  }

  onChange(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  reset() {
    this.data = { ...DEFAULTS };
    this.save();
    for (const l of this.listeners) l(this.data, null);
  }

  private save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* ignore */
    }
  }
}

export const settings = new SettingsStore();
