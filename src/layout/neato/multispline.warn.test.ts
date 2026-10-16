// SPDX-License-Identifier: EPL-2.0

/**
 * "Could not create control points for multiple spline for edge (t,h)"
 * warnings from genroute. Native prints these through agwarningf (stderr
 * "Warning: " prefix). Site 1 (corridor Pshortestpath) and site 3 (member
 * Pshortestpath) occur natively on corpus-shaped input; sites 2 and 5
 * (Proutespline failure) are forced by making routeSpline throw. Site 4
 * (mkCtrlPts returns null) needs a degenerate triangle corridor that no known
 * input provokes, so it has no test.
 *
 * @see lib/neatogen/multispline.c:genroute
 */

import { describe, test, expect, vi, afterEach } from 'vitest';
import { renderSvg } from '../../index.js';
import { routeSpline } from '../../pathplan/index.js';

vi.mock('../../pathplan/index.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../pathplan/index.js')>();
  return { ...orig, routeSpline: vi.fn(orig.routeSpline) };
});

const PREFIX = 'Warning: Could not create control points for multiple spline for edge';

const MSG = 'Could not create control points';

afterEach(() => {
  vi.restoreAllMocks();
});

function warnings(dot: string, engine: string): string[] {
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  renderSvg(dot, engine);
  return spy.mock.calls.map((c) => String(c[0])).filter((m) => m.includes(MSG));
}

// graphviz tests/2168_1.dot: the sw port lies outside the obstacle, so the
// destination point is in no triangle and Pshortestpath fails (site 1).
const DOT_2168_1 = `digraph {
  splines=true;
  node [width=0.78, height=0.53];
  node [peripheries=0];
  node1 -> node2:sw;
}`;

describe('genroute — control point warnings', () => {
  test('Pshortestpath failure warns with tail and head names (site 1)', () => {
    expect(warnings(DOT_2168_1, 'neato')).toEqual([
      `${PREFIX} (node1,node2)`,
    ]);
  });

  test('a routable edge emits no such warning', () => {
    expect(warnings('graph G { a -- b }', 'neato')).toEqual([]);
  });

  // Fixture from multispline.branch.test.ts; native
  // graphviz 16.1.0 prints exactly one warning, for (n3,n4) (site 3).
  test('member Pshortestpath failure warns once for the failing group (site 3)', () => {
    const dot = `graph G {
      layout=neato
      splines=true
      node [shape=ellipse width=0.5 height=0.35]
      n0 [pos="4.0,4.5!"]
      n1 [pos="1.5,3.0!"]
      n2 [pos="2.0,1.5!"]
      n3 [pos="6.0,4.5!"]
      n4 [pos="0.0,0.0!"]
      n5 [pos="4.0,2.0!"]
      n2 -- n5
      n2 -- n5
      n3 -- n4
      n3 -- n4
      n4 -- n1
      n4 -- n1
    }`;
    expect(warnings(dot, 'neato')).toEqual([`${PREFIX} (n3,n4)`]);
  });

  const CORRIDOR = (extra: string, n: number): string => `graph G {
    layout=neato
    splines=true
    ${extra}
    node [shape=ellipse width=0.5 height=0.35]
    o1 [pos="-1,0!"]
    o2 [pos="5,0!"]
    o3 [pos="2,-1.2!"]
    a  [pos="0,0!"]
    b  [pos="4,0!"]
    m1 [pos="1.3,0.05!"]
    m2 [pos="2.7,-0.05!"]
    ${'a -- b\n'.repeat(n)}
  }`;

  test('Proutespline failure on a single corridor warns (site 2)', () => {
    vi.mocked(routeSpline).mockImplementation(() => {
      throw new Error('forced');
    });
    expect(warnings(CORRIDOR('concentrate=true', 3), 'neato')).toEqual([`${PREFIX} (a,b)`]);
  });

  test('Proutespline failure on a member corridor warns (site 5)', () => {
    vi.mocked(routeSpline).mockImplementation(() => {
      throw new Error('forced');
    });
    expect(warnings(CORRIDOR('', 4), 'neato')).toEqual([`${PREFIX} (a,b)`]);
  });
});
