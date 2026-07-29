// SPDX-License-Identifier: EPL-2.0
//
// Branch-coverage tests for svg-helpers.ts (T4d). Targets the obj===null
// fallback paths, text-decoration/anchor edge cases, and the ortho-rounded
// edge-emission branches identified as uncovered by the coverage-90 T4d
// digest. Every obj===null branch corresponds to a real call site: C's
// gvrender callbacks are invoked outside any push_obj_state window for some
// draw ops (e.g. background/page furniture), so job.obj can legitimately be
// null when these helpers run.

import { describe, it, expect } from 'vitest';
import {
  emitStyle, textAnchor, emitAnchorAttrs, svgBeginAnchor, svgTextspan,
  emitGradientDefs, svgEdgePath, orthoRoundedRadius, svgEdgePathOrthoRounded,
  emitArrowPolygon, svgArrowPolygons,
} from './svg-helpers.js';
import { RenderJob, createObjState, ObjType } from '../gvc/job.js';
import { PenType, FillType } from '../gvc/context.js';
import type { ObjState } from '../gvc/job.js';
import type { TextMeasurer } from '../common/textmeasure.js';
import { HTML_OL } from '../common/emit-types.js';
import type { TextSpan } from '../common/emit-types.js';
import { Graph } from '../model/graph.js';
import { Node } from '../model/node.js';
import { Edge } from '../model/edge.js';
import type { Bezier } from '../model/geom.js';
import type { ArrowDrawOp } from '../common/arrows-types.js';

const measurer: TextMeasurer = { measure: () => ({ w: 0, h: 0 }) };

function makeJob(): RenderJob {
  const j = new RenderJob('svg', measurer);
  j.devscale = { x: 1, y: -1 };
  j.translation = { x: 0, y: 0 };
  j.rotation = 0;
  j.zoom = 1;
  return j;
}

function makeEdgeObj(penWidth = 1.0): ObjState {
  const obj = createObjState(ObjType.Edge);
  obj.penColor = { type: 'string', s: 'red' };
  obj.pen = PenType.Solid;
  obj.penWidth = penWidth;
  return obj;
}

function makeEdge(): Edge {
  const g = new Graph('G', 'directed');
  return new Edge(new Node(0, 'a', g), new Node(1, 'b', g), '');
}

function bez(pts: { x: number; y: number }[], sflag = 0, eflag = 0): Bezier {
  return { list: pts, size: pts.length, sflag, eflag, sp: pts[0]!, ep: pts[pts.length - 1]! };
}

const out = (job: RenderJob): string => job.output.join('');

// ---------------------------------------------------------------------------
// emitStyle — job.obj === null fallback
// ---------------------------------------------------------------------------

describe('emitStyle — obj === null', () => {
  it('falls back to fill="none" stroke="black" and returns before pen attrs', () => {
    const job = makeJob();
    emitStyle(job, true);
    const s = out(job);
    expect(s).toBe(' fill="none" stroke="black"');
  });
});

// ---------------------------------------------------------------------------
// textAnchor
// ---------------------------------------------------------------------------

describe('textAnchor', () => {
  it('returns "end" for right justification', () => {
    expect(textAnchor('r')).toBe('end');
  });
});

// ---------------------------------------------------------------------------
// emitAnchorAttrs / svgBeginAnchor
// ---------------------------------------------------------------------------

describe('emitAnchorAttrs — target attribute', () => {
  it('emits target= when target is non-empty', () => {
    const job = makeJob();
    emitAnchorAttrs('', '', 'top', job);
    expect(out(job)).toBe(' target="top"');
  });
});

describe('svgBeginAnchor — no id', () => {
  it('emits a bare <g><a> when id is empty', () => {
    const job = makeJob();
    svgBeginAnchor('http://x', '', '', '', job);
    expect(out(job)).toContain('<g><a xlink:href="http://x">\n');
    expect(out(job)).not.toContain('<g id="a_');
  });
});

// ---------------------------------------------------------------------------
// svgTextspan — text-decoration and missing font-name branches
// ---------------------------------------------------------------------------

function makeSpan(overrides: Partial<TextSpan> = {}): TextSpan {
  return {
    str: 'hi',
    fontName: 'Times',
    fontSize: 14,
    fontColor: null,
    fontFlags: 0,
    yoffset_layout: 0,
    yoffset_centerline: 0,
    size: { x: 10, y: 10 },
    just: 'n',
    ...overrides,
  };
}

describe('svgTextspan — text-decoration=overline', () => {
  it('emits text-decoration="overline" for HTML_OL alone', () => {
    const job = makeJob();
    svgTextspan({ x: 0, y: 0 }, makeSpan({ fontFlags: HTML_OL }), job);
    expect(out(job)).toContain('text-decoration="overline"');
  });
});

describe('svgTextspan — unresolvable font name falls back to literal font-family', () => {
  it('uses span.fontName verbatim when fontFamilyAttrs returns null (fontName null)', () => {
    const job = makeJob();
    svgTextspan({ x: 0, y: 0 }, makeSpan({ fontName: null }), job);
    expect(out(job)).toContain('font-family="Times,serif"');
  });
});

// ---------------------------------------------------------------------------
// emitGradientDefs — job.obj === null
// ---------------------------------------------------------------------------

describe('emitGradientDefs — obj === null', () => {
  it('returns undefined even when filled=true, with no obj pushed', () => {
    const job = makeJob();
    expect(emitGradientDefs(job, [{ x: 0, y: 0 }], true)).toBeUndefined();
    expect(out(job)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// svgEdgePath — early returns, skip-short-bezier, obj===null arrow paths,
// and the "remaining arrows" fallback (arrow ops present but no bezier
// flagged the arrow in-loop).
// ---------------------------------------------------------------------------

describe('svgEdgePath — no spline', () => {
  it('emits nothing when e.info.spl is undefined', () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj());
    const e = makeEdge();
    svgEdgePath(e, job);
    expect(out(job)).toBe('');
  });
});

describe('svgEdgePath — skips a too-short bezier', () => {
  it('continues past a bezier with size < 4 and emits nothing', () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj());
    const e = makeEdge();
    e.info.spl = { size: 1, list: [bez([{ x: 0, y: 0 }, { x: 1, y: 1 }])], bb: { ll: { x: 0, y: 0 }, ur: { x: 1, y: 1 } } };
    svgEdgePath(e, job);
    expect(out(job)).toBe('');
  });
});

describe('svgEdgePath — obj===null stroke fallback + remaining-arrows fallback', () => {
  it('uses stroke="black" and still emits arrow ops not flagged in-loop', () => {
    const job = makeJob(); // no obj pushed
    const e = makeEdge();
    const b = bez([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }], 0, 0);
    e.info.spl = { size: 1, list: [b], bb: { ll: { x: 0, y: 0 }, ur: { x: 3, y: 0 } } };
    const tailOp: ArrowDrawOp = { kind: 'polygon', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }], filled: true };
    const headOp: ArrowDrawOp = { kind: 'polygon', points: [{ x: 3, y: 0 }, { x: 4, y: 1 }, { x: 5, y: 0 }], filled: true };
    e.info.tailArrowOps = [tailOp];
    e.info.headArrowOps = [headOp];
    svgEdgePath(e, job);
    const s = out(job);
    expect(s).toContain('stroke="black"');
    // Both arrow ops still emitted via the "remaining arrows" fallback path
    // (bz.sflag/eflag were 0, so neither was drawn in-loop).
    const polys = s.match(/<polygon/g);
    expect(polys).toHaveLength(2);
    expect(s).toContain('fill="black"'); // arrow polygons use pen color (obj null -> black)
  });
});

// ---------------------------------------------------------------------------
// orthoRoundedRadius
// ---------------------------------------------------------------------------

function makeOrthoEdge(styleAttr?: string, radiusAttr?: string): Edge {
  const g = new Graph('G', 'directed');
  g.attrs.set('splines', 'ortho');
  const e = new Edge(new Node(0, 'a', g), new Node(1, 'b', g), '');
  if (styleAttr !== undefined) e.attrs.set('style', styleAttr);
  if (radiusAttr !== undefined) e.attrs.set('radius', radiusAttr);
  return e;
}

describe('orthoRoundedRadius — style=rounded, default radius, obj null', () => {
  it('computes default radius max(12, penwidth*8) with obj null (pw=1.0)', () => {
    const job = makeJob(); // obj null
    const e = makeOrthoEdge('rounded');
    expect(orthoRoundedRadius(e, job)).toBe(12);
  });
});

describe('orthoRoundedRadius — style=rounded, default radius, obj set', () => {
  it('scales the default radius from job.obj.penWidth', () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj(3.0));
    const e = makeOrthoEdge('rounded');
    expect(orthoRoundedRadius(e, job)).toBe(24);
  });
});

describe('orthoRoundedRadius — non-numeric radius attr falls back to 0', () => {
  it('treats an unparsable radius as 0 (atof semantics), yielding no rounding', () => {
    const job = makeJob();
    const e = makeOrthoEdge(undefined, 'abc');
    expect(orthoRoundedRadius(e, job)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// svgEdgePathOrthoRounded
// ---------------------------------------------------------------------------

describe('svgEdgePathOrthoRounded — no spline', () => {
  it('emits nothing when e.info.spl is undefined', () => {
    const job = makeJob();
    const e = makeEdge();
    svgEdgePathOrthoRounded(e, 12, job);
    expect(out(job)).toBe('');
  });
});

describe('svgEdgePathOrthoRounded — skips a too-short bezier', () => {
  it('continues past a bezier with size < 4', () => {
    const job = makeJob();
    const e = makeEdge();
    e.info.spl = { size: 1, list: [bez([{ x: 0, y: 0 }, { x: 1, y: 1 }])], bb: { ll: { x: 0, y: 0 }, ur: { x: 1, y: 1 } } };
    svgEdgePathOrthoRounded(e, 12, job);
    expect(out(job)).toBe('');
  });
});

describe('svgEdgePathOrthoRounded — no corner found falls back to bezier path, obj null', () => {
  it('emits a <path> (not a <polyline>) for a diagonal bezier', () => {
    const job = makeJob(); // obj null
    const e = makeEdge();
    // Diagonal (non-orthogonal) bezier — orthoRoundedPolylines returns [].
    const b = bez([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }]);
    e.info.spl = { size: 1, list: [b], bb: { ll: { x: 0, y: 0 }, ur: { x: 3, y: 3 } } };
    svgEdgePathOrthoRounded(e, 12, job);
    const s = out(job);
    expect(s).toContain('<path fill="none" stroke="black"');
    expect(s).not.toContain('<polyline');
  });
});

// ---------------------------------------------------------------------------
// emitArrowPolygon — non-default penwidth + non-empty points
// ---------------------------------------------------------------------------

describe('emitArrowPolygon — non-default penwidth emits stroke-width', () => {
  it('emits stroke-width and repeats the first point (Adobe compat)', () => {
    const job = makeJob();
    emitArrowPolygon([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }], 'red', job, 3.0);
    const s = out(job);
    expect(s).toContain('stroke-width="3"');
    // First point repeated at the end of the points list.
    const pointsAttr = /points="([^"]*)"/.exec(s)![1]!;
    const coords = pointsAttr.trim().split(/\s+/);
    expect(coords[0]).toBe(coords[coords.length - 1]);
  });
});

// ---------------------------------------------------------------------------
// svgArrowPolygons — obj === null
// ---------------------------------------------------------------------------

describe('svgArrowPolygons — obj === null', () => {
  it('uses black pen color and default penwidth for tail arrow ops', () => {
    const job = makeJob(); // obj null
    const e = makeEdge();
    e.info.tailArrowOps = [
      { kind: 'polygon', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }], filled: true },
    ];
    svgArrowPolygons(e, job);
    const s = out(job);
    expect(s).toContain('<polygon fill="black" stroke="black"');
  });
});
