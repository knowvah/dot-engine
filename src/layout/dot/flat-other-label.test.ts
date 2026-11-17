// SPDX-License-Identifier: EPL-2.0
//
// Issue #159: graphviz 16.1.1 (upstream 4e50c9abd, gitlab #2756) makes
// flat_edges add the rank -1 "abomination" when rank 0 has a labeled
// non-adjacent edge in ND_other, not only in ND_flat_in, behind the gate
// `GD_rank(g)[0].flat || GD_n_cluster(g) > 0` (lib/dotgen/flat.c:274-291).
//
// Each input below is rendered `-Tplain` and compared with native 16.1.1's
// stdout (`~/git/graphviz-16.1.1/build/cmd/dot/dot`, `GVBINDIR=/tmp/ghl1611`),
// captured by issue #159. What each input reaches is on its source constant.
// Before the port of the ND_other scan, probe-c.gv threw in the port
// (`Cannot read properties of undefined (reading 'v')`).
//
// stderr is not pinned whole. On probe-c.gv native prints
//   Error: in routesplines, illegal values of prev 1 and next 1, line 375
//   Error: lost a b edge
// and exits 1 with a complete drawing; the port prints only the second line,
// because its polygon builder returns silently where C calls agerrorf (issue
// #229). Pin the whole stderr when #229 lands.
// @see https://gitlab.com/graphviz/graphviz/-/issues/2756
// @see lib/dotgen/flat.c:flat_edges
import { afterEach, describe, expect, test } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';
import { agseterrf } from '../../common/agerr.js';

/**
 * Verbatim copy of probe-a.gv. Gate open by a cluster; the labeled rank-0 loop is in ND_other. Abomination
 * fires and nothing lands on the new rank (flat_edges skips loops), so the
 * drawing has an empty rank above `a`.
 */
const SRC_A = `digraph G { a -> a [label="loop"]; a -> b; subgraph cluster_x { b; c; } b -> c; }
`;

/** Native 16.1.1 `-Tplain` stdout for probe-a.gv. */
const NATIVE_A_PLAIN = `graph 1 1.5679 2.75
node a 0.59722 2.5 0.75 0.5 a solid ellipse black lightgrey
node b 0.59722 1.4861 0.75 0.5 b solid ellipse black lightgrey
node c 0.59722 0.47222 0.75 0.5 c solid ellipse black lightgrey
edge a a 7 0.9506 2.5942 1.0976 2.6007 1.2222 2.5693 1.2222 2.5 1.2222 2.4578 1.1759 2.4296 1.1065 2.4155 loop 1.3951 2.5 solid black
edge a b 4 0.59722 2.2474 0.59722 2.142 0.59722 2.0153 0.59722 1.8964 solid black
edge b c 4 0.59722 1.2335 0.59722 1.1281 0.59722 1.0014 0.59722 0.88249 solid black
stop
`;

/**
 * Verbatim copy of probe-b.gv. The same loop with no cluster and no flat edge on rank 0: the gate is
 * closed and no rank is added. The ND_other scan without the gate throws here.
 */
const SRC_B = `digraph G { a -> a [label="loop"]; a -> b; b -> c; }
`;

/** Native 16.1.1 `-Tplain` stdout for probe-b.gv. */
const NATIVE_B_PLAIN = `graph 1 1.3457 2.5278
node a 0.375 2.2778 0.75 0.5 a solid ellipse black lightgrey
node b 0.375 1.2639 0.75 0.5 b solid ellipse black lightgrey
node c 0.375 0.25 0.75 0.5 c solid ellipse black lightgrey
edge a a 7 0.72838 2.372 0.87539 2.3785 1 2.3471 1 2.2778 1 2.2355 0.95373 2.2074 0.88431 2.1933 loop 1.1728 2.2778 solid black
edge a b 4 0.375 2.0252 0.375 1.9198 0.375 1.7931 0.375 1.6742 solid black
edge b c 4 0.375 1.0113 0.375 0.90591 0.375 0.77919 0.375 0.66027 solid black
stop
`;

/**
 * Verbatim copy of probe-c.gv. The rank-0 class rep `a -> b` is unlabeled and not adjacent (`x` sits
 * between); the labeled `a -> b` is in ND_other only. The matrix opens the
 * gate and the label vnode goes on the new rank. Native exits 1.
 */
const SRC_C = `digraph G { {rank=same; a; x; b;} a -> x; x -> b; a -> b; a -> b [label="L"]; }
`;

/** Native 16.1.1 `-Tplain` stdout for probe-c.gv. */
const NATIVE_C_PLAIN = `graph 1 3.25 1.1167
node a 0.375 0.25 0.75 0.5 a solid ellipse black lightgrey
node x 1.625 0.25 0.75 0.5 x solid ellipse black lightgrey
node b 2.875 0.25 0.75 0.5 b solid ellipse black lightgrey
edge a x 4 0.75586 0.25 0.86662 0.25 0.97739 0.25 1.0882 0.25 solid black
edge a b 10 0.6689 0.41146 0.83427 0.49308 1.0476 0.58346 1.25 0.625 1.5765 0.69202 1.6735 0.69202 2 0.625 2.1486 0.5945 2.3032 0.53765 2.4403 0.47728 solid black
 L -0.55556 0.25 solid black
edge x b 4 2.0059 0.25 2.1166 0.25 2.2274 0.25 2.3382 0.25 solid black
stop
`;

/**
 * Verbatim copy of probe-h.gv. probe-a.gv with `ranksep="0.5 equally"`: the empty rank is read by the
 * equal-spacing pass too.
 */
const SRC_H = `digraph G { ranksep="0.5 equally"; a -> a [label="loop"]; a -> b; subgraph cluster_x { b; c; } b -> c; }
`;

/** Native 16.1.1 `-Tplain` stdout for probe-h.gv. */
const NATIVE_H_PLAIN = `graph 1 1.5679 2.75
node a 0.59722 2.5 0.75 0.5 a solid ellipse black lightgrey
node b 0.59722 1.4861 0.75 0.5 b solid ellipse black lightgrey
node c 0.59722 0.47222 0.75 0.5 c solid ellipse black lightgrey
edge a a 7 0.9506 2.5942 1.0976 2.6007 1.2222 2.5693 1.2222 2.5 1.2222 2.4578 1.1759 2.4296 1.1065 2.4155 loop 1.3951 2.5 solid black
edge a b 4 0.59722 2.2474 0.59722 2.142 0.59722 2.0153 0.59722 1.8964 solid black
edge b c 4 0.59722 1.2335 0.59722 1.1281 0.59722 1.0014 0.59722 0.88249 solid black
stop
`;

/**
 * Verbatim copy of tests/2756.dot. Upstream's fuzzed input for gitlab #2756.
 */
const SRC_2756 = `digraph{e[0=0]{rank=same;300;000;0}->000[0=0]300->000[label=0]}
`;

/** Native 16.1.1 `-Tplain` stdout for tests/2756.dot. */
const NATIVE_2756_PLAIN = `graph 1 4.5 0.5
node e 0.375 0.25 0.75 0.5 e solid ellipse black lightgrey
node 300 1.375 0.25 0.75 0.5 300 solid ellipse black lightgrey
node 000 2.625 0.25 0.75 0.5 000 solid ellipse black lightgrey
node 0 4.125 0.25 0.75 0.5 0 solid ellipse black lightgrey
edge 300 000 7 1.7536 0.21715 1.8083 0.21349 1.8639 0.21036 1.9167 0.20833 1.9742 0.20612 2.0344 0.20611 2.0943 0.20756 solid black
edge 300 000 4 1.7568 0.25 1.861 0.25 1.9759 0.25 2.087 0.25 0 2 0.40833 solid black
edge 000 000 7 2.9784 0.34293 3.1254 0.34933 3.25 0.31836 3.25 0.25 3.25 0.20834 3.2037 0.18057 3.1343 0.16668 solid black
edge 0 000 4 3.7447 0.25 3.5503 0.25 3.356 0.25 3.1617 0.25 solid black
stop
`;

/**
 * Verbatim copy of tests/2756_1.dot. Upstream's reduced input for gitlab #2756.
 */
const SRC_2756_1 = `// based on https://gitlab.com/graphviz/graphviz/-/work_items/2756

digraph {
  {rank=same; 300; 000; 0} -> 000 
  300 -> 000  [label=XYZ]
}
`;

/** Native 16.1.1 `-Tplain` stdout for tests/2756_1.dot. */
const NATIVE_2756_1_PLAIN = `graph 1 3.6528 0.5
node 300 0.375 0.25 0.75 0.5 300 solid ellipse black lightgrey
node 000 1.7778 0.25 0.75 0.5 000 solid ellipse black lightgrey
node 0 3.2778 0.25 0.75 0.5 0 solid ellipse black lightgrey
edge 300 000 7 0.75097 0.21957 0.82284 0.21489 0.8975 0.21079 0.96759 0.20833 1.0587 0.20514 1.1555 0.20622 1.2493 0.20962 solid black
edge 300 000 4 0.75461 0.25 0.90432 0.25 1.079 0.25 1.2412 0.25 XYZ 1.0764 0.40833 solid black
edge 000 000 7 2.1312 0.34293 2.2782 0.34933 2.4028 0.31836 2.4028 0.25 2.4028 0.20834 2.3565 0.18057 2.2871 0.16668 solid black
edge 0 000 4 2.8974 0.25 2.7031 0.25 2.5088 0.25 2.3145 0.25 solid black
stop
`;

/** The edge both native and the port give up on probe-c.gv, as reported at emit. */
const NATIVE_C_LOST_EDGE = 'Error: lost a b edge\n';

const CASES: ReadonlyArray<readonly [name: string, src: string, native: string]> = [
  ['probe-a.gv (gate open by a cluster, empty new rank)', SRC_A, NATIVE_A_PLAIN],
  ['probe-b.gv (gate closed, no new rank)', SRC_B, NATIVE_B_PLAIN],
  ['probe-h.gv (probe-a with ranksep equally)', SRC_H, NATIVE_H_PLAIN],
  ['tests/2756.dot', SRC_2756, NATIVE_2756_PLAIN],
  ['tests/2756_1.dot', SRC_2756_1, NATIVE_2756_1_PLAIN],
];

describe('flat_edges scans ND_other for the abomination rank (issue #159)', () => {
  afterEach(() => {
    agseterrf(null);
  });

  test.each(CASES)('%s: -Tplain equals native 16.1.1', (_name, src, native) => {
    expect(render(parse(src), 'plain', { engine: 'dot' })).toBe(native);
  });

  test('probe-c.gv (labeled ND_other edge, label vnode on the new rank): -Tplain equals native, and the lost edge is reported', () => {
    const pieces: string[] = [];
    agseterrf((m) => { pieces.push(m); });
    const out = render(parse(SRC_C), 'plain', { engine: 'dot' });
    expect(out).toBe(NATIVE_C_PLAIN);
    expect(pieces.join('')).toContain(NATIVE_C_LOST_EDGE);
  });
});
