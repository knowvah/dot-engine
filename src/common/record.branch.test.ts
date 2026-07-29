// SPDX-License-Identifier: EPL-2.0

/**
 * Branch-coverage tests for record.ts: the record-label parser
 * (parse_reclbl), sizer (size_reclbl/resize_reclbl), positioner
 * (pos_reclbl), record_init, and record_gencode.
 *
 * Targets the uncovered branches from the batch-3 coverage digest
 * (plans/coverage-90/batch-3/T3d.md): malformed-label error paths,
 * hardspace/escape handling, empty fields, margin-attr sizing,
 * the fixedsize/nojustify attrBool matrix, and the defensive
 * coord-fallback / early-return guards in the gencode path.
 *
 * @see lib/common/shapes.c:parse_reclbl
 * @see lib/common/shapes.c:size_reclbl
 * @see lib/common/shapes.c:pos_reclbl
 * @see lib/common/shapes.c:record_init
 * @see lib/common/shapes.c:record_gencode
 */

import { describe, it, expect, vi } from 'vitest';
import {
  recIsEscapedDelim, recCountFields, parseReclbl,
  sizeReclbl, recSideMask, posReclbl,
  recParseOrFallback, recordInit, recordNodeInit,
  genFields, recordGencode,
} from './record.js';
import { makeLabel } from './make-label.js';
import type { FieldT } from './types.js';
import type { TextMeasurer } from './textmeasure.js';
import type { Point } from '../model/geom.js';
import { GVRENDER_DOES_TRANSFORM, type RenderJob } from '../gvc/job.js';
import { Graph } from '../model/graph.js';
import { Node } from '../model/node.js';
import { makeNodeInfo } from '../model/nodeInfo.js';
import { TOP, BOTTOM, LEFT, RIGHT } from './splines-constants.js';

const stubMeasurer: TextMeasurer = { measure: () => ({ w: 10, h: 10 }) };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal RecScan built structurally (RecScan is not exported). */
type Scan = Parameters<typeof parseReclbl>[0];

function scan(s: string, html = false): Scan {
  const lbl = makeLabel('', 'Times,serif', 14, 'black', stubMeasurer);
  lbl.html = html;
  return { s, i: 0, lbl, measurer: stubMeasurer, obj: undefined };
}

function fieldText(f: FieldT): string {
  return f.lp!.text;
}

function field(overrides: Partial<FieldT> = {}): FieldT {
  return {
    size: { x: 0, y: 0 }, b: { ll: { x: 0, y: 0 }, ur: { x: 0, y: 0 } },
    n_flds: 0, lp: null, fld: null, id: null, LR: 0, sides: 0,
    ...overrides,
  };
}

function makeGraph(): Graph {
  return new Graph('g', 'directed');
}

function addNode(g: Graph, name: string, attrs: Record<string, string> = {}): Node {
  const n = new Node(1, name, g);
  n.info = makeNodeInfo();
  for (const [k, v] of Object.entries(attrs)) n.attrs.set(k, v);
  g.nodes.set(name, n);
  return n;
}

function stubRenderer() {
  return {
    textspan: vi.fn(), polygon: vi.fn(), ellipse: vi.fn(), bezier: vi.fn(),
    polyline: vi.fn(), beginNode: vi.fn(), endNode: vi.fn(),
    beginEdge: vi.fn(), endEdge: vi.fn(), beginGraph: vi.fn(), endGraph: vi.fn(),
    beginCluster: vi.fn(), endCluster: vi.fn(), type: 'svg', quality: 0,
  };
}

function stubJob(renderer: unknown): RenderJob {
  return {
    obj: null,
    flags: GVRENDER_DOES_TRANSFORM, // transformPoint becomes identity
    zoom: 1,
    devscale: { x: 1, y: 1 },
    translation: { x: 0, y: 0 },
    renderer,
  } as unknown as RenderJob;
}

// ---------------------------------------------------------------------------
// recIsEscapedDelim / recCountFields
// ---------------------------------------------------------------------------

describe('recIsEscapedDelim', () => {
  it('true for escaped { } | \\', () => {
    expect(recIsEscapedDelim('\\{', 0)).toBe(true);
    expect(recIsEscapedDelim('\\}', 0)).toBe(true);
    expect(recIsEscapedDelim('\\|', 0)).toBe(true);
    expect(recIsEscapedDelim('\\\\', 0)).toBe(true);
  });

  it('false for a non-delimiter escape or a non-backslash char', () => {
    expect(recIsEscapedDelim('\\x', 0)).toBe(false);
    expect(recIsEscapedDelim('ab', 0)).toBe(false);
  });
});

describe('recCountFields', () => {
  it('an escaped pipe is literal text, not a field separator', () => {
    expect(recCountFields(scan('a\\|b|c'))).toBe(2);
  });

  it('counts every unescaped top-level pipe', () => {
    expect(recCountFields(scan('a|b|c'))).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// parseReclbl — malformed labels (parse_error paths)
// ---------------------------------------------------------------------------

describe('parseReclbl — malformed labels return null', () => {
  it('two ports in one field (recOpenPort HASPORT guard)', () => {
    expect(parseReclbl(scan('<a><b>x'), 0, true)).toBeNull();
  });

  it('a bare ">" with no open port (recClosePort INPORT guard)', () => {
    expect(parseReclbl(scan('>bad'), 0, true)).toBeNull();
  });

  it('an unterminated port at end of string (INPORT still set)', () => {
    expect(parseReclbl(scan('<p1'), 0, true)).toBeNull();
  });

  it('flag=false and the string ends without a field terminator', () => {
    expect(parseReclbl(scan('ab'), 0, false)).toBeNull();
  });

  it('"{" preceded by text in the same field (recOpenTable mode guard)', () => {
    expect(parseReclbl(scan('a{b}'), 0, true)).toBeNull();
  });

  it('an unterminated nested table (propagated sub===null)', () => {
    expect(parseReclbl(scan('{a'), 0, true)).toBeNull();
  });

  it('a non-space text char right after a closed table (HASTABLE guard)', () => {
    expect(parseReclbl(scan('{a}b'), 0, true)).toBeNull();
  });
});

describe('parseReclbl — a space after a closed table is allowed', () => {
  it('"{a} " parses successfully (HASTABLE + space, no error)', () => {
    expect(parseReclbl(scan('{a} '), 0, true)).not.toBeNull();
  });
});

describe('parseReclbl — nested table LR inversion (recOpenTable)', () => {
  it('LR=1 at the top level inverts to LR=0 for the nested table', () => {
    const info = parseReclbl(scan('{a|b}'), 1, true)!;
    expect(info.fld![0]!.LR).toBe(0);
  });

  it('LR=0 at the top level inverts to LR=1 for the nested table', () => {
    const info = parseReclbl(scan('{a|b}'), 0, true)!;
    expect(info.fld![0]!.LR).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// parseReclbl — port names (recOpenPort/recClosePort/recPushPort)
// ---------------------------------------------------------------------------

describe('parseReclbl — port names', () => {
  it('a trailing soft space in a port name is collapsed', () => {
    const info = parseReclbl(scan('<ab >x'), 0, true)!;
    expect(info.fld![0]!.id).toBe('ab');
  });

  it('a port name ending in a non-space char is kept as-is (no pop)', () => {
    const info = parseReclbl(scan('<ab>x'), 0, true)!;
    expect(info.fld![0]!.id).toBe('ab');
  });

  it('collapses a doubled space inside a port name', () => {
    const info = parseReclbl(scan('<ab  cd>x'), 0, true)!;
    expect(info.fld![0]!.id).toBe('ab cd');
  });

  it('a hardspace (\\ ) in a port name blocks collapsing', () => {
    const info = parseReclbl(scan('<a \\ b>x'), 0, true)!;
    expect(info.fld![0]!.id).toBe('a  b');
  });
});

// ---------------------------------------------------------------------------
// parseReclbl — text fields (recFlushText/recPushText/recBackslash)
// ---------------------------------------------------------------------------

describe('parseReclbl — empty fields', () => {
  it('a leading "|" produces a single-space placeholder for the empty field', () => {
    const info = parseReclbl(scan('|a'), 0, true)!;
    expect(fieldText(info.fld![0]!)).toBe(' ');
    expect(fieldText(info.fld![1]!)).toBe('a');
  });
});

describe('parseReclbl — backslash escapes in text', () => {
  it('a trailing lone backslash (no next char) is kept literally', () => {
    const info = parseReclbl(scan('ab\\'), 0, true)!;
    expect(fieldText(info.fld![0]!)).toBe('ab\\');
  });

  it('a backslash before a control char drops the backslash but keeps the char', () => {
    // 'a', '\', TAB, 'b' — the escaped control char is handed to text push
    // directly (bypasses the outer loop's own control-char skip).
    const info = parseReclbl(scan('a\\\tb'), 0, true)!;
    expect(fieldText(info.fld![0]!)).toBe('a\tb');
  });

  it('a raw (unescaped) control char is silently dropped by the outer scan', () => {
    const info = parseReclbl(scan('a\tb'), 0, true)!;
    expect(fieldText(info.fld![0]!)).toBe('ab');
  });

  it('backslash-space sets a hardspace that blocks the next space collapse', () => {
    // 'a',' ','\',' ','b' — without the hardspace the second space would
    // collapse against the first; with it, both survive.
    const info = parseReclbl(scan('a \\ b'), 0, true)!;
    expect(fieldText(info.fld![0]!)).toBe('a  b');
  });

  it('in HTML mode, backslash-space is NOT a hardspace (kept as literal "\\")', () => {
    const info = parseReclbl(scan('x\\ y', true), 0, true)!;
    expect(fieldText(info.fld![0]!)).toBe('x\\ y');
  });

  it('two consecutive real spaces collapse to one (non-html)', () => {
    const info = parseReclbl(scan('a  b'), 0, true)!;
    expect(fieldText(info.fld![0]!)).toBe('a b');
  });

  it('two consecutive real spaces do NOT collapse in HTML mode', () => {
    const info = parseReclbl(scan('a  b', true), 0, true)!;
    expect(fieldText(info.fld![0]!)).toBe('a  b');
  });
});

describe('parseReclbl — HTML mode passes "<" and ">" through as literal text', () => {
  it('"<a>" is literal text, not port syntax, when lbl.html is true', () => {
    const info = parseReclbl(scan('<a>', true), 0, true)!;
    expect(fieldText(info.fld![0]!)).toBe('<a>');
    expect(info.fld![0]!.id).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// sizeReclbl — recLabelDimen margin handling
// ---------------------------------------------------------------------------

describe('sizeReclbl — recLabelDimen margin handling', () => {
  const g = makeGraph();

  it('a zero-size label (empty text) skips padding entirely', () => {
    const n = addNode(g, 'z1');
    const lp = makeLabel('', 'Times,serif', 14, 'black', { measure: () => ({ w: 0, h: 0 }) });
    expect(sizeReclbl(n, g, field({ lp }))).toEqual({ x: 0, y: 0 });
  });

  it('height-only nonzero dimen still triggers padding (OR second operand)', () => {
    const n = addNode(g, 'z2');
    const lp = makeLabel('x', 'Times,serif', 14, 'black', { measure: () => ({ w: 0, h: 5 }) });
    expect(sizeReclbl(n, g, field({ lp }))).toEqual({ x: 16, y: 13 });
  });

  it('an invalid (non-numeric) margin attr falls back to PAD_X/PAD_Y', () => {
    const n = addNode(g, 'z3', { margin: 'abc' });
    const lp = makeLabel('x', 'Times,serif', 14, 'black', { measure: () => ({ w: 10, h: 10 }) });
    expect(sizeReclbl(n, g, field({ lp }))).toEqual({ x: 26, y: 18 });
  });

  it('a single-value margin attr pads both axes by the same amount', () => {
    const n = addNode(g, 'z4', { margin: '0.25' });
    const lp = makeLabel('x', 'Times,serif', 14, 'black', { measure: () => ({ w: 10, h: 10 }) });
    expect(sizeReclbl(n, g, field({ lp }))).toEqual({ x: 46, y: 46 });
  });

  it('a two-value margin attr pads x/y independently', () => {
    const n = addNode(g, 'z5', { margin: '0.1,0.2' });
    const lp = makeLabel('x', 'Times,serif', 14, 'black', { measure: () => ({ w: 10, h: 10 }) });
    const sz = sizeReclbl(n, g, field({ lp }));
    expect(sz.x).toBeCloseTo(24.4, 5);
    expect(sz.y).toBeCloseTo(38.8, 5);
  });

  it('a two-value margin with an invalid second value falls back to the first', () => {
    const n = addNode(g, 'z6', { margin: '0.1,xyz' });
    const lp = makeLabel('x', 'Times,serif', 14, 'black', { measure: () => ({ w: 10, h: 10 }) });
    const sz = sizeReclbl(n, g, field({ lp }));
    expect(sz.x).toBeCloseTo(24.4, 5);
    expect(sz.y).toBeCloseTo(24.4, 5);
  });
});

// ---------------------------------------------------------------------------
// recSideMask
// ---------------------------------------------------------------------------

describe('recSideMask', () => {
  it('LR=1, single field (i===0===last) → all four sides', () => {
    expect(recSideMask(field({ LR: 1 }), 0, 0)).toBe(TOP | BOTTOM | RIGHT | LEFT);
  });

  it('LR=0, single field (i===0===last) → all four sides', () => {
    expect(recSideMask(field({ LR: 0 }), 0, 0)).toBe(TOP | BOTTOM | RIGHT | LEFT);
  });

  it('LR=0, first of several → TOP|RIGHT|LEFT', () => {
    expect(recSideMask(field({ LR: 0 }), 0, 2)).toBe(TOP | RIGHT | LEFT);
  });

  it('LR=0, last of several → LEFT|BOTTOM|RIGHT', () => {
    expect(recSideMask(field({ LR: 0 }), 2, 2)).toBe(LEFT | BOTTOM | RIGHT);
  });

  it('LR=0, middle → LEFT|RIGHT', () => {
    expect(recSideMask(field({ LR: 0 }), 1, 2)).toBe(LEFT | RIGHT);
  });
});

// ---------------------------------------------------------------------------
// posReclbl
// ---------------------------------------------------------------------------

describe('posReclbl', () => {
  it('sides=0 propagates a zero mask to every child (no side exposure)', () => {
    const child = field({ size: { x: 10, y: 10 } });
    const root = field({ n_flds: 1, fld: [child], LR: 0, size: { x: 10, y: 10 } });
    posReclbl(root, { x: 0, y: 10 }, 0);
    expect(child.sides).toBe(0);
  });

  it('places children top-to-bottom (LR=0) and sets the exposed-sides mask', () => {
    const c0 = field({ size: { x: 20, y: 10 } });
    const c1 = field({ size: { x: 20, y: 10 } });
    const root = field({ n_flds: 2, fld: [c0, c1], LR: 0, size: { x: 20, y: 20 } });
    posReclbl(root, { x: -10, y: 10 }, TOP | BOTTOM | RIGHT | LEFT);
    expect(root.b).toEqual({ ll: { x: -10, y: -10 }, ur: { x: 10, y: 10 } });
    expect(c0.b).toEqual({ ll: { x: -10, y: 0 }, ur: { x: 10, y: 10 } });
    expect(c1.b).toEqual({ ll: { x: -10, y: -10 }, ur: { x: 10, y: 0 } });
    expect(c0.sides).toBe(TOP | RIGHT | LEFT);
    expect(c1.sides).toBe(LEFT | BOTTOM | RIGHT);
  });
});

// ---------------------------------------------------------------------------
// recParseOrFallback
// ---------------------------------------------------------------------------

describe('recParseOrFallback', () => {
  it('returns the parsed field tree for a well-formed label', () => {
    const lbl = makeLabel('a|b', 'Times,serif', 14, 'black', stubMeasurer);
    const info = recParseOrFallback(lbl, stubMeasurer, 1);
    expect(info.n_flds).toBe(2);
  });

  it('falls back to "\\N" when the label text is malformed', () => {
    const lbl = makeLabel('<a><b>', 'Times,serif', 14, 'black', stubMeasurer);
    const info = recParseOrFallback(lbl, stubMeasurer, 1);
    expect(info.n_flds).toBe(1);
    expect(fieldText(info.fld![0]!)).toBe('\\N');
  });
});

// ---------------------------------------------------------------------------
// recordInit — fixedsize (attrBool) branch matrix
// ---------------------------------------------------------------------------

describe('recordInit — fixedsize (attrBool) branch matrix', () => {
  const bigMeasurer: TextMeasurer = { measure: () => ({ w: 200, h: 100 }) };

  function widthHeight(fixedsize?: string): { w: number; h: number } {
    const g = makeGraph();
    const n = addNode(g, 'n', fixedsize !== undefined ? { fixedsize } : {});
    n.info.label = makeLabel('big field', 'Times,serif', 14, 'black', bigMeasurer);
    recordInit(n, g, bigMeasurer);
    return { w: n.info.width, h: n.info.height };
  }

  it('fixedsize unset → expands to fit the (larger) label', () => {
    const { w, h } = widthHeight(undefined);
    expect(w).toBeCloseTo(3.0, 4);
    expect(h).toBeCloseTo(109 / 72, 4);
  });

  it('fixedsize="false" → expands (explicit false branch)', () => {
    expect(widthHeight('false').w).toBeCloseTo(3.0, 4);
  });

  it('fixedsize="no" → expands', () => {
    expect(widthHeight('no').w).toBeCloseTo(3.0, 4);
  });

  it('fixedsize="true" → clamps to the default node size', () => {
    const { w, h } = widthHeight('true');
    expect(w).toBeCloseTo(0.75, 4);
    expect(h).toBeCloseTo(37 / 72, 4);
  });

  it('fixedsize="yes" → clamps', () => {
    expect(widthHeight('yes').w).toBeCloseTo(0.75, 4);
  });

  it('fixedsize="1" (digit, non-zero) → clamps (parseInt fallback path)', () => {
    expect(widthHeight('1').w).toBeCloseTo(0.75, 4);
  });

  it('fixedsize="0" (digit, zero) → expands (parseInt fallback path)', () => {
    expect(widthHeight('0').w).toBeCloseTo(3.0, 4);
  });

  // KNOWN PORT BUG (not fixed here — test-only task): C's mapBool takes the
  // atoi() fallback only when the FIRST character is a digit (gv_isdigit);
  // for any other string it returns the default (false). record.ts's local
  // attrBool always falls through to `parseInt(s, 10) !== 0`, and
  // parseInt('abc', 10) is NaN, so attrBool('abc') is TRUE instead of C's
  // FALSE. The project's own canonical mapbool (src/layout/dot/rank.ts)
  // already gets this right — record.ts should delegate to it instead of
  // reimplementing a divergent copy.
  // @see lib/common/utils.c:325 mapBool (gv_isdigit(*p) guard)
  // @see src/layout/dot/rank.ts:mapbool (the correct port)
  it.todo(
    'fixedsize="abc" (non-digit) should expand like C (defaultValue=false); ' +
    'attrBool\'s unconditional parseInt fallback makes it clamp instead',
  );
});

describe('recordInit — rankdir ?? fallback', () => {
  it('treats a missing g.root.info.rankdir as 0 (flip=1)', () => {
    const g = makeGraph();
    const n = addNode(g, 'n');
    n.info.label = makeLabel('a|b', 'Times,serif', 14, 'black', stubMeasurer);
    (g.root.info as unknown as { rankdir?: number }).rankdir = undefined;
    expect(() => recordInit(n, g, stubMeasurer)).not.toThrow();
    expect((n.info.shape_info as FieldT).LR).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// recordNodeInit
// ---------------------------------------------------------------------------

describe('recordNodeInit', () => {
  it('builds the label AND the field tree in one call', () => {
    const g = makeGraph();
    const n = addNode(g, 'n', { label: 'left|right' });
    recordNodeInit(n, g, stubMeasurer);
    expect(n.info.label).toBeDefined();
    expect((n.info.shape_info as FieldT).n_flds).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// genFields — coord fallback
// ---------------------------------------------------------------------------

describe('genFields — coord fallback', () => {
  it('uses {0,0} when n.info.coord is undefined', () => {
    const lp = makeLabel('X', 'Times,serif', 14, 'black', stubMeasurer);
    const f = field({ lp, b: { ll: { x: 0, y: 0 }, ur: { x: 20, y: 10 } } });
    const g = makeGraph();
    const n = addNode(g, 'n');
    n.info.coord = undefined as unknown as Point;
    genFields(stubJob(stubRenderer()), n, f);
    expect(lp.pos).toEqual({ x: 10, y: 5 });
  });
});

// ---------------------------------------------------------------------------
// recordGencode — guards
// ---------------------------------------------------------------------------

describe('recordGencode — guards', () => {
  it('no renderer → returns without drawing', () => {
    const g = makeGraph();
    const n = addNode(g, 'n');
    n.info.shape_info = field({});
    expect(() => recordGencode({ renderer: undefined } as unknown as RenderJob, n)).not.toThrow();
  });

  it('no shape_info → returns without drawing', () => {
    const g = makeGraph();
    const n = addNode(g, 'n');
    const renderer = stubRenderer();
    recordGencode(stubJob(renderer), n);
    expect(renderer.polygon).not.toHaveBeenCalled();
  });

  it('coord fallback to {0,0} when n.info.coord is undefined', () => {
    const g = makeGraph();
    const n = addNode(g, 'n');
    n.info.coord = undefined as unknown as Point;
    n.info.shape_info = field({ b: { ll: { x: -5, y: -5 }, ur: { x: 5, y: 5 } } });
    const renderer = stubRenderer();
    recordGencode(stubJob(renderer), n);
    expect(renderer.polygon).toHaveBeenCalledTimes(1);
    const [pts] = renderer.polygon.mock.calls[0]!;
    expect(pts).toEqual([
      { x: -5, y: -5 }, { x: -5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: -5 },
    ]);
  });
});
