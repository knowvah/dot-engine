// SPDX-License-Identifier: EPL-2.0

/**
 * Branch coverage for sfdp init helpers: mapBool/lateQuadtreeScheme/
 * resolveSeed (driven through tuneControl via the beautify/
 * overlap_shrink/quadtree/start attributes), tuneControl's smoothing/
 * rotation unported-feature guards and edgeLabelingScheme clamp,
 * getPos with an actual "pos" attribute, getSizes' width/height
 * fallback, and sfdpInitGraph's edge-label measurer branch.
 *
 * @see lib/sfdpgen/sfdpinit.c (15.0.0)
 *
 * Residual: resolveSeed's `Number.isNaN(v)` true branch (init.ts, digit
 * dispatch) is unreachable — `parseInt` is only called after confirming
 * the first character is an ASCII digit ('0'-'9'), which parseInt always
 * parses successfully, so it can never return NaN there. 98.6% branch
 * coverage.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../parser/index.js';
import {
  sfdpInitGraph, tuneControl, makeMatrix, getSizes, getPos,
} from './init.js';
import {
  springElectricalControlNew, QUAD_TREE_NONE, QUAD_TREE_NORMAL, QUAD_TREE_FAST,
} from './spring-electrical.js';
import { GvcContext } from '../../gvc/context.js';
import { EstimateTextMeasurer } from '../../common/textmeasure.js';

const SIMPLE = 'graph G { a -- b; }';

describe('tuneControl — beautify / overlap_shrink (mapBool)', () => {
  it('unset attribute falls back to the default', () => {
    const g = parse(SIMPLE);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.beautifyLeaves).toBe(false); // default
    expect(ctrl.doShrinking).toBe(true); // default
  });

  it('empty-string attribute falls back to the default', () => {
    const g = parse(`graph G { beautify=""; overlap_shrink=""; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.beautifyLeaves).toBe(false);
    expect(ctrl.doShrinking).toBe(true);
  });

  it('"false"/"no" resolve to false', () => {
    const g = parse(`graph G { beautify="false"; overlap_shrink="no"; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.beautifyLeaves).toBe(false);
    expect(ctrl.doShrinking).toBe(false);
  });

  it('"true"/"yes" resolve to true', () => {
    const g = parse(`graph G { beautify="true"; overlap_shrink="yes"; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.beautifyLeaves).toBe(true);
    expect(ctrl.doShrinking).toBe(true);
  });

  it('a nonzero numeric string resolves to true', () => {
    const g = parse(`graph G { beautify="5"; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.beautifyLeaves).toBe(true);
  });

  it('a zero numeric string resolves to false', () => {
    const g = parse(`graph G { overlap_shrink="0"; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.doShrinking).toBe(false);
  });

  it('a non-numeric, non-boolean-keyword string falls back to the default', () => {
    const g = parse(`graph G { beautify="frob"; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.beautifyLeaves).toBe(false);
  });
});

describe('tuneControl — quadtree (lateQuadtreeScheme)', () => {
  it('empty-string attribute falls back to the default', () => {
    const g = parse(`graph G { quadtree=""; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.tscheme).toBe(QUAD_TREE_NORMAL);
  });

  it('a valid in-range digit selects that scheme', () => {
    const g = parse(`graph G { quadtree="${QUAD_TREE_FAST}"; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.tscheme).toBe(QUAD_TREE_FAST);
  });

  it('an out-of-range digit falls back to the default', () => {
    const g = parse(`graph G { quadtree="99"; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.tscheme).toBe(QUAD_TREE_NORMAL);
  });

  it('the "fast" keyword selects QUAD_TREE_FAST', () => {
    const g = parse(`graph G { quadtree=fast; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.tscheme).toBe(QUAD_TREE_FAST);
  });

  it('the "true"/"yes" keywords select QUAD_TREE_NORMAL', () => {
    const g = parse(`graph G { quadtree=yes; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.tscheme).toBe(QUAD_TREE_NORMAL);
  });

  it('an unrecognized keyword falls back to the default', () => {
    const g = parse(`graph G { quadtree=bogus; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.tscheme).toBe(QUAD_TREE_NORMAL);
  });
});

describe('tuneControl — start (resolveSeed)', () => {
  it('empty-string "start" falls back to the default seed', () => {
    const g = parse(`graph G { start=""; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.randomSeed).toBe(123);
  });

  it('"random<N>" parses N as the seed', () => {
    const g = parse(`graph G { start="random7"; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.randomSeed).toBe(7);
  });

  it('"random" with a non-numeric suffix falls back to the default', () => {
    const g = parse(`graph G { start="randomXYZ"; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.randomSeed).toBe(123);
  });

  it('a non-digit, non-"random" keyword falls back to the default', () => {
    const g = parse(`graph G { start=self; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.randomSeed).toBe(123);
  });
});

describe('tuneControl — smoothing (unported-feature guard)', () => {
  it('smoothing unset does not throw', () => {
    const g = parse(SIMPLE);
    const ctrl = springElectricalControlNew();
    expect(() => tuneControl(g, ctrl)).not.toThrow();
  });

  it('smoothing="none" does not throw', () => {
    const g = parse(`graph G { smoothing=none; a -- b; }`);
    const ctrl = springElectricalControlNew();
    expect(() => tuneControl(g, ctrl)).not.toThrow();
  });

  it('smoothing="0" (String(SMOOTHING_NONE)) does not throw', () => {
    const g = parse(`graph G { smoothing="0"; a -- b; }`);
    const ctrl = springElectricalControlNew();
    expect(() => tuneControl(g, ctrl)).not.toThrow();
  });

  it('an unported smoothing value throws', () => {
    const g = parse(`graph G { smoothing=avg_dist; a -- b; }`);
    const ctrl = springElectricalControlNew();
    expect(() => tuneControl(g, ctrl)).toThrow(/smoothing/);
  });
});

describe('tuneControl — rotation (unported-feature guard)', () => {
  it('rotation=0 (default) does not throw', () => {
    const g = parse(SIMPLE);
    const ctrl = springElectricalControlNew();
    expect(() => tuneControl(g, ctrl)).not.toThrow();
  });

  it('a nonzero rotation throws', () => {
    const g = parse(`graph G { rotation=45; a -- b; }`);
    const ctrl = springElectricalControlNew();
    expect(() => tuneControl(g, ctrl)).toThrow(/rotation/);
  });
});

describe('tuneControl — edgeLabelingScheme clamp', () => {
  it('a value above 4 clamps to 0', () => {
    const g = parse(`graph G { label_scheme=7; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.edgeLabelingScheme).toBe(0);
  });

  it('an in-range value is kept', () => {
    const g = parse(`graph G { label_scheme=3; a -- b; }`);
    const ctrl = springElectricalControlNew();
    tuneControl(g, ctrl);
    expect(ctrl.edgeLabelingScheme).toBe(3);
  });
});

describe('getPos — an explicit "pos" attribute', () => {
  // getPos's `hasPosAttr` scan reads the raw "pos" attribute, but nothing
  // in the current sfdp init path (unlike neato's userPos) parses that
  // attribute INTO n.info.pos — sfdpInitGraph only zero-fills it via
  // neatoInitNode. So n.info.pos is set directly here to exercise getPos's
  // own copy logic; it does not assert that sfdp reads "pos=" end to end.
  it('reads a fully-specified pos into the coordinate array', () => {
    const g = parse(`graph G { a [pos="1,2"]; b; a -- b; }`);
    makeMatrix(g);
    g.nodes.get('a')!.info.pos = [1, 2];
    expect(getPos(g, 2)).toEqual([1, 2, 0, 0]);
  });

  it('pads a short pos with zeros for the missing dimensions', () => {
    const g = parse(`graph G { a [pos="1,2"]; b; a -- b; }`);
    makeMatrix(g);
    g.nodes.get('a')!.info.pos = [1, 2];
    // request dim=3 while pos only carries 2 components -> np[2] ?? 0
    expect(getPos(g, 3)).toEqual([1, 2, 0, 0, 0, 0]);
  });
});

describe('getSizes — missing width/height fallback', () => {
  it('treats an undefined width/height as 0', () => {
    const g = parse(SIMPLE);
    makeMatrix(g);
    for (const n of g.nodes.values()) {
      n.info.width = undefined as unknown as number;
      n.info.height = undefined as unknown as number;
    }
    const sizes = getSizes(g, { x: 0, y: 0 });
    expect(sizes).toEqual([0, 0, 0, 0]);
  });
});

describe('sfdpInitGraph — edge label measurer branch', () => {
  it('initializes edge labels when a text measurer is present', () => {
    const g = parse(`graph G { a -- b [label="hi"]; }`);
    g.root = g;
    g.info.gvc = new GvcContext(new EstimateTextMeasurer());
    expect(() => sfdpInitGraph(g)).not.toThrow();
    const e = [...g.nodes.values()][0]!.outEdges(g)[0]!;
    expect(e.info.label).toBeDefined();
  });

  it('skips edge-label init when no text measurer is present', () => {
    const g = parse(`graph G { a -- b [label="hi"]; }`);
    sfdpInitGraph(g);
    const e = [...g.nodes.values()][0]!.outEdges(g)[0]!;
    expect(e.info.label).toBeUndefined();
  });
});
