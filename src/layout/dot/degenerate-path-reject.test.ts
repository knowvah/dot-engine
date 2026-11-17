// SPDX-License-Identifier: EPL-2.0

/**
 * A path whose boxes are all degenerate is rejected, not thrown on (#151).
 *
 * Upstream 2773: a `fontsize` of 6e17 puts the label rank at y = 7.286e17,
 * where every box of the labelled edge's path has zero height, so `add_box`
 * drops them all and the path reaches routesplines with `nbox == 0`.
 * Graphviz 16.1.1's checkpath then reports the path and fails it, and the
 * edge is lost. Before that, adjustregularpath widens slots `fb-1..lb` of the
 * path's preallocated box array whatever `nbox` is; those slots are dead in C,
 * and the port must not read them from its empty array.
 *
 * The source is graphviz 16.1.1's tests/2773_1.dot, and the expected lines are
 * native 16.1.1's stderr on it (`dot -Tsvg`, GVBINDIR=/tmp/ghl1611).
 *
 * @see lib/common/routespl.c:checkpath (the `boxn == 0` branch)
 * @see lib/common/routespl.c:printpath
 * @see lib/dotgen/dotsplines.c:adjustregularpath
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderSvg } from '../../index.js';

const SRC_2773_1 = `// based on https://gitlab.com/graphviz/graphviz/-/work_items/2773
digraph  {
  0 
  0 -> Se3ffa81011d69e3db000538bf02fa1d0  
  Se3ffa81011d69e3db000538bf02fa1d0 -> S0 [ fontsize=607167449005158804 label="Inse;"] 
}
`;

const NATIVE_STDERR = [
  'Error: in checkpath, all bounding boxes are below threshold',
  '0 boxes:',
  'start port: (0, 7.286e+17), tangent angle: 0, not constrained',
  'end port: (0, 7.286e+17), tangent angle: 0, not constrained',
  'Error: lost 0 Se3ffa81011d69e3db000538bf02fa1d0 edge',
];

describe('dot: an all-degenerate path is rejected as checkpath does (#151)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders 2773_1 with native\'s diagnostics and its one surviving edge', () => {
    const lines: string[] = [];
    const capture = (...args: unknown[]): void => {
      lines.push(String(args[0]));
    };
    vi.spyOn(console, 'error').mockImplementation(capture);
    vi.spyOn(console, 'warn').mockImplementation(capture);
    const svg = renderSvg(SRC_2773_1, 'dot');
    expect(lines).toEqual(NATIVE_STDERR);
    expect(svg.match(/<g id="edge/g)).toHaveLength(1);
  });
});
