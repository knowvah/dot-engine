// SPDX-License-Identifier: EPL-2.0

/**
 * T4 — C-port throw sites (group A) throw InternalError with their original
 * messages. Sites not reachable through an exported function (cdt-surface
 * ringFrom / walk guards, mkRouter triangulation failure, ortho decide_point)
 * are not triggerable: not exported, and each needs an internal invariant
 * break that valid input cannot produce.
 */

import { describe, it, expect } from 'vitest';
import { InternalError, DotEngineError } from './errors.js';
import { Variable } from './vpsc/Variable.js';
import { Constraint } from './vpsc/Constraint.js';
import { VPSC, IncVPSC } from './vpsc/Solver.js';
import { findMap, edgeToSeg } from './layout/neato/multispline-router.js';
import type { Tgraph } from './layout/neato/multispline-router.js';
import { locateEndpoint } from './ortho/trap-query.js';
import type { QNode, SegPoint } from './ortho/trap-types.js';

function expectInternal(fn: () => unknown, message: string): void {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(InternalError);
  expect(caught).toBeInstanceOf(DotEngineError);
  const err = caught as InternalError;
  expect(err.message).toBe(message);
  expect(err.code).toBe('INTERNAL_ERROR');
  expect(err.type).toBe('render');
  expect(err.name).toBe('InternalError');
}

function contradictory(): { vs: Variable[]; cs: Constraint[] } {
  const v0 = new Variable(0, 0, 1);
  const v1 = new Variable(1, 0, 1);
  return {
    vs: [v0, v1],
    cs: [new Constraint(v0, v1, 5), new Constraint(v1, v0, 5)],
  };
}

describe('vpsc/Solver.ts', () => {
  it('VPSC.satisfy throws InternalError "Unsatisfied constraint"', () => {
    const { vs, cs } = contradictory();
    expectInternal(() => new VPSC(vs, cs).satisfy(), 'Unsatisfied constraint');
  });

  it('IncVPSC.satisfy throws InternalError on a contradictory pair', () => {
    const { vs, cs } = contradictory();
    let caught: unknown;
    try {
      new IncVPSC(vs, cs).satisfy();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(InternalError);
    expect((caught as InternalError).code).toBe('INTERNAL_ERROR');
    expect(['Unsatisfied constraint', 'Cycle Error!']).toContain(
      (caught as InternalError).message,
    );
  });
});

describe('layout/neato/multispline-router.ts', () => {
  it('findMap throws InternalError when the segment has no triangle', () => {
    expectInternal(
      () => findMap(new Map<number, number>(), 1, 2),
      'findMap: no triangle for segment',
    );
  });

  it('edgeToSeg throws InternalError when triangles share no edge', () => {
    const tg: Tgraph = {
      nodes: [{ edges: [], ctr: { x: 0, y: 0 } }],
      edges: [],
    };
    expectInternal(
      () => edgeToSeg(tg, 0, 1),
      'edgeToSeg: no edge between triangles',
    );
  });
});

describe('ortho/trap-query.ts', () => {
  it('locateEndpoint throws InternalError on an unknown node type', () => {
    const pt: SegPoint = { x: 0, y: 0 };
    const qs: QNode[] = [
      { nodetype: 99, segnum: 0, yval: pt, trnum: 0, parent: 0, left: 0, right: 0 },
    ];
    expectInternal(
      () => locateEndpoint(pt, pt, 0, [], qs),
      'locateEndpoint: unreachable',
    );
  });
});
