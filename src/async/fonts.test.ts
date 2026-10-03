// SPDX-License-Identifier: EPL-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canvasFont } from '../common/css-font.js';
import { loadFonts, type FontSetLike } from './fonts.js';

const REQ_A = { fontname: 'Helvetica', fontsize: 14 };
const REQ_B = { fontname: 'Courier', fontsize: 12 };
const FACE_A = canvasFont(REQ_A.fontname, REQ_A.fontsize);
const FACE_B = canvasFont(REQ_B.fontname, REQ_B.fontsize);
const TIMEOUT_MS = 5;

function setOf(load: FontSetLike['load']): FontSetLike & { load: ReturnType<typeof vi.fn> } {
  return { load: vi.fn(load) };
}

describe('loadFonts', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    warn.mockRestore();
  });

  it('returns [] without warning when loads resolve', async () => {
    const set = setOf(async () => [{ status: 'loaded' }]);
    await expect(loadFonts(set, [REQ_A, REQ_B], 1000)).resolves.toEqual([]);
    expect(set.load).toHaveBeenCalledTimes(2);
    expect(warn).not.toHaveBeenCalled();
  });

  it('returns [] for a resolved empty face list', async () => {
    const set = setOf(async () => []);
    await expect(loadFonts(set, [REQ_A], 1000)).resolves.toEqual([]);
  });

  it('returns [] for an undefined set without touching timers', async () => {
    const spy = vi.spyOn(globalThis, 'setTimeout');
    await expect(loadFonts(undefined, [REQ_A], 1000)).resolves.toEqual([]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('reports a timeout for a load that never settles', async () => {
    vi.useFakeTimers();
    const set = setOf(() => new Promise(() => undefined));
    const p = loadFonts(set, [REQ_A], TIMEOUT_MS);
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
    await expect(p).resolves.toEqual([{ face: FACE_A, reason: 'timeout' }]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain(FACE_A);
    expect(String(warn.mock.calls[0]?.[0])).toContain('timeout');
  });

  it('reports failed for a rejecting load', async () => {
    const set = setOf(async () => {
      throw new Error('boom');
    });
    await expect(loadFonts(set, [REQ_A], 1000)).resolves.toEqual([
      { face: FACE_A, reason: 'failed' },
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('failed');
  });

  it('reports failed for a synchronously throwing load', async () => {
    const set = setOf(() => {
      throw new Error('sync');
    });
    await expect(loadFonts(set, [REQ_A], 1000)).resolves.toEqual([
      { face: FACE_A, reason: 'failed' },
    ]);
  });

  it('reports failed when any returned face has status error', async () => {
    const set = setOf(async () => [{ status: 'loaded' }, { status: 'error' }]);
    await expect(loadFonts(set, [REQ_A], 1000)).resolves.toEqual([
      { face: FACE_A, reason: 'failed' },
    ]);
  });

  it('calls load once for requests sharing a CSS string', async () => {
    const set = setOf(async () => []);
    await loadFonts(set, [REQ_A, { ...REQ_A }, REQ_B], 1000);
    expect(set.load.mock.calls.map((c) => c[0])).toEqual([FACE_A, FACE_B]);
  });

  it('shares one deadline and clears the timer when settled', async () => {
    vi.useFakeTimers();
    const set = setOf(async (f) =>
      f === FACE_A ? [] : new Promise<readonly { status?: string }[]>(() => undefined),
    );
    const p = loadFonts(set, [REQ_A, REQ_B], TIMEOUT_MS);
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
    await expect(p).resolves.toEqual([{ face: FACE_B, reason: 'timeout' }]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the timer after fast success', async () => {
    vi.useFakeTimers();
    const set = setOf(async () => []);
    await loadFonts(set, [REQ_A], 1000);
    expect(vi.getTimerCount()).toBe(0);
  });
});
