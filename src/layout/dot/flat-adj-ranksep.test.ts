// SPDX-License-Identifier: EPL-2.0

/**
 * The end boxes of a side-port edge with an odd `ranksep` (issue #173).
 *
 * `GD_ranksep` is an `int` (lib/common/types.h:335), so the
 * `GD_ranksep(agraphof(n))/2` that beginpath and endpath add to a side-port
 * end box is integer division. The flat-adjacent aux graph of a labelled
 * graph has `ranksep` 9: the root's 36 is halved by edgelabel_ranks to 18,
 * the aux copies it, and its own edgelabel_ranks halves it again. Native's end
 * box is therefore 4 high where a floating-point half makes it 4.5; with the
 * taller box splinefits accepts a first tangent that native halves, and the
 * last Bezier piece of the edge differs.
 *
 * The first inputs are `rankdir=LR` flat-adjacent groups with a side port and
 * an edge label, where the aux layout routes a side-port edge. The `main-*`
 * inputs put an odd `ranksep` on the main graph and reach each of the six
 * expressions in turn.
 *
 * @see lib/common/splines.c:beginpath, endpath
 * @see lib/common/types.h:Agraphinfo_t (int ranksep)
 * @see lib/dotgen/rank.c:edgelabel_ranks
 * @see lib/dotgen/dotsplines.c:make_flat_adj_edges
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';

interface Probe { name: string; src: string; native: string }

// Native 16.1.0 `dot -Kdot -Tplain` with GVBINDIR=/tmp/ghl
// (plans/issue-173-ranksep-int-division/harness/native/*.plain; exit 0, empty
// stderr).
const PLAIN_PROBES: readonly Probe[] = [
  {
    name: 'repro-w1.2.gv: a 1.2in wide tail',
    src: `digraph { rankdir=LR; {rank=same; a [width=1.2]; b} a:n -> b:n; a -> b [label=x]; }`,
    native: `graph 1 1.3147 1.5399
node a 0.6 1.25 1.2 0.5 a solid ellipse black lightgrey
node b 0.6 0.25 0.75 0.5 b solid ellipse black lightgrey
edge a b 16 0.46096 0.57574 0.41288 0.57902 0.36408 0.58786 0.33611 0.63333 0.28178 0.72166 0.26861 0.78794 0.33611 0.86667 0.589 1.1616 0.94711 0.70508 1.2 1 1.3466 1.171 1.3574 1.3457 1.2 1.5068 1.1767 1.5307 0.6 1.5541 0.6 1.5207 solid black
edge a b 4 0.6 0.66022 0.6 0.77398 0.6 0.89454 0.6 0.99579 x 0.64861 0.75 solid black
stop
`,
  },
  {
    name: 'repro-w1.25.gv: a 1.25in wide tail',
    src: `digraph { rankdir=LR; {rank=same; a [width=1.25]; b} a:n -> b:n; a -> b [label=x]; }`,
    native: `graph 1 1.3641 1.5375
node a 0.625 1.25 1.25 0.5 a solid ellipse black lightgrey
node b 0.625 0.25 0.75 0.5 b solid ellipse black lightgrey
edge a b 16 0.48596 0.57574 0.43788 0.57902 0.38908 0.58786 0.36111 0.63333 0.30678 0.72166 0.29344 0.78809 0.36111 0.86667 0.6218 1.1694 0.98932 0.6973 1.25 1 1.396 1.1696 1.4065 1.3435 1.25 1.5035 1.2257 1.5283 0.625 1.5521 0.625 1.5174 solid black
edge a b 4 0.625 0.66022 0.625 0.77398 0.625 0.89454 0.625 0.99579 x 0.67361 0.75 solid black
stop
`,
  },
  {
    name: 'repro-w1.3.gv: a 1.3in wide tail',
    src: `digraph { rankdir=LR; {rank=same; a [width=1.3]; b} a:n -> b:n; a -> b [label=x]; }`,
    native: `graph 1 1.4143 1.539
node a 0.65 1.25 1.3 0.5 a solid ellipse black lightgrey
node b 0.65 0.25 0.75 0.5 b solid ellipse black lightgrey
edge a b 16 0.51096 0.57574 0.46288 0.57902 0.41408 0.58786 0.38611 0.63333 0.33178 0.72166 0.31828 0.78822 0.38611 0.86667 0.65459 1.1772 1.0315 0.68951 1.3 1 1.4465 1.1695 1.4567 1.3439 1.3 1.504 1.2747 1.5298 0.65 1.554 0.65 1.5179 solid black
edge a b 4 0.65 0.66022 0.65 0.77398 0.65 0.89454 0.65 0.99579 x 0.69861 0.75 solid black
stop
`,
  },
  {
    name: 'repro-w1.4.gv: a 1.4in wide tail',
    src: `digraph { rankdir=LR; {rank=same; a [width=1.4]; b} a:n -> b:n; a -> b [label=x]; }`,
    native: `graph 1 1.5145 1.5402
node a 0.7 1.25 1.4 0.5 a solid ellipse black lightgrey
node b 0.7 0.25 0.75 0.5 b solid ellipse black lightgrey
edge a b 16 0.56096 0.57574 0.51288 0.57902 0.46408 0.58786 0.43611 0.63333 0.38178 0.72166 0.36799 0.78847 0.43611 0.86667 0.72019 1.1928 1.1159 0.67392 1.4 1 1.547 1.1687 1.5566 1.3436 1.4 1.5034 1.3728 1.5312 0.7 1.5562 0.7 1.5173 solid black
edge a b 4 0.7 0.66022 0.7 0.77398 0.7 0.89454 0.7 0.99579 x 0.74861 0.75 solid black
stop
`,
  },
  {
    name: 'repro-multiline.gv: a two-line tail label',
    src: `digraph { rankdir=LR; {rank=same; a [label="line one\\lline two"]; b} a:n -> b:n; a -> b [label=x]; }`,
    native: `graph 1 1.3945 1.8512
node a 0.60392 1.4028 1.2078 0.8171 "line one\\lline two" solid ellipse black lightgrey
node b 0.60392 0.25 0.75 0.5 b solid ellipse black lightgrey
edge a b 16 0.46496 0.57406 0.41689 0.5769 0.36808 0.5853 0.34003 0.63045 0.28531 0.71854 0.27237 0.78519 0.34003 0.86378 0.5945 1.1594 0.95337 0.69865 1.2078 0.99423 1.4467 1.2717 1.4637 1.5562 1.2078 1.818 1.1844 1.842 0.60392 1.8655 0.60392 1.8319 solid black
edge a b 4 0.60392 0.6624 0.60392 0.76843 0.60392 0.88299 0.60392 0.98909 x 0.65253 0.74711 solid black
stop
`,
  },
  {
    name: 'two-labelled.gv: two labelled side-port edges',
    src: `digraph { rankdir=LR; {rank=same; a; b} a:n -> b:n [label=x]; a:s -> b:s [label=y]; }`,
    native: `graph 1 1.2207 1.5825
node a 0.73132 1.2893 0.75 0.5 a solid ellipse black lightgrey
node b 0.73132 0.28928 0.75 0.5 b solid ellipse black lightgrey
edge a b 16 0.59228 0.61502 0.5442 0.6183 0.4954 0.62715 0.46743 0.67261 0.4131 0.76094 0.40202 0.82548 0.46743 0.90595 0.6504 1.131 0.92336 0.81419 1.1063 1.0393 1.2477 1.2133 1.2619 1.3823 1.1063 1.5437 1.0774 1.5738 0.73132 1.5993 0.73132 1.5576 x 0.51604 0.78928 solid black
edge a b 16 0.88695 0 0.98297 0.0037546 1.0907 0.018642 1.1063 0.034827 1.2619 0.19627 1.2546 0.37111 1.1063 0.53928 0.79361 0.89398 0.36348 0.31792 0.050767 0.67261 -0.017814 0.7504 -0.015138 0.82588 0.050767 0.90595 0.24664 1.1439 0.73132 0.73106 0.73132 1.0393 y 0.099378 0.78928 solid black
stop
`,
  },
];

// One input per changed expression, with the odd `ranksep` on the main
// graph: 0.32in is 23 points; 0.07in is 5 and 0.25in is 18, which
// edgelabel_ranks halves to 3 and 9. Same provenance (harness/native/main-*).
const MAIN_PROBES: readonly Probe[] = [
  {
    name: 'main-begin-top-right.gv: beginpath, regular edge, top port, going right',
    src: `digraph { ranksep=0.32; a [width=2]; a:n -> b; }`,
    native: `graph 1 2.1048 1.4078
node a 1 1.0694 2 0.5 a solid ellipse black lightgrey
node b 1 0.25 0.75 0.5 b solid ellipse black lightgrey
edge a b 10 1 1.3396 1 1.4508 1.922 1.4049 2 1.3257 2.158 1.1655 2.1141 1.0134 2 0.81944 1.8876 0.62848 1.6833 0.49845 1.4885 0.41251 solid black
stop
`,
  },
  {
    name: 'main-begin-top-left.gv: beginpath, regular edge, top port, going left',
    src: `digraph { ranksep=0.32; a [width=3]; a:nw -> b:se; }`,
    native: `graph 1 3.1118 1.4021
node a 1.6118 1.0694 3 0.5 a solid ellipse black lightgrey
node b 1.1534 0.25 0.75 0.5 b solid ellipse black lightgrey
edge a b 16 1.3616 1.3335 1.2634 1.4317 0.20943 1.4184 0.11177 1.3196 -0.044542 1.1616 -0.027058 0.99306 0.11177 0.81944 0.51486 0.31535 1.1254 1.0041 1.5284 0.5 1.6557 0.34082 1.6664 0.19142 1.5284 0.041431 1.5253 0.038017 1.5221 0.034771 1.5189 0.031697 solid black
stop
`,
  },
  {
    name: 'main-end-bottom-left.gv: endpath, regular edge, bottom port, going left',
    src: `digraph { ranksep=0.32; b [width=3]; a -> b:sw; }`,
    native: `graph 1 3.1062 1.406
node b 1.6062 0.33656 3 0.5 b solid ellipse black lightgrey
node a 1.3562 1.156 0.75 0.5 a solid ellipse black lightgrey
edge a b 10 0.99063 1.0889 0.69614 1.0247 0.30035 0.88525 0.10624 0.58656 -0.014892 0.40017 -0.050072 0.24445 0.10624 0.086389 0.18482 0.0069299 0.88264 -0.017231 1.2034 0.027531 solid black
stop
`,
  },
  {
    name: 'main-end-bottom-right.gv: endpath, regular edge, bottom port, going right',
    src: `digraph { ranksep=0.07; a -> b:s [label=x]; }`,
    native: `graph 1 0.87161 1.4655
node a 0.375 1.2155 0.75 0.5 a solid ellipse black lightgrey
node b 0.375 0.25994 0.75 0.5 b solid ellipse black lightgrey
edge a b 7 0.55059 0.99094 0.74919 0.72652 1.0129 0.27504 0.75 0.005488 0.75 0.005488 0.63462 0.0025853 0.53186 0 x 0.823 0.73772 solid black
stop
`,
  },
  {
    name: 'main-flat-begin.gv: beginpath, flat edge, bottom port under a top side',
    src: `digraph { ranksep=0.25; {rank=same; a; b; c} a:s -> c:n [label=x]; a -> b -> c; }`,
    native: `graph 1 3.25 1.0311
node a 0.375 0.28943 0.75 0.5 a solid ellipse black lightgrey
node b 1.625 0.28943 0.75 0.5 b solid ellipse black lightgrey
node c 2.875 0.28943 0.75 0.5 c solid ellipse black lightgrey
edge a b 4 0.75586 0.28943 0.86662 0.28943 0.97739 0.28943 1.0882 0.28943 solid black
edge a c 13 0.375 0.021082 0.375 -0.020634 0.71298 0.020187 0.75 0.039425 0.9998 0.16926 0.93035 0.35031 1.1389 0.53943 1.3093 0.69393 1.3555 0.75187 1.5764 0.81581 1.6941 0.84988 2.5686 0.92266 2.8122 0.68345 x 1.625 0.78109 solid black
edge b c 4 2.0059 0.28943 2.1166 0.28943 2.2274 0.28943 2.3382 0.28943 solid black
stop
`,
  },
  {
    name: 'main-flat-end.gv: endpath, flat edge, bottom port under a top side',
    src: `digraph { rankdir=BT; ranksep=0.07; {rank=same; a; b; c} a:s -> c:n [label=x]; a -> b -> c; }`,
    native: `graph 1 3.25 0.98618
node a 0.375 0.72778 0.75 0.5 a solid ellipse black lightgrey
node b 1.625 0.72778 0.75 0.5 b solid ellipse black lightgrey
node c 2.875 0.72778 0.75 0.5 c solid ellipse black lightgrey
edge a b 4 0.75586 0.72778 0.86662 0.72778 0.97739 0.72778 1.0882 0.72778 solid black
edge a c 13 0.375 0.47778 0.375 0.18326 1.3899 0.1338 1.6736 0.21296 1.8925 0.27406 1.944 0.32371 2.1111 0.47778 2.3126 0.66358 2.2303 0.8488 2.4722 0.97778 2.4722 0.97778 2.6032 0.9823 2.7158 0.98618 x 1.625 0.25 solid black
edge b c 4 2.0059 0.72778 2.1166 0.72778 2.2274 0.72778 2.3382 0.72778 solid black
stop
`,
  },
];

// Native 16.1.0 `dot -Kdot -Tdot` (harness/native/two-labelled.dot): the
// bounding box grows with the last Bezier piece, so `bb` is pinned too.
const DOT_PROBES: readonly Probe[] = [
  {
    name: 'two-labelled.gv: two labelled side-port edges',
    src: `digraph { rankdir=LR; {rank=same; a; b} a:n -> b:n [label=x]; a:s -> b:s [label=y]; }`,
    native: `digraph {
	graph [bb="0,0,87.892,113.94",
		rankdir=LR
	];
	node [label="\\N"];
	{
		graph [rank=same];
		a	[height=0.5,
			pos="52.655,92.828",
			width=0.75];
		b	[height=0.5,
			pos="52.655,20.828",
			width=0.75];
	}
	a:n -> b:n	[label=x,
		lp="37.155,56.828",
		pos="s,52.655,38.828 42.644,44.281 39.182,44.518 35.669,45.154 33.655,48.428 29.743,54.788 28.946,59.434 33.655,65.228 46.828,81.435 \\
66.482,58.622 79.655,74.828 89.837,87.355 90.856,99.525 79.655,111.15 77.572,113.31 52.655,115.15 52.655,112.15"];
	a:s -> b:s	[label=y,
		lp="7.1552,56.828",
		pos="s,52.655,1.5075 63.861,0 70.774,0.27033 78.532,1.3422 79.655,2.5075 90.856,14.131 90.331,26.72 79.655,38.828 57.14,64.367 26.171,\\
22.89 3.6552,48.428 -1.2826,54.029 -1.0899,59.463 3.6552,65.228 17.758,82.362 52.655,52.636 52.655,74.828"];
}
`,
  },
];

describe('beginpath and endpath halve an odd ranksep as int (#173)', () => {
  it.each(PLAIN_PROBES)('$name equals native -Tplain', ({ src, native }) => {
    expect(render(parse(src), 'plain', { engine: 'dot' })).toBe(native);
  });

  it.each(MAIN_PROBES)('$name equals native -Tplain', ({ src, native }) => {
    expect(render(parse(src), 'plain', { engine: 'dot' })).toBe(native);
  });

  it.each(DOT_PROBES)('$name equals native -Tdot', ({ src, native }) => {
    expect(render(parse(src), 'dot', { engine: 'dot' })).toBe(native);
  });
});
