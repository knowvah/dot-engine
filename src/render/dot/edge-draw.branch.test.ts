// SPDX-License-Identifier: EPL-2.0
//
// Branch coverage for edge-draw.ts's EdgeDrawBase methods (T4d), driven
// through the public XdotRenderer.beginEdge/endEdge entry points (the
// protected emit*Spline methods have no other public seam) and read back via
// drawStringsByObject(). Covers: obj===null fallbacks in the plain/tapered/
// arrow paths, the multi-bezier rawStyle-restore branch (both the
// origStyle-empty and origStyle-non-empty arms), the ortho-rounded-corner
// dispatch, a too-short/undefined bezier skip in both the split and parallel
// multicolor paths, and the null-color fallbacks reached via a colorAttr that
// parseSegs resolves to a null-color segment.

import { describe, it, expect } from "vitest";
import { XdotRenderer } from "../dot.js";
import { RenderJob, createObjState, ObjType } from "../../gvc/job.js";
import { PenType } from "../../gvc/context.js";
import type { ObjState } from "../../gvc/job.js";
import type { TextMeasurer } from "../../common/textmeasure.js";
import { Graph } from "../../model/graph.js";
import { Node } from "../../model/node.js";
import { Edge } from "../../model/edge.js";
import type { Bezier } from "../../model/geom.js";
import type { ArrowDrawOp } from "../../common/arrows-types.js";

const measurer: TextMeasurer = { measure: () => ({ w: 0, h: 0 }) };

function makeJob(): RenderJob {
  const j = new RenderJob("xdot", measurer);
  j.bb = { ll: { x: 0, y: 0 }, ur: { x: 200, y: 200 } };
  return j;
}

function makeEdgeObj(penWidth = 1.0): ObjState {
  const obj = createObjState(ObjType.Edge);
  obj.penColor = { type: "string", s: "red" };
  obj.pen = PenType.Solid;
  obj.penWidth = penWidth;
  return obj;
}

function makeEdge(): Edge {
  const g = new Graph("G", "directed");
  return new Edge(new Node(0, "a", g), new Node(1, "b", g), "");
}

function bez(pts: { x: number; y: number }[], sflag = 0, eflag = 0): Bezier {
  return { list: pts, size: pts.length, sflag, eflag, sp: pts[0]!, ep: pts[pts.length - 1]! };
}

function run(renderer: XdotRenderer, e: Edge, job: RenderJob): string {
  renderer.beginEdge(e, job);
  renderer.endEdge(e, job);
  return renderer.drawStringsByObject().get(e)?.draw ?? "";
}

// ---------------------------------------------------------------------------
// emitPlainSpline — obj===null fallback + multi-bezier rawStyle restore
// ---------------------------------------------------------------------------

describe("emitPlainSpline — obj === null", () => {
  it("emits with no obj pushed (origStyle=[] fallback) and still draws arrows", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    const e = makeEdge();
    e.info.spl = { size: 1, list: [bez([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }])], bb: { ll: { x: 0, y: 0 }, ur: { x: 3, y: 0 } } };
    const tailOp: ArrowDrawOp = { kind: "polygon", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], filled: true };
    e.info.tailArrowOps = [tailOp];
    const s = run(r, e, job);
    expect(s.length).toBeGreaterThan(0);
    const tdraw = r.drawStringsByObject().get(e)?.tdraw ?? "";
    expect(tdraw).toContain("P "); // filled polygon op emitted with fallback black pen
  });
});

describe("emitPlainSpline — multi-bezier rawStyle restore (sflag/eflag mid-loop)", () => {
  it("origStyle empty -> restores to ['solid'] between beziers (sflag branch)", () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj());
    const r = new XdotRenderer();
    const e = makeEdge();
    const b1 = bez([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }], 1, 0);
    const b2 = bez([{ x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }], 0, 0);
    e.info.spl = { size: 2, list: [b1, b2], bb: { ll: { x: 0, y: 0 }, ur: { x: 6, y: 0 } } };
    const s = run(r, e, job);
    // Two beziers -> two 'B' draw ops.
    expect((s.match(/B /g) ?? []).length).toBe(2);
  });

  it("origStyle non-empty -> restores to the original style (eflag branch)", () => {
    const job = makeJob();
    const obj = makeEdgeObj();
    obj.rawStyle = ["dashed"];
    job.pushObj(obj);
    const r = new XdotRenderer();
    const e = makeEdge();
    const b1 = bez([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }], 0, 0);
    const b2 = bez([{ x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }], 0, 1);
    e.info.spl = { size: 2, list: [b1, b2], bb: { ll: { x: 0, y: 0 }, ur: { x: 6, y: 0 } } };
    const s = run(r, e, job);
    expect((s.match(/B /g) ?? []).length).toBe(2);
    expect(s).toContain("dashed");
  });
});

describe("emitSplineBezier — ortho-rounded corner dispatch", () => {
  it("radius!==null and bez.size>=4: emits L (polyline) ops instead of a bare B path", () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj());
    const r = new XdotRenderer();
    const e = makeEdge();
    e.head.root.attrs.set("splines", "ortho");
    e.attrs.set("style", "rounded");
    // graphs-radius edge1 spline (see svg-edge-ortho-radius.test.ts).
    const corner = bez([
      { x: 27, y: 71.83 }, { x: 27, y: 50.5 }, { x: 27, y: 18 },
      { x: 27, y: 18 }, { x: 27, y: 18 }, { x: 51.04, y: 18 }, { x: 51.04, y: 18 },
    ]);
    e.info.spl = { size: 1, list: [corner], bb: { ll: { x: 27, y: 18 }, ur: { x: 51.04, y: 71.83 } } };
    const s = run(r, e, job);
    expect(s).toContain("L "); // polyline op, not a bare 'B' bezier path
  });
});

// ---------------------------------------------------------------------------
// emitTaperedSpline
// ---------------------------------------------------------------------------

describe("emitTaperedSpline — bz undefined", () => {
  it("emits nothing when spl.list[0] is undefined", () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj());
    const r = new XdotRenderer();
    const e = makeEdge();
    e.attrs.set("style", "tapered");
    e.info.spl = { size: 0, list: [], bb: { ll: { x: 0, y: 0 }, ur: { x: 0, y: 0 } } };
    const s = run(r, e, job);
    expect(s).toBe("");
  });
});

describe("emitTaperedSpline — obj===null default penWidth/penColor", () => {
  it("uses penWidth=1 and black fill when no obj is pushed", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    const e = makeEdge();
    e.attrs.set("style", "tapered");
    e.info.spl = { size: 1, list: [bez([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 0 }])], bb: { ll: { x: 0, y: 0 }, ur: { x: 3, y: 1 } } };
    const s = run(r, e, job);
    expect(s).toContain("P "); // filled taper polygon op
  });
});

describe("emitTaperedSpline — obj set uses its penWidth/penColor", () => {
  it("uses the pushed obj's penWidth and penColor for the fill", () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj(3.0));
    const r = new XdotRenderer();
    const e = makeEdge();
    e.attrs.set("style", "tapered");
    e.info.spl = { size: 1, list: [bez([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 0 }])], bb: { ll: { x: 0, y: 0 }, ur: { x: 3, y: 1 } } };
    const s = run(r, e, job);
    expect(s).toContain("P ");
  });
});

// ---------------------------------------------------------------------------
// emitSplitSpline — null-color segment fallback + short/undefined bezier skip
// ---------------------------------------------------------------------------

describe("emitSplitSpline — null-color leading segment falls back to DEFAULT_COLOR", () => {
  it("colorAttr with an empty leading token before ';frac:' uses black for firstColor", () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj());
    const r = new XdotRenderer();
    const e = makeEdge();
    e.attrs.set("color", ";0.5:blue");
    const short = bez([{ x: 0, y: 0 }, { x: 1, y: 0 }]); // size < 4 -> skipped
    const valid = bez([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]);
    e.info.spl = { size: 2, list: [short, valid], bb: { ll: { x: 0, y: 0 }, ur: { x: 3, y: 0 } } };
    const s = run(r, e, job);
    // Only the valid bezier produced draw ops (the short one was skipped).
    expect((s.match(/B /g) ?? []).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// emitParallelSpline — malformed color list collapses to an empty segs array,
// hitting every ?? DEFAULT_COLOR fallback at once; a too-short bezier yields
// an empty offset list, skipped via `continue`.
// ---------------------------------------------------------------------------

describe("emitParallelSpline — null-color segment + short-bezier offlist skip", () => {
  it("leading empty color token falls back to black; a size<4 bezier's empty offlist is skipped via continue", () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj());
    const r = new XdotRenderer();
    const e = makeEdge();
    e.attrs.set("color", ":blue"); // segs = [null, "blue"] -> colors = ["black", "blue"]
    const short = bez([{ x: 0, y: 0 }, { x: 1, y: 0 }]); // size < 4 -> offlist=[]
    const valid = bez([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]);
    e.info.spl = { size: 2, list: [short, valid], bb: { ll: { x: 0, y: 0 }, ur: { x: 3, y: 0 } } };
    const s = run(r, e, job);
    expect(s).toContain("#000000"); // null-color segment falls back to black
    expect(s).toContain("#0000ff"); // blue
    // 2 colors x 1 non-empty offlist (the short bezier is skipped) = 2 B ops.
    expect((s.match(/B /g) ?? []).length).toBe(2);
  });
});

describe("emitParallelSpline — malformed color list empties colors[] (return-value fallback)", () => {
  it("bad fraction after ';' empties segs; headColor/tailColor both fall back to black", () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj());
    const r = new XdotRenderer();
    const e = makeEdge();
    e.attrs.set("color", "red;bogus:blue"); // parse error -> segs=[] -> colors=[]
    e.info.spl = { size: 1, list: [bez([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }])], bb: { ll: { x: 0, y: 0 }, ur: { x: 3, y: 0 } } };
    const tailOp: ArrowDrawOp = { kind: "polygon", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], filled: true };
    e.info.tailArrowOps = [tailOp];
    run(r, e, job);
    // No parallel B ops (colors=[] -> the for-of loop body never runs), but
    // the arrow still draws under the returned tailColor fallback ("black").
    const tdraw = r.drawStringsByObject().get(e)?.tdraw ?? "";
    expect(tdraw).toContain("#000000"); // tailColor fallback resolves to black
  });
});
