// SPDX-License-Identifier: EPL-2.0
//
// Engine cleanup frees node/edge/cluster labels where its C does, so a second
// layout of the same Graph rebuilds them (changed measurer, repeated warnings).
// @see lib/common/utils.c:gv_cleanup_node
// @see lib/common/utils.c:gv_cleanup_edge
// @see lib/dotgen/dotinit.c:dot_cleanup_node
// @see lib/dotgen/dotinit.c:dot_cleanup_graph
// @see lib/fdpgen/fdpinit.c:cleanup_subgs
// @see lib/osage/osageinit.c:cleanup_graphs
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from '../parser/index.js';
import { createDefaultContext } from '../gvc/default-context.js';
import type { TextMeasurer } from '../common/textmeasure.js';
import type { Graph } from '../model/graph.js';
import type { Node } from '../model/node.js';

const ENGINES = ['dot', 'neato', 'fdp', 'sfdp', 'circo', 'twopi', 'osage', 'patchwork'] as const;
const SRC = 'digraph { a [label="wide label text"]; b; a -> b [label=e]; }';
const MISSING_IMAGE = 'digraph{a[label=<<TABLE><TR><TD><IMG SRC="nope.png"/></TD></TR></TABLE>>]}';
const OPEN_WARNING = 'No such file or directory while opening nope.png';
const IMPROPER_ERROR = 'No or improper image file="nope.png"';
const SCALE = 2;
const MIN_WIDTH_RATIO = 1.5;

function scaled(m: TextMeasurer): TextMeasurer {
  return { measure: (...a) => {
    const r = m.measure(...a);
    return { ...r, w: r.w * SCALE };
  } };
}

function nodeWidth(g: Graph, name: string): number {
  const n = g.nodes.get(name) as Node;
  return (n.info.width ?? 0) as number;
}

describe('cleanup frees labels so a second layout re-measures', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  for (const engine of ENGINES) {
    it(`${engine}: label/xlabel/edge labels cleared by freeLayout`, () => {
      const ctx = createDefaultContext();
      const g = parse(SRC);
      ctx.layout(g, engine);
      expect(g.nodes.get('a')?.info.label).toBeDefined();
      ctx.freeLayout(g, engine);
      for (const n of g.nodes.values()) {
        expect(n.info.label).toBeUndefined();
        expect(n.info.xlabel).toBeUndefined();
      }
      for (const e of g.edges) expect(e.info.label).toBeUndefined();
    });

    it(`${engine}: doubled measurer widens the node on the second layout`, () => {
      const ctx = createDefaultContext();
      const g = parse(SRC);
      ctx.layout(g, engine);
      const first = nodeWidth(g, 'a');
      ctx.freeLayout(g, engine);
      ctx.textMeasurer = scaled(ctx.textMeasurer);
      ctx.layout(g, engine);
      expect(nodeWidth(g, 'a')).toBeGreaterThan(first * MIN_WIDTH_RATIO);
    });
  }

  it('dot and fdp and osage clear cluster labels', () => {
    for (const engine of ['dot', 'fdp', 'osage'] as const) {
      const ctx = createDefaultContext();
      const g = parse('digraph { subgraph cluster_x { label=L; a; } b; }');
      ctx.layout(g, engine);
      const cl = g.subgraphs.get('cluster_x') as Graph;
      expect(cl.info.label).toBeDefined();
      ctx.freeLayout(g, engine);
      expect(cl.info.label).toBeUndefined();
    }
  });

  it('the missing-image diagnostics print on each layout of the same Graph', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ctx = createDefaultContext();
    const g = parse(MISSING_IMAGE);
    ctx.layout(g, 'dot');
    ctx.freeLayout(g, 'dot');
    ctx.layout(g, 'dot');
    const count = (spy: typeof warn, text: string): number =>
      spy.mock.calls.filter((c) => String(c[0]).includes(text)).length;
    expect(count(warn, OPEN_WARNING)).toBe(2);
    expect(count(err, IMPROPER_ERROR)).toBe(2);
  });

  it('a single layout is unchanged: labels are still present before freeLayout', () => {
    const ctx = createDefaultContext();
    const g = parse(SRC);
    ctx.layout(g, 'dot');
    expect(nodeWidth(g, 'a')).toBeGreaterThan(nodeWidth(g, 'b'));
  });
});
