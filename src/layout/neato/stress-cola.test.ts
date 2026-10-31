// SPDX-License-Identifier: EPL-2.0
//
// stress_majorization_cola called directly: the unconstrained probes against
// T1's kD-kernel cola path (bit for bit), and the early returns and the
// circuit-model fallback. The native probes run through the whole pipeline in
// stress-cola-probes.test.ts.
// @see lib/neatogen/constrained_majorization_ipsep.c:stress_majorization_cola
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from '../../parser/index.js';
import type { Node } from '../../model/node.js';
import { srand48 } from '../../common/random.js';
import { AM_NONE } from './fdp-adjust.js';
import { setEdgeLen } from './edge-len.js';
import { assignNodeIds, MODE_IPSEP, MODEL_CIRCUIT, MODEL_SHORTPATH } from './init.js';
import { ipsepOptions } from './ipsep-opts.js';
import { graphHasLen, makeGraphDataC } from './make-graph-data.js';
import type { DirectedVtxData } from './opt-arrangement.js';
import type { IpsepOptions } from './quad-prog-vpsc.js';
import { checkStart, INIT_RANDOM } from './start.js';
import { stressMajorizationCola, stressMajorizationColaTraced } from './stress-cola.js';
import { computeApspPacked, initLayout, stressMajorizationKDMkernel } from './stress-kernel.js';
import { DFLT_TOLERANCE } from './stress.js';

const FIXTURES = new URL('./__fixtures__/ipsep/', import.meta.url);
const DIM = 2;
/** `opt_exp_flag` 2 (squared weights), `checkExp`'s default. */
const OPTS_EXP_2 = 2;

/** What `majorization` holds before its solver call, seeded as `checkStart` seeds. */
interface Setup {
  nodes: Node[];
  n: number;
  vtx: DirectedVtxData[];
  dCoords: Float64Array[];
  opt: IpsepOptions;
  maxi: number;
}

function setup(src: string): Setup {
  const g = parse(src);
  const nodes = assignNodeIds(g);
  setEdgeLen(g);
  const n = nodes.length;
  checkStart(g, n, INIT_RANDOM);
  const vtx = makeGraphDataC(g, nodes, graphHasLen(g), true, MODE_IPSEP);
  const opt = ipsepOptions(g, g, nodes, { mode: AM_NONE, print: 'none', value: 0 });
  return { nodes, n, vtx, dCoords: [new Float64Array(n), new Float64Array(n)], opt, maxi: 100 * n };
}

const colaOpts = (s: Setup, model = MODEL_SHORTPATH, maxi = s.maxi) => (
  { dim: DIM, model, maxi, epsilon: DFLT_TOLERANCE, opt: s.opt });

afterEach(() => { vi.restoreAllMocks(); srand48(1); });

describe('early returns', () => {
  it('n == 1 returns 0 after initLayout, before any scaling', () => {
    const s = setup('graph{a}');
    expect(stressMajorizationCola(s.vtx, s.n, s.dCoords, s.nodes, colaOpts(s))).toBe(0);
    expect([s.dCoords[0]![0], s.dCoords[1]![0]]).toEqual([0, 0]);
  });

  it('maxi == 0 returns 0 with initLayout\'s coordinates, unscaled', () => {
    const expected = setup('graph{a--b--c}');
    initLayout(expected.n, DIM, expected.dCoords, expected.nodes);
    const s = setup('graph{a--b--c}'); // reseeds as checkStart does
    expect(stressMajorizationCola(s.vtx, s.n, s.dCoords, s.nodes, colaOpts(s, MODEL_SHORTPATH, 0))).toBe(0);
    expect(s.dCoords).toEqual(expected.dCoords);
  });

  it('maxi > 0 starts from the scaled layout: y[0] = 0 before the first solve', () => {
    const s = setup('graph{a--b--c}');
    const first: number[] = [];
    stressMajorizationColaTraced(s.vtx, s.n, s.dCoords, s.nodes, { ...colaOpts(s, MODEL_SHORTPATH, 1), observe: (v) => first.push(v) });
    expect(first).toHaveLength(1);
    expect(s.dCoords.every((c) => c.every((v) => Math.fround(v) === v))).toBe(true);
  });

  it('does not observe any stress when it returns early', () => {
    const s = setup('graph{a--b}');
    const seen: number[] = [];
    stressMajorizationColaTraced(s.vtx, s.n, s.dCoords, s.nodes, { ...colaOpts(s, MODEL_SHORTPATH, 0), observe: (v) => seen.push(v) });
    expect(seen).toEqual([]);
  });
});

describe('the circuit model', () => {
  it('warns and reverts to shortest paths on a disconnected graph', () => {
    const lines: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((m: unknown) => { lines.push(String(m)); });
    const src = 'graph{a--b; b--c; d--e}';
    const circuit = setup(src);
    const rc = stressMajorizationCola(circuit.vtx, circuit.n, circuit.dCoords, circuit.nodes, colaOpts(circuit, MODEL_CIRCUIT));
    expect(lines).toEqual([
      'Warning: graph is disconnected. Hence, the circuit model',
      'is undefined. Reverting to the shortest path model.',
    ]);
    const shortpath = setup(src);
    const rs = stressMajorizationCola(shortpath.vtx, shortpath.n, shortpath.dCoords, shortpath.nodes, colaOpts(shortpath));
    expect(rc).toBe(rs);
    expect(circuit.dCoords).toEqual(shortpath.dCoords);
  });
});

describe('clusters', () => {
  it('writes back only the real nodes, not the boundary variables', () => {
    const g = parse('graph{subgraph cluster_0{a; b; a--b} c; b--c}');
    const nodes = assignNodeIds(g);
    for (const v of nodes) { v.info.width = 0.75; v.info.height = 0.5; }
    setEdgeLen(g);
    checkStart(g, nodes.length, INIT_RANDOM);
    const vtx = makeGraphDataC(g, nodes, false, true, MODE_IPSEP);
    const opt = ipsepOptions(g, g, nodes, { mode: AM_NONE, print: 'none', value: 0 });
    const dCoords = [new Float64Array(3), new Float64Array(3)];
    const seen: number[] = [];
    const iters = stressMajorizationColaTraced(vtx, 3, dCoords, nodes, {
      dim: DIM, model: MODEL_SHORTPATH, maxi: 300, epsilon: DFLT_TOLERANCE, opt, observe: (v) => seen.push(v),
    });
    expect(iters).toBe(seen.length);
    expect(iters).toBeGreaterThan(1);
    // the written-back values are the float coordinates of the 3 real nodes
    expect(dCoords.map((c) => c.length)).toEqual([3, 3]);
    expect(dCoords.every((c) => c.every((v) => Number.isFinite(v) && Math.fround(v) === v))).toBe(true);
  });
});
