// SPDX-License-Identifier: EPL-2.0

/**
 * getLayout() centre-label `set` gate.
 *
 * dot's force search can leave a centre edge label unplaced: `set` stays
 * false and pos keeps the sentinel. emit_edge_label skips such a label, so the
 * snapshot must report it as absent, as it already does for the port labels
 * and xlabel.
 * @see docs/graphviz-issues/25-edge-label-published-when-unplaced.md
 * @see lib/common/emit.c:emit_edge_label (lbl == NULL || !lbl->set)
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser/index.js';
import { GvcContext } from '../gvc/context.js';
import { createMeasurer } from '../common/textmeasure-factory.js';
import { DOT_LAYOUT_ENGINE } from '../layout/dot/index.js';
import type { Graph } from '../model/graph.js';
import { getLayout } from './geometry.js';

const LABELLED_SRC = 'digraph { a -> b [label="x"] }';

function layoutGraph(src: string): Graph {
  const graph = parse(src);
  const ctx = new GvcContext(createMeasurer());
  ctx.register(DOT_LAYOUT_ENGINE);
  ctx.layout(graph, 'dot');
  return graph;
}

describe('getLayout centre label set gate', () => {
  it('a placed centre label is published at its model position', () => {
    const g = layoutGraph(LABELLED_SRC);
    const lbl = g.edges[0].info.label!;
    expect(lbl.set).toBe(true);
    expect(getLayout(g, { yAxis: 'up' }).edges[0].label).toEqual({ x: lbl.pos.x, y: lbl.pos.y });
  });

  it('a declared but unplaced centre label is absent, as in render()', () => {
    const g = layoutGraph(LABELLED_SRC);
    g.edges[0].info.label!.set = false;
    expect(getLayout(g).edges[0].label).toBeUndefined();
  });
});
