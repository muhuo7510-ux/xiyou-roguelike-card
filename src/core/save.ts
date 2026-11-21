// 存档：抽象 KV 存储，网页用 localStorage，微信小游戏可换成 wx.getStorageSync / setStorageSync
import type { MetaState, RunState } from './state';

export interface KV {
  get(key: string): string | null;
  set(key: string, val: string): void;
  remove(key: string): void;
}

const RUN_KEY = 'xiyou.run.v1';
const META_KEY = 'xiyou.meta.v1';

export function defaultMeta(): MetaState {
  return { seenIntro: false, ch2Unlocked: false, clears: 0, deaths: 0 };
}

export function loadMeta(kv: KV): MetaState {
  try {
    const s = kv.get(META_KEY);
    return s ? { ...defaultMeta(), ...JSON.parse(s) } : defaultMeta();
  } catch {
    return defaultMeta();
  }
}
export function saveMeta(kv: KV, m: MetaState) {
  kv.set(META_KEY, JSON.stringify(m));
}

/** 仅在地图界面（难与难之间、无待选）存档；战斗中途不存 */
export function saveRun(kv: KV, run: RunState) {
  if (run.screen !== 'map' || run.pending.length) return;
  kv.set(RUN_KEY, JSON.stringify(run));
}
export function loadRun(kv: KV): RunState | null {
  try {
    const s = kv.get(RUN_KEY);
    if (!s) return null;
    const r = JSON.parse(s) as RunState;
    return r.version === 1 && r.screen === 'map' ? r : null;
  } catch {
    return null;
  }
}
export function clearRun(kv: KV) {
  kv.remove(RUN_KEY);
}

export function memoryKV(): KV {
  const m = new Map<string, string>();
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v), remove: (k) => void m.delete(k) };
}
