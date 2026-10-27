// SPDX-License-Identifier: EPL-2.0

/**
 * translate_drawing maps edges only when State == GVSPLINES. Patchwork never
 * routes (native stderr is empty); dot still reports lost edges.
 *
 * @see lib/common/postproc.c:translate_drawing
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderSvg } from '../index.js';
import { getState, GVBEGIN, GVSPLINES } from './layout-state.js';

const TRIVIAL = 'digraph{a->b}';
const LOST_EDGE_DOT = 'digraph g {\na [height=1.416667];\na -> m -> b;\na -> b [sametail=t];\na -> b [sametail=t];\n}\n';

function stderrLines(run: () => void): string[] {
  const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  run();
  return [...err.mock.calls, ...warn.mock.calls].map((c) => String(c[0]));
}

describe('State == GVSPLINES gate in translate_drawing', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('patchwork prints nothing and leaves State at GVBEGIN', () => {
    expect(stderrLines(() => renderSvg(TRIVIAL, 'patchwork'))).toEqual([]);
    expect(getState()).toBe(GVBEGIN);
  });

  it.each(['dot', 'neato', 'fdp', 'circo', 'twopi', 'osage', 'sfdp'] as const)('%s sets GVSPLINES', (engine) => {
    expect(stderrLines(() => renderSvg(TRIVIAL, engine))).toEqual([]);
    expect(getState()).toBe(GVSPLINES);
  });

  it('dot still reports each lost edge', () => {
    const lines = stderrLines(() => renderSvg(LOST_EDGE_DOT, 'dot'));
    expect(lines.filter((l) => l === 'Error: lost a b edge')).toHaveLength(2);
  });

  it('State resets between renders', () => {
    renderSvg(TRIVIAL, 'dot');
    expect(getState()).toBe(GVSPLINES);
    renderSvg(TRIVIAL, 'patchwork');
    expect(getState()).toBe(GVBEGIN);
  });
});
