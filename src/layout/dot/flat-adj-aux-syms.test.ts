// SPDX-License-Identifier: EPL-2.0

/**
 * make_flat_adj_edges' aux graph under setState: the label symbols (issue #131).
 *
 * C's setState nulls E_headlabel, E_taillabel, E_xlabel and N_xlabel while the
 * aux graph is laid out, so common_init_edge and common_init_node make no head,
 * tail or external label there. E_label stays bound (rebound from auxg), so the
 * centre label is made. These tests watch the port's real aux graph where it is
 * torn down (`cleanupCloneGraph`), and pin the probe inputs against native.
 *
 * Native observation that separates the two classes: a malformed HTML value is
 * reported once per make_label call. Native reports it twice for `label` (main
 * graph and aux graph) and once for `xlabel`, `headlabel`, `taillabel` and a
 * node `xlabel` (main graph only).
 *
 * @see lib/dotgen/dotsplines.c:setState
 * @see lib/common/utils.c:common_init_edge (525, 533, 539)
 * @see lib/common/utils.c:common_init_node (443)
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Graph } from '../../model/graph.js';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';
import { EDGE_LABEL, EDGE_XLABEL, HEAD_LABEL, TAIL_LABEL, NODE_XLABEL } from './rank.js';

/** What one aux graph held just before cleanupCloneGraph cleared it. */
interface AuxSnapshot {
  edgeLabels: number;
  edgeXlabels: number;
  headLabels: number;
  tailLabels: number;
  nodeXlabels: number;
  hasLabels: number;
}

const seen = vi.hoisted(() => ({ snapshots: [] as AuxSnapshot[] }));

vi.mock('./splines-clone.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./splines-clone.js')>();
  const count = (flags: boolean[]): number => flags.filter(Boolean).length;
  return {
    ...actual,
    cleanupCloneGraph: (auxg: Graph): void => {
      const nodes = [...auxg.nodes.values()];
      seen.snapshots.push({
        edgeLabels: count(auxg.edges.map((e) => e.info.label !== undefined)),
        edgeXlabels: count(auxg.edges.map((e) => e.info.xlabel !== undefined)),
        headLabels: count(auxg.edges.map((e) => e.info.head_label !== undefined)),
        tailLabels: count(auxg.edges.map((e) => e.info.tail_label !== undefined)),
        nodeXlabels: count(nodes.map((n) => n.info.xlabel !== undefined)),
        hasLabels: auxg.info.has_labels ?? 0,
      });
      actual.cleanupCloneGraph(auxg);
    },
  };
});

/** The port's output for `src`, and the stderr lines it prints on the way. */
function renderWithStderr(src: string, format: 'dot' | 'xdot' = 'dot'): { out: string; stderr: string[] } {
  const stderr: string[] = [];
  const sink = (...a: unknown[]): void => { stderr.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  return { out: render(parse(src), format), stderr };
}

beforeEach(() => { seen.snapshots.length = 0; });
afterEach(() => { vi.restoreAllMocks(); });

const SAME = '{rank=same; a; b}';
/** B1 of the probe: two port edges and a labelled port-less edge. */
const b1 = (pre: string, e1 = '', e3 = 'label=x'): string =>
  `digraph { ${pre} ${SAME} a:n -> b:n [${e1}]; a:s -> b:s; a -> b [${e3}]; }`;
const ANGLE = 'labelangle=45 labeldistance=2';

/** Inputs that set a symbol setState nulls, each on a flat-adjacent group. */
const LABEL_INPUTS: ReadonlyArray<{ name: string; src: string }> = [
  { name: 'edge xlabel on a port edge', src: b1('', 'xlabel=xl') },
  { name: 'edge xlabel on the labelled edge', src: b1('', '', 'label=x xlabel=xl') },
  { name: 'edge xlabel as a default', src: b1('edge [xlabel=xl];') },
  { name: 'long edge xlabel', src: b1('', 'xlabel="a very long external label"') },
  { name: 'HTML edge xlabel', src: b1('', 'xlabel=<<b>x</b>>') },
  { name: 'headlabel on a port edge', src: b1('', 'headlabel=HL') },
  { name: 'headlabel as a default', src: b1('edge [headlabel=HL];') },
  { name: 'headlabel with labelangle', src: b1('', `headlabel=HL ${ANGLE}`) },
  { name: 'taillabel on a port edge', src: b1('', 'taillabel=TL') },
  { name: 'taillabel as a default', src: b1('edge [taillabel=TL];') },
  { name: 'taillabel with labelangle', src: b1('', `taillabel=TL ${ANGLE}`) },
  { name: 'head and tail defaults', src: b1(`edge [headlabel=H taillabel=T ${ANGLE}];`) },
  { name: 'node xlabel on auxt', src: b1('a [xlabel=nx];') },
  { name: 'node xlabel on auxh', src: b1('b [xlabel=nx];') },
  { name: 'node xlabel as a default', src: b1('node [xlabel=nx];') },
  { name: 'HTML node xlabel', src: b1('a [xlabel=<<b>x</b>>];') },
  { name: 'rankdir=LR, every symbol', src: b1(
    'rankdir=LR; node [xlabel=nx]; edge [xlabel=xl headlabel=H taillabel=T];') },
];

const UNBOUND_BITS = NODE_XLABEL | EDGE_XLABEL | HEAD_LABEL | TAIL_LABEL;

/**
 * Native 16.1.0's aux graph for every input above, one make_flat_adj_edges
 * call each: an instrumented copy of the oracle's dot_layout plugin printed
 * `has_labels=1 label=1 xlabel=0 head=0 tail=0 nodexlabel=0` (GD_has_labels of
 * auxg and the count of aux objects with ED_label, ED_xlabel, ED_head_label,
 * ED_tail_label and ND_xlabel) just before cleanupCloneGraph, on all 17. The
 * plugin renders every input byte-identically to the oracle.
 */
const NATIVE_AUX: AuxSnapshot = {
  edgeLabels: 1, edgeXlabels: 0, headLabels: 0, tailLabels: 0, nodeXlabels: 0,
  hasLabels: EDGE_LABEL,
};

describe('make_flat_adj_edges aux graph: symbols setState nulls', () => {
  it.each(LABEL_INPUTS)('$name: the aux makes no xlabel, head or tail label', ({ src }) => {
    render(parse(src), 'dot');
    expect(seen.snapshots).toHaveLength(1);
    const [aux] = seen.snapshots;
    expect({
      edgeXlabels: aux?.edgeXlabels,
      headLabels: aux?.headLabels,
      tailLabels: aux?.tailLabels,
      nodeXlabels: aux?.nodeXlabels,
    }).toEqual({ edgeXlabels: 0, headLabels: 0, tailLabels: 0, nodeXlabels: 0 });
  });

  it.each(LABEL_INPUTS)('$name: auxg has none of the four label bits', ({ src }) => {
    render(parse(src), 'dot');
    expect(seen.snapshots.map((s) => s.hasLabels & UNBOUND_BITS)).toEqual([0]);
  });

  // E_label is rebound from auxg, not nulled: over-unbinding would drop it.
  it.each(LABEL_INPUTS)('$name: the aux still makes the centre label', ({ src }) => {
    render(parse(src), 'dot');
    expect(seen.snapshots.map((s) => ({ labels: s.edgeLabels, bit: s.hasLabels & EDGE_LABEL })))
      .toEqual([{ labels: 1, bit: EDGE_LABEL }]);
  });

  it.each(LABEL_INPUTS)('$name: the aux holds what native\'s aux holds', ({ src }) => {
    render(parse(src), 'dot');
    expect(seen.snapshots).toEqual([NATIVE_AUX]);
  });

  it('the main graph still makes and places every label', () => {
    const out = render(parse(b1(
      'a [xlabel=nx];', 'xlabel=xl headlabel=HL taillabel=TL')), 'dot');
    for (const attr of ['xlp=', 'head_lp=', 'tail_lp=', 'lp=']) expect(out).toContain(attr);
    // One xlp for the node, one for the edge.
    expect(out.match(/\bxlp=/g)).toHaveLength(2);
  });
});

const MISMATCH = ['Error: mismatched tag in line 1 ', '... x</i> ...'];
const BAD = '<<b>x</i>>';

describe('malformed HTML on a flat-adjacent group: one error per make_label', () => {
  // Native 16.1.0 stderr for each input (exit 1, stdout still written).
  it.each([
    { attr: 'xlabel', owner: 'in label of edge a -> b', src: b1('', `xlabel=${BAD}`) },
    { attr: 'headlabel', owner: 'in label of edge a -> b', src: b1('', `headlabel=${BAD}`) },
    { attr: 'taillabel', owner: 'in label of edge a -> b', src: b1('', `taillabel=${BAD}`) },
    { attr: 'node xlabel', owner: 'in label of node a', src: b1(`a [xlabel=${BAD}];`) },
  ])('$attr is parsed in the main graph only', ({ src, owner }) => {
    expect(renderWithStderr(src).stderr).toEqual([...MISMATCH, owner]);
  });

  // The control: `label` stays bound in the aux, so native parses it twice.
  it.each([
    { attr: 'edge label', owner: 'in label of edge a -> b', src: b1('', `label=${BAD}`) },
    { attr: 'node label', owner: 'in label of node a', src: b1(`a [label=${BAD}];`) },
  ])('$attr is parsed in the main graph and in the aux', ({ src, owner }) => {
    expect(renderWithStderr(src).stderr).toEqual([...MISMATCH, owner, ...MISMATCH, owner]);
  });
});

/** One probe input with native's `-Tdot` stdout and stderr lines. */
interface NativeCase {
  name: string;
  sym: string;
  src: string;
  dot: string;
  /** Native `-Txdot`, for the inputs whose stderr changed with the fix. */
  xdot?: string;
  stderr: string[];
}

/**
 * The issue-131 probe matrix: each of the ten symbols setState nulls, set on an
 * object of the group and as a default, on four flat-adjacent bases (B1 two
 * port edges and a labelled edge; B3 the w4 group; B4 rankdir=LR with one port
 * edge and a labelled edge; B5 rankdir=LR w4). Expected values are native
 * 16.1.0's (`dot -Kdot -Tdot`, GVBINDIR=/tmp/ghl, captured 2026-11-10).
 * Left out: B2 (rankdir=LR on B1, issue #172) and the two rankdir=LR inputs
 * with a two-line node label (issue #173).
 */
const FIXTURE = JSON.parse(readFileSync(
  new URL('./__fixtures__/flat-adj-aux-syms.native-16.1.json', import.meta.url), 'utf8',
)) as { cases: NativeCase[] };

/** Native warns "1 out of 2 exterior labels positioned."; the port has no such warning (#174). */
const STDERR_ISSUE_174: ReadonlySet<string> = new Set(['E_xlabel-def-noforce-B4']);

describe('issue-131 probe matrix renders as native', () => {
  it('holds every symbol setState nulls', () => {
    expect([...new Set(FIXTURE.cases.map((c) => c.sym))].sort()).toEqual([
      'E_fontcolor', 'E_headlabel', 'E_labelfontcolor', 'E_taillabel', 'E_xlabel',
      'N_fontcolor', 'N_nojustify', 'N_showboxes', 'N_style', 'N_xlabel', 'base',
    ]);
  });

  it.each(FIXTURE.cases)('$name: -Tdot equals native', ({ src, dot }) => {
    expect(renderWithStderr(src).out).toBe(dot);
  });

  it.each(FIXTURE.cases.filter((c) => c.xdot !== undefined))(
    '$name: -Txdot equals native', ({ src, xdot }) => {
      expect(renderWithStderr(src, 'xdot').out).toBe(xdot);
    });

  it.each(FIXTURE.cases.filter((c) => !STDERR_ISSUE_174.has(c.name)))(
    '$name: stderr equals native', ({ src, stderr }) => {
      expect(renderWithStderr(src).stderr).toEqual(stderr);
    });
});
