// SPDX-License-Identifier: EPL-2.0

/**
 * pcpRotate against values dumped from the native graphviz 16.1.0 build.
 *
 * 630465f82 made pcp_rotate static; LTO then inlines it and vectorises the
 * covariance loop 4 points at a time with an unfused multiply-add, fusing
 * only the scalar tail. The axis radicand, `1 + axis0^2` and the rotation
 * stay fused. These cases pin each piece bit-for-bit: n = 3 (no main loop:
 * only the axis/rotation fusion matters), n = 7 and n = 25 (main loop plus
 * tail).
 *
 * @see lib/sfdpgen/spring_electrical.c:pcp_rotate
 */

import { describe, it, expect } from 'vitest';
import {
  multilevelSpringElectricalEmbedding, pcpRotate, powerLawGraph,
} from './spring-driver.js';
import { springElectricalControlNew } from './spring-electrical.js';
import {
  type SpMatrix, FORMAT_COORD, MATRIX_TYPE_REAL,
  smNew, smCoordAddEntry, smFromCoordinateFormat,
} from './sparse-matrix.js';
import { PCP_42, PCP_N3, PCP_N7, type PcpCase } from './__fixtures__/pcp-rotate-native.js';

const DIM = 2;

/** Symmetric real CSR matrix from undirected edge pairs (i == j: diagonal). */
function sym(m: number, edges: [number, number][]): SpMatrix {
  const A = smNew(m, m, MATRIX_TYPE_REAL, FORMAT_COORD);
  for (const [i, j] of edges) {
    smCoordAddEntry(A, i, j, 1);
    if (i !== j) smCoordAddEntry(A, j, i, 1);
  }
  return smFromCoordinateFormat(A);
}

function rotate(c: PcpCase): number[] {
  const x = c.input.slice();
  pcpRotate(c.n, DIM, x);
  return x;
}

describe('pcpRotate — native 16.1 bit-exactness', () => {
  it('matches native on n = 3 (covariance all in the fused tail)', () => {
    expect(rotate(PCP_N3)).toEqual(PCP_N3.output);
  });

  it('matches native on n = 7 (4 unfused main-loop points, 3 fused)', () => {
    expect(rotate(PCP_N7)).toEqual(PCP_N7.output);
  });

  it('matches native on tests/42.dot (n = 25)', () => {
    expect(rotate(PCP_42)).toEqual(PCP_42.output);
  });
});

describe('pcpRotate — zero cross-covariance', () => {
  it('uses axis (0, 1) when y[1] == 0, mapping (x, y) to (y, -x)', () => {
    // Centroid (10, 20); offsets (1,0), (-1,0), (0,2), (0,-2) give y[1] = 0.
    const x = [11, 20, 9, 20, 10, 22, 10, 18];
    pcpRotate(4, DIM, x);
    // + 0 folds the -0 that fma(-0, 1, -0) produces into +0.
    expect(x.map((v) => v + 0)).toEqual([0, -1, 0, 1, 2, 0, -2, 0]);
  });
});

describe('powerLawGraph', () => {
  it('ignores diagonal entries when counting degrees', () => {
    // Star 0-{1..4}: four degree-1 leaves -> power law. Self-loops on the
    // leaves must not lift them to degree 2.
    const star = sym(5, [[0, 1], [0, 2], [0, 3], [0, 4]]);
    const starLoops = sym(5, [[0, 1], [0, 2], [0, 3], [0, 4], [1, 1], [2, 2], [3, 3], [4, 4]]);
    expect(powerLawGraph(star)).toBe(true);
    expect(powerLawGraph(starLoops)).toBe(true);
  });

  it('is false when no node has degree 1', () => {
    expect(powerLawGraph(sym(3, [[0, 1], [1, 2], [0, 2]]))).toBe(false);
  });
});

describe('multilevelSpringElectricalEmbedding', () => {
  const TRIANGLE: [number, number][] = [[0, 1], [1, 2], [0, 2]];

  function embed(p: number): number[] {
    const ctrl = springElectricalControlNew();
    ctrl.p = p;
    const x = [0, 0, 0, 0, 0, 0];
    multilevelSpringElectricalEmbedding(DIM, sym(3, TRIANGLE), ctrl, null, x);
    return x;
  }

  it('returns without touching x when dim <= 0', () => {
    const x = [1, 2, 3, 4, 5, 6];
    multilevelSpringElectricalEmbedding(0, sym(3, TRIANGLE), springElectricalControlNew(), null, x);
    expect(x).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('resolves AUTOP to p = -1 on a non-power-law graph', () => {
    const auto = embed(springElectricalControlNew().p);
    expect(auto).toEqual(embed(-1));
    expect(auto).not.toEqual(embed(-1.8));
  });
});
