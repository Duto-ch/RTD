// 저장 한 곳 (2026-11-23 PC 전환 2단계) — 게임의 모든 저장(진행 상황·설정)은 이 모듈만 거친다.
//
// 저장소 두 가지:
//  · web    — 브라우저 localStorage (웹 버전, GitHub Pages)
//  · native — 데스크톱 판(Electron, Steam). preload 가 window.rtdNative.storage 를 열어 준다:
//               readAll(): Promise<{ [key]: string }>   저장 폴더의 파일을 모두 읽음
//               write(key, value): Promise<void>         한 키를 파일로 (임시 파일에 쓰고 이름 바꾸기 — 중간에 꺼져도 안전)
//               remove(key): Promise<void>
//             Steam 클라우드는 이 저장 폴더를 Steamworks Auto-Cloud 로 동기화한다 (코드 필요 없음 — 앱 설정에서 경로 지정)
//  · memory — 둘 다 못 쓰는 환경(사생활 보호 모드·테스트): 이번 실행 동안만 유지
//
// 읽기는 동기(get) — 시작할 때 storage.init() 이 native 저장을 모두 메모리로 읽어 둔다(웹은 localStorage 가 동기).
// 쓰기(set)는 메모리에 바로 반영하고, native 는 키마다 묶어서(WRITE_DELAY) 파일에 쓴다. 창을 닫거나 숨길 때 flush.
// 깨진 저장 대비: setJSON 은 쓰기 전에 이전 값을 `<key>.bak` 에 남기고, getJSON 은 본 값이 깨졌으면 .bak 를 읽는다.

const WRITE_DELAY = 250; // ms — 짧은 사이에 여러 번 저장해도 파일은 한 번
/** 저장하는 키 (웹 → 데스크톱 옮겨 오기·내보내기 대상) */
export const SAVE_KEYS = ['rtd_meta_v3', 'rtd-muted', 'rtd-music-vol', 'rtd-sfx-vol'];

const webStore = () => {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    const probe = '__rtd_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
};

export class Storage {
  constructor() {
    this.mem = new Map(); // native·memory 저장소의 내용 (web 은 localStorage 가 곧 원본)
    this.pending = new Map(); // native: 아직 파일에 안 쓴 키 → 값(null = 지우기)
    this.timer = null;
    this.native = null;
    this.web = webStore();
    this.kind = this.web ? 'web' : 'memory';
    this.ready = !this.native;
  }

  /**
   * 시작할 때 한 번 (main.js). native 가 있으면 파일 저장을 읽어 메모리에 둔다.
   * 데스크톱 판 첫 실행인데 같은 키가 localStorage 에 남아 있으면(예전 판) 한 번 옮겨 온다
   * @param {object} [native] 테스트용 — 없으면 window.rtdNative.storage
   */
  async init(native = globalThis.window?.rtdNative?.storage) {
    if (!native) {
      this.ready = true;
      return this;
    }
    this.native = native;
    this.kind = 'native';
    this.mem.clear();
    let all = {};
    try {
      all = (await native.readAll()) || {};
    } catch (e) {
      console.warn('저장 파일을 읽지 못했습니다 — 이번 실행은 새 저장으로', e);
    }
    for (const [k, v] of Object.entries(all)) if (typeof v === 'string') this.mem.set(k, v);
    // 예전 웹 저장 옮겨 오기 (파일에 없는 키만)
    if (this.web) {
      for (const k of SAVE_KEYS) {
        const v = this.web.getItem(k);
        if (v != null && !this.mem.has(k)) this.set(k, v);
      }
    }
    this.ready = true;
    const flush = () => this.flush();
    globalThis.window?.addEventListener?.('pagehide', flush);
    globalThis.window?.addEventListener?.('beforeunload', flush);
    globalThis.document?.addEventListener?.('visibilitychange', () => document.visibilityState === 'hidden' && flush());
    return this;
  }

  /** @returns {string | null} */
  get(key) {
    if (this.kind === 'web') {
      try {
        return this.web.getItem(key);
      } catch {
        return this.mem.get(key) ?? null;
      }
    }
    return this.mem.get(key) ?? null;
  }

  set(key, value) {
    const v = String(value);
    if (this.kind === 'web') {
      try {
        this.web.setItem(key, v);
        return;
      } catch {
        // 꽉 찼거나 막힘 → 이번 실행 동안만
        this.kind = 'memory';
      }
    }
    this.mem.set(key, v);
    if (this.kind === 'native') this.queue(key, v);
  }

  remove(key) {
    if (this.kind === 'web') {
      try {
        this.web.removeItem(key);
      } catch {
        /* 무시 */
      }
    }
    this.mem.delete(key);
    if (this.kind === 'native') this.queue(key, null);
  }

  /** JSON 읽기 — 본 값이 깨졌으면 백업(.bak)으로 */
  getJSON(key, fallback = null) {
    for (const k of [key, `${key}.bak`]) {
      const raw = this.get(k);
      if (raw == null) continue;
      try {
        return JSON.parse(raw);
      } catch {
        console.warn(`저장이 손상되었습니다: ${k}`);
      }
    }
    return fallback;
  }

  /** JSON 쓰기 — 이전 값을 .bak 에 남긴다 (바뀐 경우만) */
  setJSON(key, obj) {
    const next = JSON.stringify(obj);
    const prev = this.get(key);
    if (prev === next) return;
    if (prev != null) {
      try {
        JSON.parse(prev);
        this.set(`${key}.bak`, prev); // 멀쩡한 이전 값만 백업
      } catch {
        /* 깨진 값은 백업하지 않는다 */
      }
    }
    this.set(key, next);
  }

  queue(key, value) {
    this.pending.set(key, value);
    if (!this.timer) this.timer = setTimeout(() => this.flush(), WRITE_DELAY);
  }

  /** native: 밀린 쓰기를 모두 파일로. 끝나면 resolve */
  async flush() {
    clearTimeout(this.timer);
    this.timer = null;
    if (!this.native || !this.pending.size) return;
    const jobs = [...this.pending];
    this.pending.clear();
    await Promise.all(
      jobs.map(([k, v]) =>
        (v == null ? this.native.remove(k) : this.native.write(k, v)).catch((e) => {
          console.warn(`저장 실패: ${k}`, e);
          if (!this.pending.has(k)) this.pending.set(k, v); // 다음 flush 에 다시
        })
      )
    );
  }

  /** 저장 내보내기 (웹 → 데스크톱으로 옮길 때 등): { key: string } */
  exportAll() {
    const out = {};
    for (const k of SAVE_KEYS) {
      const v = this.get(k);
      if (v != null) out[k] = v;
    }
    return out;
  }

  /** 저장 가져오기 — 아는 키만 */
  importAll(obj) {
    for (const k of SAVE_KEYS) if (typeof obj?.[k] === 'string') this.set(k, obj[k]);
  }
}

export const storage = new Storage();
