// SPDX-License-Identifier: EPL-2.0
//
// Corpus 2723 (upstream issue 2723). Native graphviz 16.1.1 neither segfaults
// nor hangs on it: `dot -Tplain tests/2723.dot` exits 1 with a complete
// drawing and, on stderr,
//   Error: in routesplines, illegal values of prev 1 and next 1, line 375
//   Error: lost 415 407 edge
// With 16.1.1's valid_rank in flat_reorder (issue #158) the port no longer
// throws in flatLabelYpos either, and draws what native draws.
// NATIVE_2723_PLAIN is native 16.1.1's stdout (`GVBINDIR=/tmp/ghl1611`),
// captured by issue #158.
//
// The port's stderr has the `lost` line but not the `routesplines` one: its
// polygon builder returns silently where C calls agerrorf (issue #229). The
// whole stderr is therefore not pinned here; pin it when #229 lands.
// @see https://gitlab.com/graphviz/graphviz/-/issues/2723
// @see lib/dotgen/mincross.c:flat_reorder
import { afterEach, describe, expect, test } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';
import { agseterrf } from '../../common/agerr.js';

/** Verbatim copy of graphviz tests/2723.dot. */
const SRC_2723 = `graph {
  407 [label = "@-407", style = filled, fillcolor = lightpink]
  407 -- 1875 [dir=forward, label = "Fun"]
  407 -- 1876 [dir=forward, label = "Arg"]
  { rank = same; 1875; 1876}
  1875 -- 1876 [dir=forward, style=invis]
  408 [label = "@-408", style = filled, fillcolor = lightpink]
  408 -- 1877 [dir=forward, label = "Fun"]
  408 -- 417 [dir=forward, label = "Arg"]
  { rank = same; 1877; 417}
  1877 -- 417 [dir=forward, style=invis]
  412 [label = "@-412", style = filled, fillcolor = lightpink]
  412 -- 1878 [dir=forward, label = "Fun"]
  412 -- 1879 [dir=forward, label = "Arg"]
  { rank = same; 1878; 1879}
  1878 -- 1879 [dir=forward, style=invis]
  413 [label = "@-413", style = filled, fillcolor = lightpink]
  413 -- 412 [dir=forward, label = "Fun"]
  413 -- 1880 [dir=forward, label = "Arg"]
  { rank = same; 412; 1880}
  412 -- 1880 [dir=forward, style=invis]
  414 [label = "@-414", style = filled, fillcolor = lightpink]
  414 -- 408 [dir=forward, label = "Fun"]
  414 -- 413 [dir=forward, label = "Arg"]
  { rank = same; 408; 413}
  408 -- 413 [dir=forward, style=invis]
  415 [label = "@-415", style = filled, fillcolor = lightpink]
  415 -- 407 [dir=forward, label = "Fun"]
  415 -- 414 [dir=forward, label = "Arg"]
  { rank = same; 407; 414}
  407 -- 414 [dir=forward, style=invis]
  416 [label = "@-416", style = filled, fillcolor = lightpink]
  416 -- 407 [dir=forward, label = "Fun"]
  416 -- 415 [dir=forward, label = "Arg"]
  { rank = same; 407; 415}
  407 -- 415 [dir=forward, style=invis]
  417 [label = "@-417", style = filled, fillcolor = lightpink]
  417 -- 407 [dir=forward, label = "Fun"]
  417 -- 416 [dir=forward, label = "Arg"]
  { rank = same; 407; 416}
  407 -- 416 [dir=forward, style=invis]
  1875 [label = "S", style = filled, fillcolor = lightgoldenrodyellow]
  1876 [label = "O", style = filled, fillcolor = lightgoldenrodyellow]
  1877 [label = "B", style = filled, fillcolor = lightgoldenrodyellow]
  1878 [label = "C", style = filled, fillcolor = lightgoldenrodyellow]
  1879 [label = "+", style = filled, fillcolor = plum1]
  1880 [label = "#1", style = filled, fillcolor = lightblue]
}
`;

const NATIVE_2723_PLAIN = `graph 1 7.7083 4.8167
node 407 1.6806 3.95 1.0453 0.5 "@-407" filled ellipse black lightpink
node 1875 0.375 2.7167 0.75 0.5 S filled ellipse black lightgoldenrodyellow
node 1876 1.625 2.7167 0.75 0.5 O filled ellipse black lightgoldenrodyellow
node 408 4.4583 2.7167 1.0453 0.5 "@-408" filled ellipse black lightpink
node 1877 4.5972 1.4833 0.75 0.5 B filled ellipse black lightgoldenrodyellow
node 417 3.2083 1.4833 1.0453 0.5 "@-417" filled ellipse black lightpink
node 412 5.9444 1.4833 1.0453 0.5 "@-412" filled ellipse black lightpink
node 1878 5.25 0.25 0.75 0.5 C filled ellipse black lightgoldenrodyellow
node 1879 6.5 0.25 0.75 0.5 "+" filled ellipse black plum1
node 413 6 2.7167 1.0453 0.5 "@-413" filled ellipse black lightpink
node 1880 7.3333 1.4833 0.75 0.5 "#1" filled ellipse black lightblue
node 414 4.5694 3.95 1.0453 0.5 "@-414" filled ellipse black lightpink
node 415 6.1667 3.95 1.0453 0.5 "@-415" filled ellipse black lightpink
node 416 3.2778 3.95 1.0453 0.5 "@-416" filled ellipse black lightpink
edge 407 1875 4 1.4471 3.7206 1.2398 3.5291 0.93452 3.2472 0.7027 3.0332 Fun 1.296 3.3333 solid black
edge 407 1876 4 1.6696 3.6979 1.6621 3.5355 1.652 3.3166 1.6433 3.128 Arg 1.809 3.3333 solid black
edge 407 414 10 2.0683 4.1215 2.2677 4.2005 2.5172 4.2854 2.75 4.325 3.2125 4.4037 3.3486 4.4311 3.8056 4.325 3.9047 4.302 4.0058 4.2642 4.1007 4.2212 invis black
edge 407 415 10 2.0683 4.1215 2.2677 4.2005 2.5172 4.2854 2.75 4.325 3.2642 4.4125 4.583 4.4125 5.0972 4.325 5.2754 4.2947 5.4635 4.2378 5.6313 4.1774 invis black
edge 407 416 7 2.2032 3.9122 2.324 3.9072 2.452 3.9048 2.5712 3.9083 2.5785 3.9086 2.5859 3.9088 2.5934 3.909 invis black
edge 1875 1876 4 0.75586 2.7167 0.86662 2.7167 0.97739 2.7167 1.0882 2.7167 invis black
edge 408 1877 4 4.4858 2.4646 4.5045 2.3022 4.5297 2.0832 4.5514 1.8947 Fun 4.6915 2.1 solid black
edge 408 417 4 4.2349 2.4872 4.0441 2.3032 3.7667 2.0357 3.5484 1.8252 Arg 4.0965 2.1 solid black
edge 408 413 4 4.9823 2.7167 5.093 2.7167 5.2038 2.7167 5.3146 2.7167 invis black
edge 1877 417 4 4.2198 1.4833 4.1112 1.4833 4.0025 1.4833 3.8938 1.4833 invis black
edge 417 407 7 3.0724 1.7281 2.8546 2.096 2.4116 2.8364 2.0139 3.45 1.9861 3.4929 1.9564 3.5376 1.9267 3.5818 Fun 2.7733 2.7167 solid black
edge 417 416 4 3.2152 1.739 3.2272 2.1583 3.2518 3.0244 3.2664 3.535 Arg 3.4012 2.7167 solid black
edge 412 1878 4 5.8105 1.237 5.7103 1.063 5.5714 0.82183 5.4569 0.6231 Fun 5.8107 0.86667 solid black
edge 412 1879 4 6.0516 1.237 6.13 1.0669 6.238 0.83252 6.3283 0.63642 Arg 6.4232 0.86667 solid black
edge 412 1880 4 6.4707 1.4833 6.5794 1.4833 6.688 1.4833 6.7967 1.4833 invis black
edge 1878 1879 4 5.6309 0.25 5.7416 0.25 5.8524 0.25 5.9632 0.25 invis black
edge 413 412 4 5.989 2.4646 5.9815 2.3022 5.9714 2.0832 5.9628 1.8947 Fun 6.1285 2.1 solid black
edge 413 1880 4 6.2384 2.4872 6.4514 2.2946 6.7657 2.0105 7.0029 1.796 Arg 6.9373 2.1 solid black
edge 414 408 4 4.5475 3.6979 4.5325 3.5355 4.5123 3.3166 4.495 3.128 Fun 4.6751 3.3333 solid black
edge 414 413 4 4.8186 3.7261 5.0419 3.538 5.3724 3.2594 5.6271 3.0448 Arg 5.5641 3.3333 solid black
 Fun 0.61111 3.95 solid black
edge 415 414 4 5.6398 3.95 5.5172 3.95 5.3848 3.95 5.2564 3.95 Arg 5.3681 4.1083 solid black
edge 416 407 4 2.7509 3.95 2.6283 3.95 2.4959 3.95 2.3675 3.95 Fun 2.4792 4.1083 solid black
edge 416 415 7 3.5579 4.1659 3.7697 4.3149 4.0748 4.5001 4.3766 4.5806 4.8544 4.7079 5.3872 4.4692 5.7463 4.2499 Arg 4.5278 4.5667 solid black
stop
`;

/** The edge both native and the port give up, as each reports it at emit. */
const NATIVE_LOST_EDGE = 'Error: lost 415 407 edge\n';

describe('corpus 2723 (renders as native 16.1.1 does)', () => {
  afterEach(() => {
    agseterrf(null);
  });

  test('-Tplain equals native, and the lost edge is reported', () => {
    const pieces: string[] = [];
    agseterrf((m) => { pieces.push(m); });
    const out = render(parse(SRC_2723), 'plain', { engine: 'dot' });
    expect(out).toBe(NATIVE_2723_PLAIN);
    expect(pieces.join('')).toContain(NATIVE_LOST_EDGE);
  });
});
