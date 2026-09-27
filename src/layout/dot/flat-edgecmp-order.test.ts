// SPDX-License-Identifier: EPL-2.0

/**
 * Flat edges route at their edgecmp position, not after every regular edge.
 *
 * dot_splines_ calls make_flat_edge in-loop. The flat edge sh0030->sh0014 here
 * reads its head-end maximal_bbox off a labelled vnode that a later regular
 * chain's recover_slack moves (resize_vn); routing the flat edge after that
 * chain widened its corridor by 18pt and bent the spline up to 18pt off.
 * @see docs/graphviz-issues/24-flat-labelled-minlen0-edge-spline-diverges.md
 * @see lib/dotgen/dotsplines.c:dot_splines_ (410-419)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

describe('flat labelled edge routing order', () => {
  it('routes sh0030->sh0014 before the regular chain moves its neighbour', () => {
    // Bisect source: plantuml class/givoli-70-rade072 svek-1.dot.
    const src = readFileSync(`${ROOT}test/golden/inputs/flat-labeled-edgecmp-order.dot`, 'utf8');
    const out = render(parse(src), 'dot');
    // Native dot 15.1 -Tdot.
    expect(out).toContain(
      'pos="1169.7,850.43 1141.2,864.71 1109.2,877.94 1078,885.25 930.09,919.93 755.7,868.88 652.81,829.44"',
    );
  });
});
