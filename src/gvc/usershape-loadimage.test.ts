// SPDX-License-Identifier: EPL-2.0
// Item 101 / AD-5: resolver bytes are sniffed; gvloadimage warns per target.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse, renderWithContext } from '../index.js';
import { createDefaultContext } from './default-context.js';
import { setImageSizer, usershapeSizePts, imageOpenFailure } from './usershape.js';
import { setImageResolver } from './image-resolver.js';
import { gvrenderUsershape } from './render-usershape.js';
import type { RenderJob } from './job.js';

const FIX = new URL('./__fixtures__/p7/images/', import.meta.url);
const text = (n: string): string => readFileSync(new URL(n, FIX), 'utf8');
const bytes = (n: string): Uint8Array => new Uint8Array(readFileSync(new URL(n, FIX)));
const FORMATS = ['svg', 'xdot', 'json', 'dot', 'plain', 'cmapx'] as const;
const SIZE = { w: 16, h: 16 };

const CASES = [
  { id: 'png', file: 'r.png' },
  { id: 'gif', file: 'g.gif' },
  { id: 'jpg', file: 'j.jpg' },
  { id: 'svg', file: 's.svg' },
] as const;

/** Native stderr of `fixture`, one entry per line. */
const nativeLines = (fixture: string): string[] =>
  text(fixture).split('\n').filter(l => l !== '');

function stderrOf(file: string, dot: string, fmt: string, withSize = true): string[] {
  const msgs: string[] = [];
  const spies = (['warn', 'error'] as const).map(ch =>
    vi.spyOn(console, ch).mockImplementation((m: unknown) => { msgs.push(String(m).replace(/\n$/, '')); }));
  try {
    const ctx = createDefaultContext();
    ctx.imageResolver = () => bytes(file);
    if (withSize) ctx.imageSizer = () => SIZE;
    const g = parse(dot);
    ctx.layout(g, 'dot');
    renderWithContext(ctx, g, fmt);
  } finally { for (const s of spies) s.mockRestore(); }
  return msgs;
}

afterEach(() => { setImageSizer(null); setImageResolver(null); vi.restoreAllMocks(); });

describe('gvloadimage warning matches native per format', () => {
  for (const c of CASES) {
    const dot = text(`101-${c.id}.gv`);
    it.each(FORMATS)(`${c.id} -T%s`, fmt => {
      expect(stderrOf(c.file, dot, fmt)).toEqual(nativeLines(`101-${c.id}.${fmt}.stderr`));
    });
  }

  it('-Tjson warns exactly once per image op, naming the json target', () => {
    expect(stderrOf('r.png', text('101-png.gv'), 'json'))
      .toEqual(['Warning: No loadimage plugin for "png:json"']);
  });

  it('a sizer-only image (no bytes) has no type and no warning', () => {
    const msgs: string[] = [];
    const spy = vi.spyOn(console, 'warn').mockImplementation((m: unknown) => { msgs.push(String(m)); });
    const ctx = createDefaultContext();
    ctx.imageSizer = () => SIZE;
    const g = parse(text('101-png.gv'));
    ctx.layout(g, 'dot');
    renderWithContext(ctx, g, 'json');
    spy.mockRestore();
    expect(msgs).toEqual([]);
  });
});

describe('FT_NULL: resolver bytes of unknown magic', () => {
  const NAME = 'bad.png';
  const NOT_FOUND = `"${NAME}" was not found as a file or as a shape library member`;
  const hello = (): Uint8Array => bytes('bad.png');

  it('imageOpenFailure names the shape-library message', () => {
    expect(imageOpenFailure(NAME, () => SIZE, hello)).toBe(NOT_FOUND);
  });

  it('imageOpenFailure is null for recognized bytes', () => {
    expect(imageOpenFailure('r.png', () => SIZE, () => bytes('r.png'))).toBeNull();
  });

  it('imageOpenFailure keeps the open failure when nothing is supplied', () => {
    expect(imageOpenFailure(NAME, () => null, () => null))
      .toBe('No such file or directory while opening bad.png');
  });

  it('gives no size even when a sizer reports one', () => {
    expect(usershapeSizePts(NAME, 96, () => SIZE, hello)).toBeNull();
    expect(usershapeSizePts('r.png', 96, () => SIZE, () => bytes('r.png'))).toEqual({ x: 12, y: 12 });
  });

  it('draws nothing and prints nothing at render time', () => {
    const calls: string[] = [];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const job = {
      imageSizer: () => SIZE, imageResolver: hello, dpi: { x: 96, y: 96 }, format: 'svg',
      renderer: { type: 'svg', usershape: (n: string) => { calls.push(n); } },
    } as unknown as RenderJob;
    const sq = [{ x: 0, y: 0 }, { x: 0, y: 40 }, { x: 40, y: 40 }, { x: 40, y: 0 }];
    gvrenderUsershape(job, NAME, sq, false, 'false', 'mc');
    expect(calls).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('gvloadimage engine selection', () => {
  const sq = [{ x: 0, y: 0 }, { x: 0, y: 40 }, { x: 40, y: 40 }, { x: 40, y: 0 }];
  const pad = (head: number[]): Uint8Array => new Uint8Array([...head, ...new Array<number>(20).fill(0)]);
  const BMP = pad([0x42, 0x4d]);

  function jobFor(type: string, files: Record<string, Uint8Array>, calls: string[]): RenderJob {
    return {
      imageSizer: () => SIZE, imageResolver: (s: string) => files[s] ?? null,
      dpi: { x: 96, y: 96 }, format: type,
      renderer: { type, usershape: (n: string) => { calls.push(n); } },
    } as unknown as RenderJob;
  }

  it('warns for bmp:svg and, with no engine selected yet, does not draw', () => {
    const calls: string[] = [];
    const msgs: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((m: unknown) => { msgs.push(String(m).trim()); });
    const job = jobFor('svg', { 'a.bmp': BMP }, calls);
    gvrenderUsershape(job, 'a.bmp', sq, false, 'false', 'mc');
    expect(msgs).toEqual(['Warning: No loadimage plugin for "bmp:svg"']);
    expect(calls).toEqual([]);
  });

  it('keeps drawing through the engine a previous select left set', () => {
    const calls: string[] = [];
    const msgs: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((m: unknown) => { msgs.push(String(m).trim()); });
    const png = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const job = jobFor('svg', { 'a.png': png, 'a.bmp': BMP }, calls);
    gvrenderUsershape(job, 'a.png', sq, false, 'false', 'mc');
    gvrenderUsershape(job, 'a.bmp', sq, false, 'false', 'mc');
    expect(msgs).toEqual(['Warning: No loadimage plugin for "bmp:svg"']);
    expect(calls).toEqual(['a.png', 'a.bmp']);
  });

  it.each(['plain', 'cmapx-np', 'xdot'] as const)(
    '%s device resolves to a served loadimage entry (no warning)', (device) => {
      const msgs: string[] = [];
      vi.spyOn(console, 'warn').mockImplementation((m: unknown) => { msgs.push(String(m)); });
      const png = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      gvrenderUsershape(jobFor(device, { 'a.png': png }, []), 'a.png', sq, false, 'false', 'mc');
      expect(msgs).toEqual([]);
    });
});
