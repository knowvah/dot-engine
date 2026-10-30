// SPDX-License-Identifier: EPL-2.0
// T9 / item 102: safefile + Gvimagepath against the native 102-* fixtures.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderSvg } from '../index.js';
import { setImageSizer } from '../gvc/usershape.js';
import { mkDirlist, safefile, setImagePath } from './safefile.js';
import { resetRenderState } from './render-state.js';

const FIX = new URL('../gvc/__fixtures__/p7/images/', import.meta.url);
const fixture = (name: string): string => readFileSync(new URL(name, FIX), 'utf8');
const lines = (s: string): string[] => s.split('\n').filter(l => l !== '');

const stderrOf = (dot: string): string[] => {
  const msgs: string[] = [];
  const spies = (['warn', 'error'] as const).map(ch =>
    vi.spyOn(console, ch).mockImplementation((m: unknown) => { msgs.push(String(m)); }));
  try { renderSvg(dot, 'dot'); } finally { for (const s of spies) s.mockRestore(); }
  return msgs;
};

afterEach(() => { setImageSizer(null); resetRenderState(); vi.restoreAllMocks(); });

describe('safefile', () => {
  it('returns null for an empty or missing name', () => {
    expect(safefile(undefined)).toBeNull();
    expect(safefile('')).toBeNull();
  });

  it('returns the name when Gvimagepath is unset or empty', () => {
    expect(safefile('r.png')).toBe('r.png');
    setImagePath('');
    expect(safefile('r.png')).toBe('r.png');
  });

  it('returns an absolute name regardless of Gvimagepath', () => {
    setImagePath('d');
    expect(safefile('/nonexistent/r.png')).toBe('/nonexistent/r.png');
  });

  it('a relative name needs the host to supply it', () => {
    setImagePath('d');
    expect(safefile('r.png')).toBeNull();
    setImageSizer(n => (n === 'r.png' ? { w: 1, h: 1 } : null));
    expect(safefile('r.png')).toBe('r.png');
  });

  it('mkDirlist splits on the path separator', () => {
    expect(mkDirlist('d1:d2')).toEqual(['d1', 'd2']);
    expect(mkDirlist('')).toEqual([]);
  });

  it('resetRenderState restores the NULL Gvimagepath', () => {
    setImagePath('d');
    resetRenderState();
    expect(safefile('r.png')).toBe('r.png');
  });
});

describe('102-* stderr matrix', () => {
  const sizerFor = (name: string) => setImageSizer(n => (n === name ? { w: 10, h: 10 } : null));

  it.each(['ip-abs', 'ip-missing', 'ip-shapefile'])('%s matches native', id => {
    expect(stderrOf(fixture(`102-${id}.gv`))).toEqual(lines(fixture(`102-${id}.svg.stderr`)));
  });

  it.each(['ip-found', 'ip-two'])('%s is silent when the host supplies r.png', id => {
    sizerFor('r.png');
    expect(stderrOf(fixture(`102-${id}.gv`))).toEqual(lines(fixture(`102-${id}.svg.stderr`)));
    expect(lines(fixture(`102-${id}.svg.stderr`))).toEqual([]);
  });

  it('graphs-val_val prints the unsafe pair for the absent relative image', () => {
    const native = lines(fixture('graphs-val_val.svg.stderr')).filter(l => !l.includes('metrics'));
    const got = stderrOf(fixture('graphs-val_val.gv')).filter(l => !l.includes('metrics'));
    expect(got).toEqual(native);
    expect(got[0]).toBe('Warning: Filename "imagepath_test/image_dir/image.jpg" is unsafe');
  });

  it('without imagepath a relative image keeps the opening warning', () => {
    expect(stderrOf('digraph{a[image="r.png"]}')).toEqual([
      'Warning: No such file or directory while opening r.png',
      'Warning: No or improper image="r.png" for node "a"',
    ]);
  });

  it('a later layout without imagepath does not see the earlier imagepath', () => {
    expect(stderrOf('digraph{imagepath="e";a[image="r.png"]}')[0])
      .toBe('Warning: Filename "r.png" is unsafe');
    expect(stderrOf('digraph{a[image="r.png"]}')[0])
      .toBe('Warning: No such file or directory while opening r.png');
  });

  it('HTML IMG with imagepath prints the unsafe line before the Error', () => {
    const msgs = stderrOf('digraph{imagepath="e";a[label=<<TABLE><TR><TD><IMG SRC="r.png"/></TD></TR></TABLE>>]}');
    expect(msgs.slice(0, 2)).toEqual([
      'Warning: Filename "r.png" is unsafe',
      'Error: No or improper image file="r.png"',
    ]);
  });
});
