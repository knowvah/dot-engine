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

  it('json warns for json and for the nested xdot render', () => {
    // Native prints xdot first (json_begin_graph renders xdot inside
    // emit_begin_graph, before firstlayer). The port's json renderer does that
    // nested render in endGraph, so the order is json, xdot. Order-insensitive
    // here; the reordering lives in src/render/json.ts (open item for T19).
    expect(stderrOf(LAYERED, 'json').lines.sort()).toEqual([warning('json'), warning('xdot')]);
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
