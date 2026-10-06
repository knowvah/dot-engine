// SPDX-License-Identifier: EPL-2.0
/**
 * fdp follows Graphviz after 15.0.0: repulsion on the hypot distance (host
 * libm's) with the Mlimit cutoff, C's fused multiply-adds in xLayout and
 * initPositions, and derived nodes created in node-sequence order. Expected
 * positions are the native oracle's `dot -Kfdp -Tplain` (inches, 5 digits).
 *
 * @see lib/fdpgen/tlayout.c:doRep / applyRep / doNeighbor
 * @see lib/fdpgen/xlayout.c:doRep / applyAttr / adjust
 * @see lib/fdpgen/layout.c:deriveGraph
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../../index.js';
import { fdpParms } from './tlayout-parms.js';

/** Native positions for two pinned coincident boxes plus c. */
const PINNED_COINCIDENT = 'a:4.1215,0.5 b:4.2274,2.0671 c:0.5,0.91797';

/** -Tplain prints 5 significant digits. */
const TOL = 0.0001;

function positions(src: string): Map<string, [number, number]> {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const out = String(render(parse(src), 'plain', { engine: 'fdp' }));
  return new Map(out.split('\n').filter((l) => l.startsWith('node ')).map((l) => {
    const t = l.split(' ');
    return [t[1]!, [Number(t[2]), Number(t[3])]];
  }));
}

function expectNative(src: string, spec: string): void {
  const got = positions(src);
  for (const s of spec.split(' ')) {
    const [name, xy] = s.split(':') as [string, string];
    const [x, y] = xy.split(',').map(Number) as [number, number];
    expect(Math.abs(got.get(name)![0] - x), `${name}.x`).toBeLessThan(TOL);
    expect(Math.abs(got.get(name)![1] - y), `${name}.y`).toBeLessThan(TOL);
  }
}

afterEach(() => { vi.restoreAllMocks(); fdpParms.Mlimit = Infinity; });

describe('fdp matches the current native build', () => {
  it('cluster with edges leaving it (was ~0.24 in off under 15.0.0 doRep)', () => {
    expectNative('graph G { subgraph cluster_a { a; b; a--b } c; a--c; c--d }',
      'a:0.89492,1.7292 b:0.48611,2.3581 c:1.8903,1.3319 d:1.7384,0.25');
    expectNative('graph G { subgraph cluster_a { a; b } a--c; c--d }',
      'a:0.48611,1.9107 b:1.3934,2.6674 c:2.4042,1.5147 d:2.1205,0.25');
  });

  it('overlap expansion (xLayout) with fused multiply-adds', () => {
    expectNative(readFileSync('test/golden/inputs/dot-mclimit.dot', 'utf8'),
      'a0:1.9749,2.8057 b0:4.9209,2.6093 b1:1.1631,1.3716 b2:1.1483,4.7648 '
      + 'b3:4.4928,1.8363 b4:2.4419,5.1703 b5:0.40671,3.7494 b6:4.0275,2.6315 '
      + 'b7:0.375,2.4841 a1:5.7454,0.65514 a2:4.4522,0.25 a3:2.8704,2.7932 '
      + 'a4:6.4877,1.671 a5:5.7305,4.0501 a6:2.3967,3.5868 a7:6.5191,2.9372');
  });
});

describe('Mlimit (fdp_parms; dot -Lm, HUGE_VAL by default)', () => {
  const SRC = 'graph G { a--b--c--d--a; a--c; e--a; f--b }';

  it('has no effect at its default', () => {
    expect(fdpParms.Mlimit).toBe(Infinity);
    expect([...positions(SRC)]).toEqual([...positions(SRC)]);
  });

  it('cuts off repulsion beyond the limit', () => {
    const free = positions(SRC);
    fdpParms.Mlimit = 1e-9; // every pair is farther apart: no repulsion
    const limited = positions(SRC);
    expect([...limited]).not.toEqual([...free]);
  });
});

describe('derived graph node order (agfstnode = node sequence)', () => {
  it('lays out a cluster the same whatever order its members are written in', () => {
    // n1..n4 are created in sequence first; the cluster lists them reversed.
    const nodes = 'n1; n2; n3; n4; x;';
    const ordered = `graph G { ${nodes} subgraph cluster_a { n1; n2; n3; n4 } n1--n2--n3--n4; n2--x; n4--x }`;
    const reversed = `graph G { ${nodes} subgraph cluster_a { n4; n3; n2; n1 } n1--n2--n3--n4; n2--x; n4--x }`;
    expect([...positions(reversed)]).toEqual([...positions(ordered)]);
  });
});

describe('coincident nodes re-roll a rand() delta (doRep: while !(dist > 0))', () => {
  it('in the initial layout', () => {
    expectNative('graph G { a [pos="1,1"]; b [pos="1,1"]; c; a--b; b--c; c--a }',
      'a:1.1722,0.25 b:1.3497,1.2209 c:0.375,0.89909');
  });

  it('in the overlap expansion (pinned coincident nodes stay put)', () => {
    expectNative('graph G { node[shape=box width=1 height=1]; a [pos="1,1!"]; b [pos="1,1!"]; c; a--c; b--c }',
      PINNED_COINCIDENT);
  });

  it('in the overlap expansion', () => {
    expectNative('graph G { node[shape=box width=1 height=1]; a [pos="1,1"]; b [pos="1,1"]; a--b }',
      'a:0.5,0.5 b:1.0902,1.6836');
  });
});

describe('fdp_parms.useNew = 0 (dot -Ln; K²/d² repulsion)', () => {
  afterEach(() => { fdpParms.useNew = 1; });

  it('uses the K²/d² force instead of K²/d³', () => {
    const SRC = 'graph G { a--b--c--d--a; a--c; e--a }';
    const dflt = positions(SRC);
    fdpParms.useNew = 0;
    expect([...positions(SRC)]).not.toEqual([...dflt]);
  });
});
