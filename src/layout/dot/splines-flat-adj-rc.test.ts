// SPDX-License-Identifier: EPL-2.0

/**
 * Issue #187: C `make_flat_adj_edges` returns the rc of a failed aux
 * `dot_mincross`, `dot_position` or `dot_splines_`; `make_flat_edge` returns
 * it and `dot_splines_` returns it at once, so `dotLayout` fails: no later
 * edge is routed, and `dot_compoundEdges` and `dotneato_postprocess` are
 * skipped. The port read the failure as "declined", fell through to other
 * flat routers, routed every later edge and translated the layout.
 *
 * The aux graph is laid out with its rank axis rotated, so a `:s`/`:n` port
 * on a node 2.88e9 pt tall becomes an x offset there: `make_edge_pairs`'s aux
 * edge exceeds `INT_MAX` and the aux `dot_position` returns -1 (#162). In the
 * main graph the same ports have x offset 0, so the main layout succeeds.
 *
 * Provenance: each `SRC_*` is a probe of
 * `plans/issue-187-flat-adj-rc/harness/probes/`, and each `NATIVE_*` is the
 * stdout of the carried oracle (ADR-0003: graphviz 16.1.1 plus
 * `test/corpus/oracle-patches/`,
 * `~/git/sseely/graphviz-carried/build/cmd/dot/dot -Kdot -Tdot`,
 * `GVBINDIR=/tmp/ghl1611-carried`) on it, from `harness/native/*.dot`,
 * captured 2026-11-21. Native exits 1 on the five failing probes and still
 * writes the output. The number in the `Edge length` line is not pinned: it
 * is issue #274.
 *
 * @see lib/dotgen/dotsplines.c:make_flat_adj_edges (1211-1240)
 * @see lib/dotgen/dotsplines.c:make_flat_edge (1535-1536)
 * @see lib/dotgen/dotsplines.c:dot_splines_ (418-424)
 */

import { afterEach, describe, it, expect } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';
import { agseterrf } from '../../common/agerr.js';
import { GvcContext } from '../../gvc/context.js';
import { createMeasurer } from '../../common/textmeasure-factory.js';
import type { Graph } from '../../model/graph.js';
import { DOT_LAYOUT_ENGINE, dotPhaseInit } from './index.js';
import { dotRank } from './rank.js';
import { dotMincross } from './mincross.js';
import { dotPosition } from './position.js';
import { edgeType } from './splines.js';
import { makeFlatAdjEdges } from './splines-flat.js';

/** `p1`: the minimal case. */
const SRC_P1 = String.raw`digraph { {rank=same; a [height=40000000]; b [height=40000000]} a:s -> b:n }`;
const NATIVE_P1 = String.raw`digraph {
	graph [bb="-27,0,99,2.88e+09"];
	node [label="\N"];
	{
		graph [rank=same];
		a	[height="4e+07",
			pos="0,1.44e+09",
			width=0.75];
		b	[height="4e+07",
			pos="72,1.44e+09",
			width=0.75];
	}
	a:s -> b:n;
}
`;

/** `p4`: a later cross-rank edge, `c -> a`, sorts after the failing group. */
const SRC_P4 = String.raw`digraph { {rank=same; a [height=40000000]; b [height=40000000]} a:n -> b:s; c -> a }`;
const NATIVE_P4 = String.raw`digraph {
	graph [bb="-27,0,99,2.88e+09"];
	node [label="\N"];
	{
		graph [rank=same];
		a	[height="4e+07",
			pos="0,1.44e+09",
			width=0.75];
		b	[height="4e+07",
			pos="72,1.44e+09",
			width=0.75];
	}
	c	[height=0.5,
		pos="0,2.88e+09",
		width=0.75];
	a:n -> b:s;
	c -> a;
}
`;

/** `p5`: `dir=back`: the non-forward dispatch. */
const SRC_P5 = String.raw`digraph { {rank=same; a [height=40000000]; b [height=40000000]} a:s -> b:n [dir=back] }`;
const NATIVE_P5 = String.raw`digraph {
	graph [bb="-27,0,99,2.88e+09"];
	node [label="\N"];
	{
		graph [rank=same];
		a	[height="4e+07",
			pos="0,1.44e+09",
			width=0.75];
		b	[height="4e+07",
			pos="72,1.44e+09",
			width=0.75];
	}
	a:s -> b:n	[dir=back];
}
`;

/** `p9`: undirected. */
const SRC_P9 = String.raw`graph { {rank=same; a [height=40000000]; b [height=40000000]} a:s -- b:n; a -- c }`;
const NATIVE_P9 = String.raw`graph {
	graph [bb="-27,0,99,2.88e+09"];
	node [label="\N"];
	{
		graph [rank=same];
		a	[height="4e+07",
			pos="0,1.44e+09",
			width=0.75];
		b	[height="4e+07",
			pos="72,1.44e+09",
			width=0.75];
	}
	c	[height=0.5,
		pos="0,18",
		width=0.75];
	a:s -- b:n;
	a -- c;
}
`;

/** `p10`: `compound=true` with a cluster: dot_compoundEdges is skipped too. */
const SRC_P10 = String.raw`digraph { compound=true; subgraph cluster0 { {rank=same; a [height=40000000]; b [height=40000000]} } a:s -> b:n; c -> a [lhead=cluster0] }`;
const NATIVE_P10 = String.raw`digraph {
	graph [bb="0,-8,158,2.88e+09",
		compound=true
	];
	node [label="\N"];
	subgraph cluster0 {
		graph [bb="8,0,150,2.88e+09"];
		{
			graph [rank=same];
			a	[height="4e+07",
				pos="43,1.44e+09",
				width=0.75];
			b	[height="4e+07",
				pos="115,1.44e+09",
				width=0.75];
		}
		a:s -> b:n;
	}
	c	[height=0.5,
		pos="43,2.88e+09",
		width=0.75];
	c -> a	[lhead=cluster0];
}
`;

/** `p3`: control: `:e`/`:w` ports have no offset on the aux rank axis, so nothing fails. */
const SRC_P3 = String.raw`digraph { {rank=same; a [height=40000000]; b} a:e -> b:w }`;
const NATIVE_P3 = String.raw`digraph {
	graph [bb="0,0,126,2.88e+09"];
	node [label="\N"];
	{
		graph [rank=same];
		a	[height="4e+07",
			pos="27,1.44e+09",
			width=0.75];
		b	[height=0.5,
			pos="99,1.44e+09",
			width=0.75];
	}
	a:e -> b:w	[pos="e,72,1.44e+09 54,1.44e+09 56.75,1.44e+09 58.791,1.44e+09 60.61,1.44e+09"];
}
`;

interface Probe {
  readonly name: string;
  readonly src: string;
  readonly native: string;
}

/** The probes whose flat-adjacent aux layout fails. */
const FAILING: readonly Probe[] = [
  { name: 'p1', src: SRC_P1, native: NATIVE_P1 },
  { name: 'p4', src: SRC_P4, native: NATIVE_P4 },
  { name: 'p5', src: SRC_P5, native: NATIVE_P5 },
  { name: 'p9', src: SRC_P9, native: NATIVE_P9 },
  { name: 'p10', src: SRC_P10, native: NATIVE_P10 },
];

/**
 * Native's whole stderr on a failing probe: the aux `dot_position` error, once,
 * and nothing after it (no later router runs, so no `triangulation failed`).
 * @see lib/dotgen/position.c:make_edge_pairs
 */
const STDERR_RE =
  /^Error: Edge length [0-9.]+ larger than maximum 2147483647 allowed\.\nCheck for overwide node\(s\)\.\n$/;

/** C's `dot_position` rc when an aux edge is too long. @see position.c:dot_position */
const POSITION_FAILED = -1;

/** Collect the pieces the port hands `agerr` from here on. */
function captureStderr(): string[] {
  const pieces: string[] = [];
  agseterrf((m) => { pieces.push(m); });
  return pieces;
}

/** Render with `-Tdot`; the output, the stderr text and the laid-out graph. */
function renderDot(src: string): { out: string; err: string; g: Graph } {
  const pieces = captureStderr();
  const g = parse(src);
  const out = render(g, 'dot', { engine: 'dot' });
  return { out, err: pieces.join(''), g };
}

/**
 * Lay out `src` through position only, as `dot_splines_` finds the graph.
 * Composed from the phase functions: `phase=3` would also run the postprocess.
 */
function layoutToPosition(src: string): Graph {
  const g = parse(src);
  const ctx = new GvcContext(createMeasurer());
  ctx.register(DOT_LAYOUT_ENGINE);
  g.info.gvc = ctx; // the only state GvcContext.layout adds
  dotPhaseInit(g);
  dotRank(g);
  dotMincross(g);
  dotPosition(g);
  return g;
}

describe('a failed flat-adjacent aux layout fails the layout (issue #187)', () => {
  afterEach(() => {
    agseterrf(null);
  });

  it.each(FAILING)('$name: -Tdot equals native', ({ src, native }) => {
    expect(renderDot(src).out).toBe(native);
  });

  it.each(FAILING)('$name: stderr is the one Edge length error', ({ src }) => {
    expect(renderDot(src).err).toMatch(STDERR_RE);
  });

  it('p4: the edge after the failing group is not routed', () => {
    const { g } = renderDot(SRC_P4);
    const later = g.edges.find((e) => e.tail.name === 'c' && e.head.name === 'a')!;
    const flat = g.edges.find((e) => e.tail.name === 'a' && e.head.name === 'b')!;
    expect(later.info.spl).toBeUndefined();
    expect(flat.info.spl).toBeUndefined();
  });

  it('makeFlatAdjEdges returns the aux dot_position rc and installs no spline', () => {
    const g = layoutToPosition(SRC_P1);
    const pieces = captureStderr();
    const e = g.edges[0]!;
    expect(makeFlatAdjEdges(g, [e], 1, edgeType(g))).toBe(POSITION_FAILED);
    expect(e.info.spl).toBeUndefined();
    expect(pieces.join('')).toMatch(STDERR_RE);
  });

  it('p3 (control): the aux layout succeeds, output equals native, stderr empty', () => {
    const { out, err } = renderDot(SRC_P3);
    expect(out).toBe(NATIVE_P3);
    expect(err).toBe('');
  });
});
