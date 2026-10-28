// SPDX-License-Identifier: EPL-2.0
/**
 * `layers not supported in <fmt> output`: every expectation is native dot
 * 16.1.0's stderr for `digraph{layers="a:b";x[layer=a];y[layer=b]}`.
 * @see lib/common/emit.c:firstlayer
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../index.js';

const LAYERED = 'digraph{layers="a:b";x[layer=a];y[layer=b]}';
const UNLAYERED = 'digraph{x;y}';
const ONE_LAYER = 'digraph{layers="a";x[layer=a]}';

const warning = (fmt: string): string => `Warning: layers not supported in ${fmt} output`;

/** Lines the port prints on console.warn/error while rendering `src`. */
function stderrOf(src: string, format: string): { lines: string[]; out: string } {
  const lines: string[] = [];
  const sink = (...a: unknown[]): void => { lines.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  const out = render(parse(src), format as 'svg', { engine: 'dot' });
  return { lines, out };
}

afterEach(() => { vi.restoreAllMocks(); });

describe('firstlayer warning', () => {
  it.each(['xdot', 'cmapx', 'plain', 'dot', 'json0', 'imap', 'plain-ext'])(
    'warns once in %s',
    (format) => {
      expect(stderrOf(LAYERED, format).lines).toEqual([warning(format)]);
    },
  );

  it.each([['cmapx-np', 'cmapx_np'], ['imap-np', 'imap_np']])(
    'names %s as native does (%s)',
    (format, native) => {
      expect(stderrOf(LAYERED, format).lines).toEqual([warning(native)]);
    },
  );

  it('json warns for the nested xdot render first, then json (native order)', () => {
    // json_begin_graph renders xdot inside emit_begin_graph, before firstlayer.
    expect(stderrOf(LAYERED, 'json').lines).toEqual([warning('xdot'), warning('json')]);
  });

  it('svg does layers: no warning, both layer groups present', () => {
    const { lines, out } = stderrOf(LAYERED, 'svg');
    expect(lines).toEqual([]);
    expect(out).toContain('class="layer"');
  });

  it.each(['xdot', 'plain'])('no warning without layers or with one layer (%s)', (format) => {
    expect(stderrOf(UNLAYERED, format).lines).toEqual([]);
    expect(stderrOf(ONE_LAYER, format).lines).toEqual([]);
  });
});

/** $BASE/native/79-sel-*.gv: n1/n2/n3 on layers a/b/c, n1->n2->n3. */
const sel = (v: string): string =>
  `digraph{layers="a:b:c";layerselect="${v}";n1[layer="a"];n2[layer="b"];n3[layer="c"];n1->n2->n3}`;
const ZZ_WARNING =
  'Warning: The layerselect attribute "zz" does not match any layer specifed by the layers attribute - ignored.';
const groupIds = (svg: string): string[] => [...svg.matchAll(/<g id="([^"]*)"/g)].map((m) => m[1]!);

describe('layerselect walk', () => {
  it('b -Tsvg: one layer, no layer group, ids carry the b prefix and suffix', () => {
    const { lines, out } = stderrOf(sel('b'), 'svg');
    expect(lines).toEqual([]);
    expect(groupIds(out)).toEqual(['b_graph0', 'b_node2_b', 'b_edge1', 'b_edge2']);
  });

  it('b,c -Tsvg: two layer groups in order', () => {
    const { lines, out } = stderrOf(sel('b,c'), 'svg');
    expect(lines).toEqual([]);
    expect([...out.matchAll(/<g id="([^"]*)" class="layer"/g)].map((m) => m[1])).toEqual(['b', 'c']);
  });

  it('zz -Tsvg: native warning, all three layers', () => {
    const { lines, out } = stderrOf(sel('zz'), 'svg');
    expect(lines).toEqual([ZZ_WARNING]);
    expect([...out.matchAll(/<g id="([^"]*)" class="layer"/g)].map((m) => m[1])).toEqual(['a', 'b', 'c']);
  });

  it.each(['xdot', 'cmapx'])('b,c -T%s: layers-unsupported warning only', (fmt) => {
    expect(stderrOf(sel('b,c'), fmt).lines).toEqual([warning(fmt)]);
  });

  it.each(['xdot', 'cmapx'])('zz -T%s: zz warning then layers-unsupported', (fmt) => {
    expect(stderrOf(sel('zz'), fmt).lines).toEqual([ZZ_WARNING, warning(fmt)]);
  });

  it.each(['xdot', 'cmapx'])('b -T%s: single selection warns nothing', (fmt) => {
    expect(stderrOf(sel('b'), fmt).lines).toEqual([]);
  });
});
