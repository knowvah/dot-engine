// SPDX-License-Identifier: EPL-2.0
//
// Branch coverage for svg-edge-split.ts (T4d): splitBSpline's multi-cubic
// break-out-early loop, stepSegment's zero-t skip / null-color fallback /
// immediate-done branch, and emitSplitEdgePaths' undefined-spline early
// return, short/undefined-bezier skip, null firstColor fallback, and the
// obj penWidth threshold in emitCurve.

import { describe, it, expect } from "vitest";
import { splitSplineByColor, emitSplitEdgePaths } from "./svg-edge-split.js";
import { RenderJob, createObjState, ObjType } from "../gvc/job.js";
import { PenType } from "../gvc/context.js";
import type { TextMeasurer } from "../common/textmeasure.js";
import { Graph } from "../model/graph.js";
import { Node } from "../model/node.js";
import { Edge } from "../model/edge.js";
import type { Bezier } from "../model/geom.js";

const measurer: TextMeasurer = { measure: () => ({ w: 0, h: 0 }) };

function makeJob(): RenderJob {
  const j = new RenderJob("svg", measurer);
  j.devscale = { x: 1, y: -1 };
  j.translation = { x: 0, y: 0 };
  j.zoom = 1;
  j.rotation = 0;
  return j;
}

function makeEdgeObj(penWidth = 1.0): ReturnType<typeof createObjState> {
  const obj = createObjState(ObjType.Edge);
  obj.penColor = { type: "string", s: "black" };
  obj.pen = PenType.Solid;
  obj.penWidth = penWidth;
  return obj;
}

function makeEdge(): Edge {
  const g = new Graph("G", "directed");
  return new Edge(new Node(0, "a", g), new Node(1, "b", g), "");
}

const TWO_CUBIC = [
  { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
  { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 },
];

// ---------------------------------------------------------------------------
// splitBSpline (via splitSplineByColor) — multi-cubic break-out
// ---------------------------------------------------------------------------

describe("splitSplineByColor — multi-cubic split breaks the length-scan loop early", () => {
  it("splits a 2-cubic bspline at t=0.5, producing a left/right sub-curve pair", () => {
    const result = splitSplineByColor(TWO_CUBIC, [{ color: "red", t: 0.5 }, { color: "blue", t: 0.5 }]);
    expect(result.curves.length).toBe(2);
    expect(result.endColor).toBe("blue");
  });
});

// ---------------------------------------------------------------------------
// stepSegment — zero-t skip, null-color fallback, immediate-done
// ---------------------------------------------------------------------------

describe("stepSegment — zero-t segment is skipped", () => {
  it("a t=0 leading segment contributes no sub-curve", () => {
    const result = splitSplineByColor(TWO_CUBIC, [{ color: "red", t: 0 }, { color: "blue", t: 1 }]);
    expect(result.curves.length).toBe(1);
    expect(result.curves[0]!.color).toBe("blue");
  });
});

describe("stepSegment — null color falls back to DEFAULT_COLOR, single full-t segment sets done", () => {
  it("a single t=1 segment with color=null produces one black sub-curve", () => {
    const result = splitSplineByColor(TWO_CUBIC, [{ color: null, t: 1 }]);
    expect(result.curves.length).toBe(1);
    expect(result.curves[0]!.color).toBe("black");
    expect(result.endColor).toBe("black");
  });
});

// ---------------------------------------------------------------------------
// emitSplitEdgePaths — undefined spline, short/undefined bezier skip, null
// firstColor fallback, penWidth threshold
// ---------------------------------------------------------------------------

describe("emitSplitEdgePaths — spl undefined", () => {
  it("returns firstColor/endColor without drawing when e.info.spl is undefined", () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj());
    const e = makeEdge();
    const result = emitSplitEdgePaths(e, job, "red:blue");
    expect(result).toEqual({ firstColor: "red", endColor: "red" });
    expect(job.output.join("")).toBe("");
  });
});

describe("emitSplitEdgePaths — short/undefined bezier is skipped; null firstColor falls back", () => {
  it("a size<4 bezier is skipped and a leading empty color falls back to black", () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj(3.0)); // also exercises the penWidth-threshold branch
    const e = makeEdge();
    const short: Bezier = { list: [{ x: 0, y: 0 }, { x: 1, y: 1 }], size: 2, sflag: 0, eflag: 0, sp: { x: 0, y: 0 }, ep: { x: 1, y: 1 } };
    const valid: Bezier = { list: TWO_CUBIC.slice(0, 4), size: 4, sflag: 0, eflag: 0, sp: TWO_CUBIC[0]!, ep: TWO_CUBIC[3]! };
    e.info.spl = { size: 2, list: [short, valid], bb: { ll: { x: 0, y: 0 }, ur: { x: 6, y: 0 } } };
    const result = emitSplitEdgePaths(e, job, ";1"); // leading empty color -> null -> black
    expect(result.firstColor).toBe("black");
    const out = job.output.join("");
    expect(out).toContain("<path");
    expect(out).toContain("stroke-width="); // penWidth=3 threshold branch
  });
});
