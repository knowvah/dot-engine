// SPDX-License-Identifier: EPL-2.0
// AD-11: a missing image prints native's gvusershape_open / poly_init lines.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderSvg, parse, renderWithContext } from '../index.js';
import type { EngineName, GvcContext } from '../index.js';
import type { Graph } from '../model/graph.js';
import { createDefaultContext } from './default-context.js';
import { setImageSizer } from './usershape.js';
import { setImageResolver } from './image-resolver.js';

const OPEN = 'Warning: No such file or directory while opening x.png';
const NODE = (n: string): string => `Warning: No or improper image="x.png" for node "${n}"`;
const IMG_ERR = 'Error: No or improper image file="x.png"';

const stderrOf = (dot: string): string[] => {
  const msgs: string[] = [];
  const spies = (['warn', 'error'] as const).map(ch =>
    vi.spyOn(console, ch).mockImplementation((m: unknown) => { msgs.push(String(m)); }));
  try { renderSvg(dot, 'dot'); } finally { for (const s of spies) s.mockRestore(); }
  return msgs;
};

afterEach(() => { setImageSizer(null); setImageResolver(null); vi.restoreAllMocks(); });

describe('missing image messages', () => {
  it('node image= prints both native warnings', () => {
    expect(stderrOf('digraph{a[image="x.png"]}')).toEqual([OPEN, NODE('a')]);
  });

  it('repeats per node, as C does not cache a failed open', () => {
    expect(stderrOf('digraph{a[image="x.png"];b[image="x.png"]}'))
      .toEqual([OPEN, NODE('a'), OPEN, NODE('b')]);
  });

  it('a record node never reaches the image branch', () => {
    expect(stderrOf('digraph{a[shape=record,label="a|b",image="x.png"]}')).toEqual([]);
  });

  it('HTML IMG prints the open warning before the Error', () => {
    const msgs = stderrOf('digraph{a[label=<<TABLE><TR><TD><IMG SRC="x.png"/></TD></TR></TABLE>>]}');
    expect(msgs.slice(0, 2)).toEqual([OPEN, IMG_ERR]);
  });

  it('a supplied sizer or resolver silences the node messages', () => {
    setImageSizer(() => ({ w: 10, h: 10 }));
    expect(stderrOf('digraph{a[image="x.png"]}')).toEqual([]);
    setImageSizer(null);
    setImageResolver(() => new Uint8Array([1]));
    expect(stderrOf('digraph{a[image="x.png"]}')).toEqual([]);
  });

  it('a supplied sizer silences the HTML messages', () => {
    setImageSizer(() => ({ w: 10, h: 10 }));
    expect(stderrOf('digraph{a[label=<<TABLE><TR><TD><IMG SRC="x.png"/></TD></TR></TABLE>>]}')).toEqual([]);
  });
});

// T1 (item 90): the pair prints once per layout, never at render time.
describe('missing image/shapefile warnings once per layout', () => {
  const capture = (fn: () => void): string[] => {
    const msgs: string[] = [];
    const spies = (['warn', 'error'] as const).map(ch =>
      vi.spyOn(console, ch).mockImplementation((m: unknown) => { msgs.push(String(m)); }));
    try { fn(); } finally { for (const s of spies) s.mockRestore(); }
    return msgs;
  };
  const laidOut = (dot: string, engine: EngineName): { ctx: GvcContext; g: Graph } => {
    const ctx = createDefaultContext();
    const g = parse(dot);
    ctx.layout(g, engine);
    return { ctx, g };
  };

  it.each(['dot', 'neato', 'osage'] as const)('-Tjson prints the pair once (%s)', engine => {
    const msgs = capture(() => {
      const { ctx, g } = laidOut('digraph{a[image="x.png"]}', engine);
      renderWithContext(ctx, g, 'json');
    });
    expect(msgs).toEqual([OPEN, NODE('a')]);
  });

  it('two renders of one laid-out graph print the pair once', () => {
    const msgs = capture(() => {
      const { ctx, g } = laidOut('digraph{a[image="x.png"]}', 'dot');
      renderWithContext(ctx, g, 'svg');
      renderWithContext(ctx, g, 'svg');
    });
    expect(msgs).toEqual([OPEN, NODE('a')]);
  });

  it('shapefile prints native two lines once under -Tjson', () => {
    const msgs = capture(() => {
      const { ctx, g } = laidOut('digraph{a[shape=custom shapefile="nope.ps"]}', 'dot');
      renderWithContext(ctx, g, 'json');
    });
    expect(msgs).toEqual([
      'Warning: No such file or directory while opening nope.ps',
      'Warning: No or improper shapefile="nope.ps" for node "a"',
    ]);
  });

  it('label warnings precede the image pair', () => {
    const msgs = capture(() => {
      laidOut('digraph{a[image="x.png",fontname="Nope Font Xyz",label=<<B>hi</B>>]}', 'dot');
    });
    expect(msgs.slice(-2)).toEqual([OPEN, NODE('a')]);
  });
});
