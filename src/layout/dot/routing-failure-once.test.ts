// SPDX-License-Identifier: EPL-2.0

/**
 * A routesplines failure consumes the edge: C's dot_splines_ calls
 * make_regular_edge exactly once per edge group and never revisits it, so each
 * failing group/chain reports `in routesplines, Pshortestpath failed` once. The
 * port's post-loop routeDotEdges backstop must skip edges whose routing already
 * failed — a parallel group whose shared base was lost, a multi-rank forward
 * chain, a multi-rank back chain (makefwdedge view), and a labeled flat edge
 * whose make_flat_labeled_edge route is degenerate (pn == 0).
 *
 * Expected counts and lost-edge sets are native graphviz 16.1.0 stderr
 * (`dot -Tsvg`, GVBINDIR=/tmp/ghl) for the same inputs.
 *
 * @see lib/dotgen/dotsplines.c:dot_splines_ (one make_regular_edge per group)
 * @see lib/dotgen/dotsplines.c:make_regular_edge (pn == 0 return)
 * @see lib/dotgen/dotsplines.c:make_flat_labeled_edge (pn == 0 return)
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderSvg } from '../../index.js';

const ROUTING_FAILURE = 'in routesplines, Pshortestpath failed';
const LOST_EDGE = /^Error: lost (.+) edge$/;

interface Case {
  name: string;
  dot: string;
  failures: number;
  lost: string[];
}

const CASES: Case[] = [
  {
    name: 'lost parallel group base (multi-rank group)',
    dot: 'digraph g {\na [height=1.416667];\na -> m -> b;\na -> b [sametail=t];\na -> b [sametail=t];\n}\n',
    failures: 1,
    lost: ['a b', 'a b'],
  },
  {
    name: 'lost multi-rank forward chain',
    dot: 'digraph g {\na [height=1.416667];\na -> m -> b;\na -> b [sametail=t];\na -> m [sametail=t];\n}\n',
    failures: 2,
    lost: ['a b', 'a m', 'a m'],
  },
  {
    name: 'lost multi-rank back chain',
    dot: 'digraph g {\na [height=1.416667];\na -> m -> b;\nb -> a [samehead=t];\nm -> a [samehead=t];\n}\n',
    failures: 2,
    lost: ['a m', 'b a', 'm a'],
  },
  {
    name: 'lost labeled flat edge (make_flat_labeled_edge pn == 0)',
    dot: readFileSync(
      join(process.cwd(), 'src/layout/dot/__fixtures__/2796-flat-labeled-lost.dot'),
      'utf8',
    ),
    failures: 1,
    lost: ['39 43'],
  },
];

describe('dot_splines_: a failed edge is routed (and reported) once', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  for (const c of CASES) {
    it(c.name, () => {
      const warn = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      renderSvg(c.dot, 'dot');
      const lines = warn.mock.calls.map((call) => String(call[0]));
      const failures = lines.filter((l) => l.endsWith(ROUTING_FAILURE)).length;
      const lost = lines.flatMap((l) => {
        const m = LOST_EDGE.exec(l);
        return m?.[1] === undefined ? [] : [m[1]];
      });
      expect(failures).toBe(c.failures);
      expect(lost.sort()).toEqual(c.lost);
    });
  }
});
