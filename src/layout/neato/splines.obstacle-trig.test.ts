// SPDX-License-Identifier: EPL-2.0

/**
 * makeObstacle's ellipse 8-gon against the native 16.1.0 build, bit for bit.
 * The corner at j = 4 takes sin(9π/8), where V8's Math.sin is 1 ulp off the
 * host libm; the drift moves the corner's y off the node centre line by one
 * ulp more than native, which flips knife-edge triangulations in the
 * multispline router (corpus 241_0 under sfdp, item 53).
 *
 * @see lib/neatogen/neatosplines.c:makeObstacle
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { makeNodeInfo } from '../../model/nodeInfo.js';
import { ShapeKind } from '../../common/types.js';
import { makeObstacle } from './splines.js';

describe('makeObstacle — ellipse 8-gon host-libm parity', () => {
  it('vertices equal the native makeObstacle dump of 241_0 node 4', () => {
    const g = new Graph('t', 'directed');
    const n = new Node(0, '4', g);
    n.info = makeNodeInfo();
    n.info.shape = { kind: ShapeKind.SH_POLY };
    n.info.shape_info = undefined;
    n.info.lw = 27;
    n.info.rw = 27;
    n.info.ht = 36;
    n.info.coord = { x: 237.441856356576, y: 18 };
    // a = (54 + 4.2) / 2 = 29.1, b = (36 + 4.2) / 2 = 20.1, as in the run.
    const poly = makeObstacle(n, { x: 4.2, y: 4.2, doAdd: true })!;
    expect(poly.ps).toEqual([
      { x: 259.71403212022426, y: 2.616126018923392 },
      { x: 237.441856356576, y: -3.7560832258771235 },
      { x: 215.1696805929278, y: 2.6161260189233975 },
      { x: 205.94424332806733, y: 18.000000000000004 },
      { x: 215.1696805929278, y: 33.38387398107661 },
      { x: 237.441856356576, y: 39.75608322587712 },
      { x: 259.71403212022426, y: 33.38387398107661 },
      { x: 268.9394693850847, y: 18 },
    ]);
  });
});
