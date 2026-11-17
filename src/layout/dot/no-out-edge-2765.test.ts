// SPDX-License-Identifier: EPL-2.0
//
// Corpus 2765 and 2765_1 (upstream issue 2765). Under `concentrate=true`, with
// record ports that do not exist, concentration orphans the first virtual node
// of one edge's chain: no in edge, no out edge. Graphviz 16.1.0 read
// `ND_out(v).list[0]` of that node in `make_regular_edge` and crashed. 16.1.1
// tests `ND_out(v).size` there and in `straight_len`, `cl_bound` and
// `recover_slack` (upstream 4f9ef1d9e, a79e42588, 5649d079c, f8e3f2100,
// f3da7c569): it routes the edge to the orphan, resizes the orphan, and leaves
// the edge without a spline. Native 16.1.1 `dot -Tplain` exits 0 on both
// inputs and writes the two `:Target` edges as a bare ` solid black` line.
//
// This is a pin, not a red test. The port never crashed here and already drew
// both inputs as native does before issue #161 (it declined the chain before
// routing it; issue #148). #161 made it do 16.1.1's work at the dead end, which
// edge-route-chain.dead-end.test.ts checks; the drawing does not change.
//
// NATIVE_*_PLAIN are native 16.1.1's stdout (`GVBINDIR=/tmp/ghl1611`), captured
// by issue #161. Stderr is not pinned. On 2765 native prints four
// `syntax ambiguity - badly delimited number '0H'` warnings, which the port
// prints too, and six `Warning: node <name>, port 0 unrecognized` lines, which
// the port lacks (issue #216). On 2765_1 (`:n` ports) both print nothing.
// @see https://gitlab.com/graphviz/graphviz/-/issues/2765
// @see lib/dotgen/dotsplines.c:make_regular_edge, straight_len, recover_slack, cl_bound
import { describe, expect, test } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';

/** Verbatim copy of graphviz tests/2765.dot. */
const SRC_2765 = `digraph{concentrate=true;node[shape=record]{0[0=""]}[0=""][0=""]{0[0=""]}subgraph cluster{0[]Ho0er0tra0eTo0top[label="|<Target>"]}Ho0erTo0light[]Ho0er0tra0eTo0top:0->Ho0er0est:0Ho0er0tra0eTo0top:Target->Ho0er0est:0Ho0er0tra0eTo0top:0->Ho0erTo0light:0Ho0er0tra0eTo0top:Target->Ho0er0est:0Ho0erTo0light->Ho0er0est}
`;

/** Verbatim copy of graphviz tests/2765_1.dot. */
const SRC_2765_1 = `// based on https://gitlab.com/graphviz/graphviz/-/work_items/2765
digraph {
  concentrate=true;
  node [shape=record]
  subgraph cluster{
    Ho0er0tra0eTo0top [label="|<Target>"]
  }
  Ho0erTo0light
  Ho0er0tra0eTo0top:n -> Ho0er0est:n
  Ho0er0tra0eTo0top:Target -> Ho0er0est:n
  Ho0er0tra0eTo0top:n -> Ho0erTo0light:n
  Ho0er0tra0eTo0top:Target -> Ho0er0est:n
  Ho0erTo0light -> Ho0er0est
}
`;

const NATIVE_2765_PLAIN = `graph 1 2.3695 2.7639
node 0 0.77227 2.2847 0.75 0.51389 "\\N" solid record black lightgrey
node Ho0er0tra0eTo0top 1.7723 2.2847 0.75 0.51389 "|<Target>" solid record black lightgrey
node Ho0erTo0light 0.68894 1.2708 1.3779 0.51389 "\\N" solid record black lightgrey
node Ho0er0est 1.2306 0.25694 1.0214 0.51389 "\\N" solid record black lightgrey
edge Ho0er0tra0eTo0top Ho0erTo0light 4 1.7621 2.0218 1.6725 1.8579 1.5302 1.722 1.378 1.6129 solid black
edge Ho0er0tra0eTo0top Ho0er0est 4 1.7647 2.023 1.6972 1.5409 1.5221 1.0097 1.3906 0.65712 solid black
 solid black
 solid black
edge Ho0erTo0light Ho0er0est 4 0.82006 1.0182 0.88127 0.9068 0.95559 0.77149 1.0241 0.64679 solid black
stop
`;

const NATIVE_2765_1_PLAIN = `graph 1 2.3695 2.7639
node Ho0er0tra0eTo0top 1.7723 2.2847 0.75 0.51389 "|<Target>" solid record black lightgrey
node Ho0erTo0light 0.68894 1.2708 1.3779 0.51389 "\\N" solid record black lightgrey
node Ho0er0est 1.2306 0.25694 1.0214 0.51389 "\\N" solid record black lightgrey
edge Ho0er0tra0eTo0top Ho0erTo0light 10 1.7723 2.5486 1.7723 2.7154 2.0315 2.6548 2.1473 2.5347 2.3036 2.3725 2.2782 2.2111 2.1473 2.0278 1.7864 1.5225 0.88189 2.0851 0.71547 1.6851 solid black
edge Ho0er0tra0eTo0top Ho0er0est 10 1.7723 2.5486 1.7723 2.7154 2.0315 2.6548 2.1473 2.5347 2.3036 2.3725 2.2079 2.2448 2.1473 2.0278 2.1253 1.949 1.5053 1.0213 1.2976 0.65531 solid black
 solid black
 solid black
edge Ho0erTo0light Ho0er0est 4 0.82006 1.0182 0.88127 0.9068 0.95559 0.77149 1.0241 0.64679 solid black
stop
`;

describe('corpus 2765 (a vnode with no out edge renders as native 16.1.1 does)', () => {
  test.each([
    ['2765', SRC_2765, NATIVE_2765_PLAIN],
    ['2765_1', SRC_2765_1, NATIVE_2765_1_PLAIN],
  ])('%s -Tplain equals native', (_id, src, native) => {
    expect(render(parse(src), 'plain', { engine: 'dot' })).toBe(native);
  });
});
