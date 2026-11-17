// SPDX-License-Identifier: EPL-2.0
//
// Corpus 1314, 2758, 2776_1 and 2781_1 (upstream issues 1314, 2758, 2776,
// 2781). Each input makes one adjacent-pair aux edge in make_LR_constraints
// longer than INT_MAX: a huge fontsize (1314, 2776_1), a huge nodesep (2758),
// or a 1e24-inch node under rankdir=LR (2781_1). Graphviz 16.1.0 clamped the
// length and carried on. 16.1.1 prints `Edge length %f larger than maximum
// 2147483647 allowed.` / `Check for overwide node(s).`, fails dot_position and
// the layout (upstream f86899fcc and its plumbing commits; issue #162), exits 1
// and writes the graph unpositioned: `graph 1 0 0`, nodes at their rank-phase
// coordinates, edges as bare style lines.
//
// These were red before #162: the port clamped silently and laid the graphs
// out 7e9-1e26 pt across.
//
// NATIVE_*_PLAIN are native 16.1.1's stdout (`GVBINDIR=/tmp/ghl1611 dot -Kdot
// -Tplain tests/<id>.dot`, exit 1), captured by issue #162. EDGE_LENGTH_* are
// the values in native's stderr. Corpus 2781 is the same graph as 2781_1 with
// a `0h` token that adds a parse warning, so one of the two is pinned.
// Native's stderr on 2758 also carries two `syntax ambiguity` warnings, which
// the port prints on console.warn with `input` for the file path.
// @see https://gitlab.com/graphviz/graphviz/-/issues/2781
// @see https://gitlab.com/graphviz/graphviz/-/issues/2776
// @see lib/dotgen/position.c:make_aux_edge, make_LR_constraints, dot_position
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';
import { layoutToMincross } from '../../../test/helpers/dot-position.js';
import { dotPosition } from './position.js';

/** Verbatim copy of graphviz tests/1314.dot. */
const SRC_1314 = `digraph {
  s [   fontsize = "991836031967s8"]
n0}
`;

const NATIVE_1314_PLAIN = `graph 1 0 0
node s 0 1.1689e+10 7.5814e+09 2.3378e+10 s solid ellipse black lightgrey
node n0 0 1.1689e+10 0.75 0.5 n0 solid ellipse black lightgrey
stop
`;

/** Verbatim copy of graphviz tests/2758.dot. */
const SRC_2758 = `digraph{nodesep=40000000d{rank=same 0[0=0][0=0]edge[0=0headport=n]00->1[0=0]}}
`;

const NATIVE_2758_PLAIN = `graph 1 0 0
node d 0 0.25 0.75 0.5 d solid ellipse black lightgrey
node 0 0 0.25 0.75 0.5 0 solid ellipse black lightgrey
node 00 0 0.25 0.75 0.5 00 solid ellipse black lightgrey
node 1 0.013889 0.25 0.75 0.5 1 solid ellipse black lightgrey
 solid black
stop
`;

/** Verbatim copy of graphviz tests/2776_1.dot. */
const SRC_2776_1 = `// based on https://gitlab.com/graphviz/graphviz/-/work_items/2776

digraph {
  {   }
  [0="" 0=0]
  Ie0ffa00600d60e0db000000bf00fa0d0 -> Se0ffa00d00d60e0db000000bf00fa0d0 
  0 -> Ie0ffa00600d60e0db000000bf00fa0d0 
  S -> Se0ffa00d00d60e0db000000bf00fa0d0 [ fontsize=600000000000000000 label="0" ] 
}
`;

const NATIVE_2776_1_PLAIN = `graph 1 0 0
node Ie0ffa00600d60e0db000000bf00fa0d0 0.013889 1e+16 4.4484 0.5 Ie0ffa00600d60e0db000000bf00fa0d0 solid ellipse black lightgrey
node Se0ffa00d00d60e0db000000bf00fa0d0 0 0.25 4.5083 0.5 Se0ffa00d00d60e0db000000bf00fa0d0 solid ellipse black lightgrey
node 0 0 1e+16 0.75 0.5 0 solid ellipse black lightgrey
node S 0 1e+16 0.75 0.5 S solid ellipse black lightgrey
 solid black
 solid black
 0 0 0 solid black
stop
`;

/** Verbatim copy of graphviz tests/2781_1.dot. */
const SRC_2781_1 = `// from https://gitlab.com/graphviz/graphviz/-/work_items/2781
digraph {
  rankdir="LR"
  node[ height="1000000000000000000000000" ]
  0 -> 00  [0=0]
  {rank=same; 056; 006}
  056 -> 006  [label="0"]
  006 -> 056  [label="0"]
  0 -> 6
}
`;

const NATIVE_2781_1_PLAIN = `graph 1 0 0
node 0 0 1.6389 0.75 1e+24 0 solid ellipse black lightgrey
node 00 0.013889 0.375 0.75 1e+24 00 solid ellipse black lightgrey
node 056 0.013889 1.6389 0.75 1e+24 056 solid ellipse black lightgrey
node 006 0 1.6389 0.75 1e+24 006 solid ellipse black lightgrey
node 6 0 0.375 0.75 1e+24 6 solid ellipse black lightgrey
 solid black
 solid black
 0 0 0 solid black
 0 0 0 solid black
stop
`;

const EDGE_LENGTH_1314 = '272931242864.483337';
/** INT_MAX + 54: the int-saturated nodesep plus two 54-pt nodes' half widths. */
const EDGE_LENGTH_2758 = '2147483701.000000';
const EDGE_LENGTH_2776_1 = '300000000000000000.000000';
const EDGE_LENGTH_2781_1 = '71999999999999994497073152.000000';

/** The line `agerrorf` writes for a refused length, as native prints it. */
function tooLong(value: string): string {
  return `Error: Edge length ${value} larger than maximum 2147483647 allowed.\nCheck for overwide node(s).`;
}

const CASES: [string, string, string, string][] = [
  ['1314', SRC_1314, NATIVE_1314_PLAIN, EDGE_LENGTH_1314],
  ['2758', SRC_2758, NATIVE_2758_PLAIN, EDGE_LENGTH_2758],
  ['2776_1', SRC_2776_1, NATIVE_2776_1_PLAIN, EDGE_LENGTH_2776_1],
  ['2781_1', SRC_2781_1, NATIVE_2781_1_PLAIN, EDGE_LENGTH_2781_1],
];

let stderr: MockInstance<(...args: unknown[]) => void>;
let warnings: MockInstance<(...args: unknown[]) => void>;

beforeEach(() => {
  stderr = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  warnings = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  stderr.mockRestore();
  warnings.mockRestore();
});

describe('an aux edge longer than INT_MAX fails the layout as native 16.1.1 does', () => {
  test.each(CASES)('%s -Tplain equals native', (_id, src, native) => {
    expect(render(parse(src), 'plain', { engine: 'dot' })).toBe(native);
  });

  test.each(CASES)('%s prints native\'s Edge length error once', (_id, src, _native, value) => {
    render(parse(src), 'plain', { engine: 'dot' });
    expect(stderr.mock.calls).toEqual([[tooLong(value)]]);
  });

  test.each(CASES)('%s fails dot_position before the x-coordinate pass', (_id, src) => {
    const g = layoutToMincross(src);
    expect(dotPosition(g)).toBe(-1);
    // C returns ahead of `rank(g, 2, ...)`; the port marks the graph as
    // carrying x coordinates in ND_rank just before that call.
    expect(g.info.rankIsXCoord).not.toBe(true);
  });
});
