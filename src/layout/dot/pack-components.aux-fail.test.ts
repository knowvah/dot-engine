// SPDX-License-Identifier: EPL-2.0
//
// Issue #162, the pack arm of doDot. With `pack` set and more than one
// component, doDot lays each component out with dotLayout and returns the
// first nonzero status before packSubgraphs (dotinit.c:437-445). dotLayout
// returns dot_position's status (dotinit.c:283-290), which 16.1.1 makes
// nonzero when an aux edge is longer than INT_MAX.
//
// The probe has two components. {a, b} share a rank under rankdir=LR with
// 1e24-inch-high nodes, so the adjacent-pair aux edge is 7.2e25 pt and the
// first component fails. The port used to drop dot_position's status here,
// lay both components out, and run out of heap packing 1e25-pt components.
//
// This is a control-flow test, not a native pin. Native 16.1.1 prints the same
// single error and then segfaults (exit 139, empty stdout): doDot's early
// return leaves the root with a component that was never laid out. The `a ->
// b` edge matters: without it every component holds one node, nothing fails,
// and both sides try to pack 1e25-pt components.
// @see lib/dotgen/dotinit.c:doDot, dotLayout
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';
import { GvcContext } from '../../gvc/context.js';
import { createMeasurer } from '../../common/textmeasure-factory.js';
import type { Graph } from '../../model/graph.js';
import { DOT_LAYOUT_ENGINE, doDot } from './index.js';
import { cccompsWithClusters, dotLayoutComponent } from './pack-components.js';
import { dotGraphInit } from './init.js';
import { nodesInSeq } from './decomp.js';

const PROBE = 'digraph{pack=true; rankdir=LR; node[height="1000000000000000000000000"]; {rank=same; a->b} c}';
const EDGE_LENGTH = 'Error: Edge length 71999999999999994497073152.000000 larger than maximum 2147483647 allowed.\nCheck for overwide node(s).';

/** The probe, parsed and bound to a layout context as GvcContext.layout does. */
function probe(): Graph {
  const g = parse(PROBE);
  const ctx = new GvcContext(createMeasurer());
  ctx.register(DOT_LAYOUT_ENGINE);
  g.info.gvc = ctx;
  return g;
}

let stderr: MockInstance<(...args: unknown[]) => void>;

beforeEach(() => {
  stderr = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  stderr.mockRestore();
});

describe('doDot pack arm: a component whose dot_position fails stops the layout', () => {
  it('dotLayoutComponent returns dot_position\'s status and routes nothing', () => {
    const g = probe();
    dotGraphInit(g);
    const { comps } = cccompsWithClusters(g);
    expect(comps.map((c) => nodesInSeq(c).map((n) => n.name))).toEqual([['a', 'b'], ['c']]);
    expect(dotLayoutComponent(comps[0], g)).toBe(-1);
    expect(stderr.mock.calls).toEqual([[EDGE_LENGTH]]);
    // dot_splines never ran: the a -> b edge has no spline.
    expect(g.edges.map((e) => e.info.spl ?? null)).toEqual([null]);
  });

  it('doDot stops at the first component: no second layout, no packing', () => {
    const g = probe();
    doDot(g);
    expect(stderr.mock.calls).toEqual([[EDGE_LENGTH]]);
    // The second component's dotLayout never ran, so `c` was never ranked.
    expect(nodesInSeq(g).map((n) => [n.name, n.info.rank])).toEqual([
      ['a', 0], ['b', 0], ['c', undefined],
    ]);
    // packSubgraphs sets GD_bb(root); it is still graph_init's zero box.
    expect(g.info.bb).toEqual({ ll: { x: 0, y: 0 }, ur: { x: 0, y: 0 } });
  });

  it('render returns the unpositioned graph and prints the error once', () => {
    const out = render(parse(PROBE), 'plain', { engine: 'dot' });
    expect(out.split('\n')[0]).toBe('graph 1 0 0');
    expect(out.split('\n').filter((l) => l.startsWith('node ')).map((l) => l.split(' ')[1]))
      .toEqual(['a', 'b', 'c']);
    expect(stderr.mock.calls).toEqual([[EDGE_LENGTH]]);
  });
});
