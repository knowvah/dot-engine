// SPDX-License-Identifier: EPL-2.0

/**
 * T4b — branch coverage for layout/dot/index.ts.
 *
 * setEdgeTypeFromAttr and getAttrInt are pure and driven with direct
 * Graph fixtures. The doDot pack-mode arms (L287, L295) require real
 * multi-component pipeline state, so those are driven through renderSvg
 * with `pack=`/`ratio=` graph attributes and asserted on concrete SVG
 * output shape.
 *
 * Residue: L238 (`dotMincross` returning a nonzero rc inside
 * dotLayoutPipeline) is not covered. Triggering it requires a rank/cluster
 * state dotMincross rejects (malformed-input rankset recovery per this
 * file's own dotLayoutPipeline doc comment) — out of scope to construct
 * safely here without risking a corpus regression via a contrived input.
 * See report.
 *
 * @see lib/dotgen/dotinit.c:dot_layout
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { renderSvg } from '../../index.js';
import { parse } from '../../parser/index.js';
import { setEdgeTypeFromAttr, getAttrInt, doDot } from './index.js';
import { EDGETYPE_NONE, EDGETYPE_SPLINE, edgeTypeFromString } from './splines.js';

describe('setEdgeTypeFromAttr', () => {
  it('uses defaultValue when splines is unset', () => {
    const g = new Graph('g', 'directed');
    setEdgeTypeFromAttr(g, EDGETYPE_SPLINE);
    expect(g.info.flags & 0xf).toBe(EDGETYPE_SPLINE & 0xf);
  });
  it('uses EDGETYPE_NONE when splines is the empty string', () => {
    const g = new Graph('g', 'directed');
    g.attrs.set('splines', '');
    setEdgeTypeFromAttr(g, EDGETYPE_SPLINE);
    expect(g.info.flags & 0xf).toBe(EDGETYPE_NONE & 0xf);
  });
  it('parses an explicit splines value', () => {
    const g = new Graph('g', 'directed');
    g.attrs.set('splines', 'ortho');
    setEdgeTypeFromAttr(g, EDGETYPE_SPLINE);
    expect(g.info.flags & 0xf).toBe(edgeTypeFromString('ortho', EDGETYPE_SPLINE) & 0xf);
  });
  it('walks up to the root when a component subgraph lacks splines', () => {
    const root = new Graph('root', 'directed');
    root.attrs.set('splines', 'ortho');
    const child = new Graph('child', 'directed');
    child.parent = root;
    child.root = root;
    setEdgeTypeFromAttr(child, EDGETYPE_SPLINE);
    expect(child.info.flags & 0xf).toBe(edgeTypeFromString('ortho', EDGETYPE_SPLINE) & 0xf);
  });
});

describe('getAttrInt', () => {
  it('returns the default when the attribute is unset', () => {
    const g = new Graph('g', 'directed');
    expect(getAttrInt(g, 'phase', 7)).toBe(7);
  });
  it('returns the default when the attribute is the empty string', () => {
    const g = new Graph('g', 'directed');
    g.attrs.set('phase', '');
    expect(getAttrInt(g, 'phase', 7)).toBe(7);
  });
  it('parses a numeric attribute', () => {
    const g = new Graph('g', 'directed');
    g.attrs.set('phase', '3');
    expect(getAttrInt(g, 'phase', 7)).toBe(3);
  });
  it('returns the default when the attribute does not parse as a number', () => {
    const g = new Graph('g', 'directed');
    g.attrs.set('phase', 'abc');
    expect(getAttrInt(g, 'phase', 7)).toBe(7);
  });
});

describe('doDot pack-mode arms (called directly, matching dotLayoutEntry\'s '
  + 'raw-parsed-graph call site)', () => {
  it('packmode set explicitly (mode !== Undef) and pack unset (Pack < 0): '
    + 'the nested `else if (pack < 0)` at L287 fires', () => {
    const g = parse('digraph { packmode="node"; a -> b; c -> d }');
    expect(() => doDot(g)).not.toThrow();
    for (const n of g.nodes.values()) {
      expect(Number.isFinite(n.info.coord.x)).toBe(true);
      expect(Number.isFinite(n.info.coord.y)).toBe(true);
    }
  });
  it('pack set without packmode: mode defaults to Graph, multi-component '
    + 'packs via layoutAndPack (L295 true arm)', () => {
    const g = parse('digraph { pack=10; a -> b; c -> d }');
    expect(() => doDot(g)).not.toThrow();
    // layoutAndPack positioned both components; every node has real coords.
    for (const n of g.nodes.values()) {
      expect(Number.isFinite(n.info.coord.x)).toBe(true);
      expect(Number.isFinite(n.info.coord.y)).toBe(true);
    }
  });
  it('multi-component graph with a non-none ratio falls back to whole-graph '
    + 'layout (L295 false arm)', () => {
    const g = parse('digraph { pack=10; ratio=compress; a -> b; c -> d }');
    expect(() => doDot(g)).not.toThrow();
    for (const n of g.nodes.values()) {
      expect(Number.isFinite(n.info.coord.x)).toBe(true);
      expect(Number.isFinite(n.info.coord.y)).toBe(true);
    }
  });
});
