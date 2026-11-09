// SPDX-License-Identifier: EPL-2.0
//
// A non-finite bb reaches the output as C's printf prints it. osage lays a
// subgraph out after a no-free root layout with bb "0,0,-inf,-inf"; C's page
// clip comes from setup_page's focus/pageSize arithmetic, -inf + inf = nan, and
// emit_background fills job->clip, so every corner is nan. Native refs:
// plans/post-16-1-followups-11/harness/T7b/noaddr (regen.sh).
// @see lib/common/emit.c:1559-1562 setup_page · lib/common/emit.c:1476 emit_background
// @see lib/gvc/gvdevice.c:gvprintdouble · plugin/core/gvrender_core_dot.c:126 xdot_fmt_num
import { describe, expect, it } from 'vitest';
import { nativeSubgRenders, portSubgRenders } from './__fixtures__/subg-renders/subg-renders.js';

const SUBS = ['s', 'cluster_k'] as const;

/** The root graph's attribute block: `graph [...]` up to its closing `];`. */
const graphBlock = (xdot: string): string => xdot.slice(xdot.indexOf('graph ['), xdot.indexOf('];') + 2);

describe('osage subgraph render after a no-free root layout', () => {
  it.each(SUBS)('%s: xdot graph _draw_ and bb print nan and -inf', (sub) => {
    const native = nativeSubgRenders('osage', sub, 'nofree', 'xdot')[1]!;
    const port = portSubgRenders('osage', sub, 'nofree', 'xdot')[1]!;
    expect(graphBlock(native)).toContain('P 4 nan nan nan nan nan nan nan nan ');
    expect(graphBlock(port)).toBe(graphBlock(native));
  });

  it.each(SUBS)('%s: svg page transform and background print nan', (sub) => {
    const native = nativeSubgRenders('osage', sub, 'nofree', 'svg')[1]!.split('\n');
    const port = portSubgRenders('osage', sub, 'nofree', 'svg')[1]!.split('\n');
    const pick = (lines: string[]): string[] =>
      lines.filter((l) => l.startsWith('<g id="graph') || l.startsWith('<polygon fill="white"'));
    expect(pick(native)[0]).toMatch(/ transform="scale\(1 1\) rotate\(0\) translate\(nan nan\)">$/);
    expect(pick(native)[1]).toBe('<polygon fill="white" stroke="none" points="nan,nan nan,nan nan,nan nan,nan nan,nan"/>');
    expect(pick(port)).toEqual(pick(native));
  });
});
