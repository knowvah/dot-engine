// SPDX-License-Identifier: EPL-2.0
//
// Echoed attribute values are canonicalized as agwrite does (issue #134). A value the layout did
// not recompute (cluster lp/lwidth/lheight, node rects/xlp, edge pos and label positions) is the
// input's own, and write.c prints it through agstrcanon like every other value: wrapped at
// Max_outputline, quoted only when needed. The refs under plans/issue-134-echo-attr-canon/harness
// are native 16.1.0's (regen.sh). labels/labels-ll pin the long graph and cluster labels, which
// never went through the echo helpers. odd.gv echoes values that are html, keywords, numerals,
// escapes and non-ascii, on subgraph bb, cluster lp/lwidth/lheight, node rects/xlp and edge keys.
// @see lib/cgraph/write.c:_write_canonstr
// @see lib/cgraph/write.c:write_nondefault_attrs
// @see lib/cgraph/write.c:write_dict
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../parser/index.js';
import { createDefaultContext } from '../../gvc/default-context.js';
import { render as deviceRender } from '../../gvc/device.js';
import { Graph } from '../../model/graph.js';
import { HTML_STRING_MARK } from '../../common/html-string.js';
import { echoAttr, echoGraphAttr } from './attrs.js';

const HARNESS_134 = new URL('../../../plans/issue-134-echo-attr-canon/harness/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS_134), 'latin1');
const CONTINUATION = '\\\n';
const FORMATS = ['dot', 'xdot'] as const;
type Fmt = (typeof FORMATS)[number];
type Engine = 'dot' | 'patchwork';

const ref = (name: string, engine: Engine, fmt: Fmt): string => read(`out/${name}.${engine}.${fmt}`);

/** Lay out the harness source `name` with `engine` and render it in `fmt` on a fresh context. */
const renderRef = (name: string, engine: Engine, fmt: Fmt): string => {
  const ctx = createDefaultContext();
  const g = parse(read(`${name}.gv`));
  ctx.layout(g, engine);
  return deviceRender(ctx, g, fmt);
};

const wraps = (s: string): number => s.split(CONTINUATION).length - 1;

describe('long graph and cluster labels wrap as native does', () => {
  it.each(FORMATS)('default linelength, %s', (fmt) => {
    expect(renderRef('labels', 'dot', fmt)).toBe(ref('labels', 'dot', fmt));
  });

  it.each(FORMATS)('linelength=70, %s', (fmt) => {
    expect(renderRef('labels-ll', 'dot', fmt)).toBe(ref('labels-ll', 'dot', fmt));
  });
});

describe('echoed values equal native', () => {
  it.each(FORMATS)('dot layout, default linelength, %s', (fmt) => {
    expect(renderRef('echo', 'dot', fmt)).toBe(ref('echo', 'dot', fmt));
  });

  it.each(FORMATS)('dot layout, linelength=70, %s', (fmt) => {
    expect(renderRef('echo-ll', 'dot', fmt)).toBe(ref('echo-ll', 'dot', fmt));
  });

  // patchwork routes no edge, so the input's own `pos` is echoed too.
  it.each(FORMATS)('patchwork layout, %s', (fmt) => {
    expect(renderRef('echo', 'patchwork', fmt)).toBe(ref('echo', 'patchwork', fmt));
  });
});

describe('echoed html, keyword, numeral and escaped values equal native', () => {
  it.each(FORMATS)('dot layout, %s', (fmt) => {
    expect(renderRef('odd', 'dot', fmt)).toBe(ref('odd', 'dot', fmt));
  });

  // patchwork builds no cluster label and routes no edge: cluster_k's triple and both `pos` echo.
  it.each(FORMATS)('patchwork layout, %s', (fmt) => {
    const out = renderRef('odd', 'patchwork', fmt);
    expect(out).toBe(ref('odd', 'patchwork', fmt));
    expect(out).toContain('lp=<b>');
    expect(out).toContain('pos="subgraph"');
    expect(out).toContain('xlp=-1.5');
  });
});

describe('echoAttr', () => {
  it('leaves a numeral unquoted', () => {
    expect(echoAttr(new Map([['lwidth', '1.5']]), 'lwidth')).toEqual(['lwidth=1.5']);
  });

  it('quotes a value that needs it', () => {
    expect(echoAttr(new Map([['lp', '27,18']]), 'lp')).toEqual(['lp="27,18"']);
  });

  it('wraps a 300-byte value at Max_outputline', () => {
    const pos = '10,20 '.repeat(50);
    expect(pos.length).toBe(300);
    const [part] = echoAttr(new Map([['pos', pos]]), 'pos');
    // Native's breaks for this value (`a -> b [pos=...]` under -Kpatchwork -Tdot): the 128th byte
    // is a digit, so the break waits for the first non-id byte followed by an id byte, the comma.
    const pair = '10,20 ';
    expect(part).toBe(
      `pos="${pair.repeat(21)}10,${CONTINUATION}20 ${pair.repeat(21)}${CONTINUATION}${pair.repeat(7)}"`,
    );
    expect(wraps(part ?? '')).toBe(2);
  });

  it('prints an html value angle-bracketed', () => {
    expect(echoAttr(new Map([['xlp', HTML_STRING_MARK + 'x']]), 'xlp')).toEqual(['xlp=<x>']);
  });
});

describe('echoGraphAttr', () => {
  it('leaves a numeral unquoted', () => {
    const g = new Graph('', 'directed');
    g.attrs.set('lheight', '2');
    expect(echoGraphAttr(g, 'lheight')).toEqual(['lheight=2']);
  });

  it('still prints an empty local value when nothing is inherited', () => {
    const g = new Graph('', 'directed');
    g.attrs.set('lp', '');
    expect(echoGraphAttr(g, 'lp')).toEqual(['lp=""']);
  });

  it('prints an html value angle-bracketed', () => {
    const g = new Graph('', 'directed');
    g.attrs.set('lp', HTML_STRING_MARK + 'x');
    expect(echoGraphAttr(g, 'lp')).toEqual(['lp=<x>']);
  });
});
