// SPDX-License-Identifier: EPL-2.0
//
// stress_majorization_cola on the T0 ipsep probes (part-7 AD-4), through the
// whole neato pipeline. The driver is not wired in yet (T10), so this file
// swaps it in for the kD kernel's cola path and lets constrained inputs past
// the `unsupported` guard; everything else is the production pipeline.
// Native: `<case>.trace` (`dot -v`, the stress each iteration as `%.3f`),
// `<case>.xdot` and `<case>.xdot.stderr`.
//
// Native is not deterministic on the directed-edge probes: the VPSC solver's
// block order follows heap addresses (follow-up 106). In 40 native runs
// dired-true and start-self-dired gave 2 distinct traces, dired-hier 3,
// dired-hier-sep 4 and big-dired 21, the native runs departing from each
// other at iteration 2-3. The port's trace and xdot equal one native run's
// byte for byte on the first four; on big-dired its stress stays within
// 0.004 of the nearest native run (native's own spread is 0.021) and every
// node within one printed unit (0.01) of the fixture, as native runs are.
// Those probes are held to native's variation instead of the fixture's run.
// @see lib/neatogen/constrained_majorization_ipsep.c:stress_majorization_cola
// @see lib/neatogen/neatoinit.c:majorization
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import type { DirectedVtxData } from './opt-arrangement.js';
import type { StressOpts } from './stress-kernel.js';

/** What the pipeline hands the swapped-in driver. */
const hook = vi.hoisted(() => ({
  g: null as Graph | null,
  vtx: null as DirectedVtxData[] | null,
  run: null as ((n: number, dCoords: Float64Array[], nodes: Node[], o: StressOpts) => number) | null,
}));

vi.mock('./start.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('./start.js')>(),
  assertSupported: (): void => undefined,
}));

vi.mock('./make-graph-data.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('./make-graph-data.js')>();
  return {
    ...orig,
    makeGraphDataC: (...args: Parameters<typeof orig.makeGraphDataC>): DirectedVtxData[] => {
      const vtx = orig.makeGraphDataC(...args);
      hook.g = args[0];
      hook.vtx = vtx;
      return vtx;
    },
  };
});

vi.mock('./stress-kernel.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('./stress-kernel.js')>();
  return {
    ...orig,
    stressMajorizationKDMkernel: (
      Dij: Float32Array, n: number, dCoords: Float64Array[], nodes: Node[], o: StressOpts,
    ): number => (o.cola === true && hook.run !== null
      ? hook.run(n, dCoords, nodes, o)
      : orig.stressMajorizationKDMkernel(Dij, n, dCoords, nodes, o)),
  };
});

const { parse, render } = await import('../../index.js');
const { stressMajorizationColaTraced } = await import('./stress-cola.js');
const { ipsepOptions } = await import('./ipsep-opts.js');
const { graphAdjustMode } = await import('./fdp-adjust.js');
const { graphHasLen } = await import('./make-graph-data.js');
const { MODEL_CIRCUIT, MODEL_MDS, MODEL_SHORTPATH, MODEL_SUBSET } = await import('./init.js');

const FIXTURES = new URL('./__fixtures__/ipsep/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, FIXTURES), 'utf8');

/** C `neatoModel` (the mds-without-len fallback is a stderr gap of `parseModel`). */
function modelOf(g: Graph): number {
  const p = g.root.attrs.get('model') ?? '';
  if (p === 'circuit') return MODEL_CIRCUIT;
  if (p === 'subset') return MODEL_SUBSET;
  if (p === 'mds') return graphHasLen(g) ? MODEL_MDS : MODEL_SHORTPATH;
  return MODEL_SHORTPATH;
}

/** Directed-edge probes whose native outcome varies run to run (see the header). */
const VARYING = new Set<string>(['big-dired', 'dired-hier', 'dired-hier-sep', 'dired-true', 'start-self-dired']);

/** Unconstrained probes: byte-identical to native, as T1's kD-kernel path is (part-7 AD-2). */
const UNCONSTRAINED = [
  'ipsep-grid', 'ipsep-k6', 'ipsep-rand', 'ipsep-rand-len', 'ipsep-tree', 'kd-ipsep', 'kd-ipsep-len',
] as const;

/** Constraint and model probes. */
const CONSTRAINED = [
  'big-dired', 'cluster', 'dired-hier', 'dired-hier-levelsgap', 'dired-hier-sep', 'dired-true',
  'len-dired', 'model-circuit', 'model-mds', 'model-mds-len', 'model-subset', 'overlap-ipsep',
  'overlap-vpsc', 'start-self', 'start-self-dired',
] as const;

/** The acceptance tolerance in xdot points, plus slack for decimal representation. */
const POSITION_TOLERANCE = 0.01 + 1e-9;
/** Largest per-iteration stress gap to the fixture's run on a VARYING probe (big-dired: 0.011). */
const VARYING_STRESS_TOLERANCE = 0.02;

interface ProbeRun {
  xdot: string;
  stderr: string;
  stresses: number[];
  iterations: number;
}

function runProbe(id: string): ProbeRun {
  const stresses: number[] = [];
  let iterations = Number.NaN;
  hook.run = (n, dCoords, nodes, o): number => {
    const g = hook.g!;
    const opt = ipsepOptions(g.root, g, nodes, graphAdjustMode(g));
    iterations = stressMajorizationColaTraced(hook.vtx!, n, dCoords, nodes, {
      dim: o.dim, model: modelOf(g), maxi: o.maxi, epsilon: o.epsilon, opt,
      observe: (s) => stresses.push(s),
    });
    return iterations;
  };
  const lines: string[] = [];
  const warn = vi.spyOn(console, 'warn').mockImplementation((m: unknown) => { lines.push(String(m)); });
  const error = vi.spyOn(console, 'error').mockImplementation((m: unknown) => { lines.push(String(m)); });
  try {
    const xdot = String(render(parse(read(`${id}.gv`)), 'xdot', { engine: 'neato' }));
    return { xdot, stderr: lines.map((l) => `${l}\n`).join(''), stresses, iterations };
  } finally {
    warn.mockRestore();
    error.mockRestore();
  }
}

/** Native's per-iteration stress (`%.3f`) and final iteration count from `-v`. */
function nativeTrace(id: string): { stresses: string[]; iterations: number } {
  const text = read(`${id}.trace`);
  const end = text.indexOf('final e = ');
  const start = text.lastIndexOf('initCMajVPSC done', end);
  const body = text.slice(text.indexOf('\n', start), end);
  const stresses = body.split(/\s+/).filter((t) => /^-?\d+\.\d{3}$/.test(t));
  const iterations = Number(/final e = \S+ (\d+) iterations/.exec(text)![1]);
  return { stresses, iterations };
}

/** Node name -> xdot `pos`. */
function positions(xdot: string): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  for (const [name, n] of parse(xdot).nodes) {
    const [x, y] = (n.attrs.get('pos') ?? '').split(',').map(Number);
    out.set(name, [x!, y!]);
  }
  return out;
}

/** Largest coordinate gap between the port's and native's node positions. */
function maxPositionError(port: string, native: string): number {
  const pa = positions(port);
  let err = 0;
  for (const [name, [x, y]] of positions(native)) {
    const [px, py] = pa.get(name)!;
    err = Math.max(err, Math.abs(px - x), Math.abs(py - y));
  }
  return err;
}

afterEach(() => { hook.run = null; });

describe('stress_majorization_cola: unconstrained probes', () => {
  it.each(UNCONSTRAINED)('%s is byte-identical to native, trace included', (id) => {
    const r = runProbe(id);
    const nat = nativeTrace(id);
    expect(r.xdot).toBe(read(`${id}.xdot`));
    expect(r.stderr).toBe(read(`${id}.xdot.stderr`));
    expect(r.stresses.map((s) => s.toFixed(3))).toEqual(nat.stresses);
    expect(r.iterations).toBe(nat.iterations);
  }, 60_000);
});

describe('stress_majorization_cola: constrained probes', () => {
  it.each(CONSTRAINED)('%s follows the native trace and positions', (id) => {
    const r = runProbe(id);
    const nat = nativeTrace(id);
    expect(r.iterations).toBe(nat.iterations);
    expect(maxPositionError(r.xdot, read(`${id}.xdot`))).toBeLessThanOrEqual(POSITION_TOLERANCE);
    if (VARYING.has(id)) {
      expect(r.stresses).toHaveLength(nat.stresses.length);
      r.stresses.forEach((s, i) => {
        expect(Math.abs(s - Number(nat.stresses[i]))).toBeLessThanOrEqual(VARYING_STRESS_TOLERANCE);
      });
    } else {
      expect(r.stresses.map((s) => s.toFixed(3))).toEqual(nat.stresses);
      expect(r.xdot).toBe(read(`${id}.xdot`));
    }
    // model-mds: native's neatoModel warns (mds without len); the port's
    // parseModel does not port that warning (outside this file's scope).
    if (id !== 'model-mds') expect(r.stderr).toBe(read(`${id}.xdot.stderr`));
  }, 60_000);
});
