// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect } from 'vitest';
import { parse, render } from '../../index.js';
import { initInfo } from './layout.js';

/** @see lib/fdpgen/layout.c:init_info (G_coord = agattr_text(g, AGRAPH, "coords", NULL)) */
describe('fdp hasCoords mirrors the graph-wide coords declaration', () => {
  it('is false when no graph declares coords', () => {
    const g = parse('graph G { subgraph cluster_a { a; b } }');
    expect(initInfo(g).hasCoords).toBe(false);
  });

  it('is true when only a cluster subgraph declares coords', () => {
    const g = parse('graph G { subgraph cluster_a { coords="1,1,2,2"; a; b } }');
    expect(g.attrs.has('coords')).toBe(false);
    expect(initInfo(g).hasCoords).toBe(true);
  });

  it('is true when the root sets coords', () => {
    const g = parse('graph G { coords=""; a }');
    expect(initInfo(g).hasCoords).toBe(true);
  });

  it('cluster-only coords lays out identically to root coords=""', () => {
    const body =
      'subgraph cluster_0 { coords="36,36,144,144"; x; y; x--y } ' +
      'subgraph cluster_1 { coords="216,36,324,144!"; z; w; z--w } ' +
      'x--z; y--w; q [pos="180,180"]; q--x;';
    const a = render(parse(`graph G { ${body} }`), 'plain', { engine: 'fdp' });
    const b = render(parse(`graph G { coords=""; ${body} }`), 'plain', {
      engine: 'fdp',
    });
    expect(a).toBe(b);
    expect(a).toContain('node x 1.0315 7.968');
  });
});
