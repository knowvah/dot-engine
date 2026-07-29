// SPDX-License-Identifier: EPL-2.0
//
// Branch coverage for svg-parallel-edge.ts (T4d): emitOffsetBezier's
// penWidth-threshold and stroke-opacity (partial-alpha color) branches,
// buildSegData's short/undefined-bezier skip (paired with emitColorPasses'
// empty-offlist continue), the spl-undefined and no-colon ?? fallbacks in
// emitParallelEdgePaths, and the empty-colors[] headColor/tailColor
// fallbacks reached via a malformed color list.

import { describe, it, expect } from "vitest";
import { emitParallelEdgePaths } from "./svg-parallel-edge.js";
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

const VALID_BEZ: Bezier = {
  list: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
  size: 4, sflag: 0, eflag: 0, sp: { x: 0, y: 0 }, ep: { x: 3, y: 0 },
};

describe("emitParallelEdgePaths — spl undefined falls back to an empty bezier list", () => {
  it("draws nothing but still resolves headColor/tailColor from the color list", () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj());
    const e = makeEdge(); // no e.info.spl set
    const result = emitParallelEdgePaths(e, job, "red:blue");
    expect(result).toEqual({ headColor: "red", tailColor: "blue" });
    expect(job.output.join("")).toBe("");
  });
});

describe("emitParallelEdgePaths — colorList with no ':' (numc=0 fallback)", () => {
  it("still resolves a single-color pass", () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj());
    const e = makeEdge();
    e.info.spl = { size: 1, list: [VALID_BEZ], bb: { ll: { x: 0, y: 0 }, ur: { x: 3, y: 0 } } };
    const result = emitParallelEdgePaths(e, job, "red");
    expect(result.headColor).toBe("red");
    expect(job.output.join("")).toContain("<path");
  });
});

describe("emitParallelEdgePaths — short bezier skipped (empty offlist -> continue)", () => {
  it("a size<4 bezier contributes no path", () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj());
    const e = makeEdge();
    const short: Bezier = { list: [{ x: 0, y: 0 }, { x: 1, y: 1 }], size: 2, sflag: 0, eflag: 0, sp: { x: 0, y: 0 }, ep: { x: 1, y: 1 } };
    e.info.spl = { size: 1, list: [short], bb: { ll: { x: 0, y: 0 }, ur: { x: 1, y: 1 } } };
    const result = emitParallelEdgePaths(e, job, "red:blue");
    expect(result).toEqual({ headColor: "red", tailColor: "blue" });
    expect(job.output.join("")).toBe("");
  });
});

describe("emitParallelEdgePaths — malformed color list empties colors[]", () => {
  it("headColor/tailColor both fall back to DEFAULT_COLOR", () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj());
    const e = makeEdge();
    e.info.spl = { size: 1, list: [VALID_BEZ], bb: { ll: { x: 0, y: 0 }, ur: { x: 3, y: 0 } } };
    const result = emitParallelEdgePaths(e, job, "red;bogus:blue");
    expect(result).toEqual({ headColor: "black", tailColor: "black" });
  });
});

describe("emitOffsetBezier — penWidth threshold + partial-alpha stroke-opacity", () => {
  it("emits stroke-width and stroke-opacity for a wide, semi-transparent pen", () => {
    const job = makeJob();
    job.pushObj(makeEdgeObj(3.0));
    const e = makeEdge();
    e.info.spl = { size: 1, list: [VALID_BEZ], bb: { ll: { x: 0, y: 0 }, ur: { x: 3, y: 0 } } };
    emitParallelEdgePaths(e, job, "#ff000080"); // rgba with alpha=0x80 (partial)
    const out = job.output.join("");
    expect(out).toContain("stroke-width=");
    expect(out).toContain("stroke-opacity=");
  });
});
