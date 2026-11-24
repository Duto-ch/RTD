import { describe, it, expect, vi } from 'vitest';
import { Storage, storage, SAVE_KEYS } from '../../src/systems/storage.js';
import { meta } from '../../src/systems/meta.js';

// 저장 한 곳 (2026-11-23 PC 전환 2단계): 웹 localStorage / 데스크톱 파일(native) / 메모리
const fakeNative = (files = {}) => ({
  files,
  readAll: vi.fn(async () => ({ ...files })),
  write: vi.fn(async (k, v) => { files[k] = v; }),
  remove: vi.fn(async (k) => { delete files[k]; })
});
const fakeLocal = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
};

describe('저장 (storage.js)', () => {
  it('localStorage 가 없으면 메모리에 — 이번 실행 동안은 읽고 쓸 수 있다', () => {
    const s = new Storage();
    expect(s.kind).toBe('memory');
    s.set('a', 1);
    expect(s.get('a')).toBe('1');
    s.remove('a');
    expect(s.get('a')).toBe(null);
  });

  it('웹: localStorage 에 바로 쓰고 읽는다', () => {
    const ls = fakeLocal();
    vi.stubGlobal('localStorage', ls);
    const s = new Storage();
    expect(s.kind).toBe('web');
    s.set('rtd-muted', '1');
    expect(ls.getItem('rtd-muted')).toBe('1');
    expect(s.get('rtd-muted')).toBe('1');
    vi.unstubAllGlobals();
  });

  it('데스크톱(native): 시작할 때 파일을 모두 읽고, 쓰기는 묶어서 파일로 · flush 로 바로', async () => {
    const nat = fakeNative({ 'rtd-music-vol': '0.3' });
    const s = await new Storage().init(nat);
    expect(s.kind).toBe('native');
    expect(s.get('rtd-music-vol')).toBe('0.3');
    s.set('rtd-music-vol', '0.4');
    s.set('rtd-music-vol', '0.5'); // 짧은 사이 두 번 → 파일은 한 번
    expect(s.get('rtd-music-vol')).toBe('0.5'); // 읽기는 바로
    expect(nat.write).not.toHaveBeenCalled();
    await s.flush();
    expect(nat.write).toHaveBeenCalledTimes(1);
    expect(nat.files['rtd-music-vol']).toBe('0.5');
    s.remove('rtd-music-vol');
    await s.flush();
    expect(nat.files['rtd-music-vol']).toBeUndefined();
  });

  it('데스크톱 첫 실행: 예전 웹 저장(localStorage)을 파일로 옮겨 온다 — 파일에 이미 있으면 그대로', async () => {
    vi.stubGlobal('localStorage', fakeLocal({ rtd_meta_v3: '{"fame":7}', 'rtd-muted': '1' }));
    const nat = fakeNative({ 'rtd-muted': '0' });
    const s = await new Storage().init(nat);
    await s.flush();
    expect(nat.files.rtd_meta_v3).toBe('{"fame":7}');
    expect(nat.files['rtd-muted']).toBe('0');
    vi.unstubAllGlobals();
  });

  it('파일 쓰기가 실패하면 다음 flush 에 다시 쓴다', async () => {
    const nat = fakeNative();
    nat.write.mockRejectedValueOnce(new Error('disk'));
    const s = await new Storage().init(nat);
    s.set('k', 'v');
    await s.flush();
    expect(nat.files.k).toBeUndefined();
    await s.flush();
    expect(nat.files.k).toBe('v');
  });

  it('JSON: 쓸 때 이전 값을 .bak 에 남기고, 본 값이 깨졌으면 .bak 로 읽는다', () => {
    const s = new Storage();
    s.setJSON('save', { n: 1 });
    s.setJSON('save', { n: 2 });
    expect(JSON.parse(s.get('save.bak'))).toEqual({ n: 1 });
    s.set('save', '{깨짐');
    expect(s.getJSON('save')).toEqual({ n: 1 });
  });

  it('내보내기·가져오기는 저장 키만', () => {
    const s = new Storage();
    s.set('rtd_meta_v3', '{"fame":3}');
    s.set('other', 'x');
    const out = s.exportAll();
    expect(Object.keys(out)).toEqual(['rtd_meta_v3']);
    const t = new Storage();
    t.importAll({ ...out, other: 'y' });
    expect(t.get('rtd_meta_v3')).toBe('{"fame":3}');
    expect(t.get('other')).toBe(null);
    expect(SAVE_KEYS).toContain('rtd-sfx-vol');
  });

  it('진행 상황(meta)이 깨지면 직전 저장으로 되살린다', () => {
    meta.reset();
    meta.data.fame = 5;
    meta.save();
    meta.data.fame = 9;
    meta.save(); // .bak = fame 5
    storage.set('rtd_meta_v3', '{"fame": 9, 깨짐');
    meta.load();
    expect(meta.data.fame).toBe(5);
    meta.reset();
  });
});
