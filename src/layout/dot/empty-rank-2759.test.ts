// SPDX-License-Identifier: EPL-2.0
//
// Corpus 2759 and 2759_1 (upstream issue 2759). A node in a `rank=same`
// subgraph is taken out of the cluster that also lists it, which leaves the
// layout with an empty rank. Graphviz 16.1.0 read that rank's leader
// (`GD_rank(g)[r].v[0]`) and crashed; 16.1.1 tests it for NULL in
// `make_LR_constraints`, `set_ycoords`, `dot_compute_bb` and the self-loop
// `sizey` of `dot_splines_` (upstream d49e3a529, 9fca64d0f, 8e06a6261,
// ca3353d80, 1a77ac9df). Native 16.1.1 `dot -Tplain` exits 0 on both inputs.
// Before issue #160 the port threw `InternalError` (reading `info` of null in
// `setYcoordsInitial`) where native draws them.
//
// NATIVE_*_PLAIN are native 16.1.1's stdout (`GVBINDIR=/tmp/ghl1611`), captured
// by issue #160. Native's stderr is, for both inputs,
//   Warning: Act000 was already in a rankset, deleted from cluster %1
//   Warning: Act004 was already in a rankset, deleted from cluster %1
// The port prints the same two warnings with an empty graph name where native
// has `%1` (issue #225), so only the part before the name is checked here; pin
// the whole line when #225 lands.
// @see https://gitlab.com/graphviz/graphviz/-/issues/2759
// @see lib/dotgen/position.c:set_ycoords, dot_compute_bb, make_LR_constraints
// @see lib/dotgen/dotsplines.c:dot_splines_
import { afterEach, describe, expect, test } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';
import { agseterrf } from '../../common/agerr.js';

/** Verbatim copy of graphviz tests/2759.dot (the `\t` is a tab in the file). */
const SRC_2759 = `digraph{0[0=0]0->0[label=0]{subgraph cluster{{0[0=0]}A00000000{Act000[0=0]}A\tAct004->A00000000}}{Act000->Act004[0=0]rank=same}}
`;

/** Verbatim copy of graphviz tests/2759_1.dot. */
const SRC_2759_1 = `// based on  https://gitlab.com/graphviz/graphviz/-/work_items/2759
digraph {
  0 -> 0 [label=0]
  {
    subgraph cluster {
      A00000000
      Act000 
      A Act004 -> A00000000
    }
  }
  {Act000 -> Act004 rank=same}
}
`;

const NATIVE_2759_PLAIN = `graph 1 3.6453 1.4917
node 0 0.59722 0.11667 0.75 0.5 0 solid ellipse black lightgrey
node A00000000 1.5139 0.47778 1.5733 0.5 A00000000 solid ellipse black lightgrey
node Act000 3.0972 1.4917 1.0963 0.5 Act000 solid ellipse black lightgrey
node A 1.9444 0.11667 0.75 0.5 A solid ellipse black lightgrey
node Act004 1.5139 1.4917 1.0963 0.5 Act004 solid ellipse black lightgrey
edge 0 0 7 0.9506 0.20959 1.0976 0.216 1.2222 0.18503 1.2222 0.11667 1.2222 0.07501 1.1759 0.047236 1.1065 0.033344 0 1.2708 0.11667 solid black
edge Act000 Act004 4 2.5445 1.4917 2.4369 1.4917 2.3294 1.4917 2.2219 1.4917 solid black
edge Act004 A00000000 4 1.5139 1.2391 1.5139 1.1337 1.5139 1.007 1.5139 0.88805 solid black
stop
`;

const NATIVE_2759_1_PLAIN = `graph 1 4.2565 1.4917
node 0 0.375 0.11667 0.75 0.5 0 solid ellipse black lightgrey
node A00000000 2.125 0.47778 1.5733 0.5 A00000000 solid ellipse black lightgrey
node Act000 3.7083 1.4917 1.0963 0.5 Act000 solid ellipse black lightgrey
node A 2.125 0.11667 0.75 0.5 A solid ellipse black lightgrey
node Act004 2.125 1.4917 1.0963 0.5 Act004 solid ellipse black lightgrey
edge 0 0 7 0.72838 0.20959 0.87539 0.216 1 0.18503 1 0.11667 1 0.07501 0.95373 0.047236 0.88431 0.033344 0 1.0486 0.11667 solid black
edge Act000 Act004 4 3.1556 1.4917 3.0481 1.4917 2.9405 1.4917 2.833 1.4917 solid black
edge Act004 A00000000 4 2.125 1.2391 2.125 1.1337 2.125 1.007 2.125 0.88805 solid black
stop
`;

/** The two nodes native and the port both take out of the cluster. */
const RANKSET_WARNINGS = [
  'Act000 was already in a rankset, deleted from cluster',
  'Act004 was already in a rankset, deleted from cluster',
];

describe('corpus 2759 (an empty rank renders as native 16.1.1 does)', () => {
  afterEach(() => {
    agseterrf(null);
  });

  test.each([
    ['2759', SRC_2759, NATIVE_2759_PLAIN],
    ['2759_1', SRC_2759_1, NATIVE_2759_1_PLAIN],
  ])('%s -Tplain equals native', (_id, src, native) => {
    const pieces: string[] = [];
    agseterrf((m) => { pieces.push(m); });
    const out = render(parse(src), 'plain', { engine: 'dot' });
    expect(out).toBe(native);
    const stderr = pieces.join('');
    for (const w of RANKSET_WARNINGS) expect(stderr).toContain(w);
  });
});
