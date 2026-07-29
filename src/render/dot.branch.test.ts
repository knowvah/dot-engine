// SPDX-License-Identifier: EPL-2.0
//
// Branch coverage for dot.ts / XdotRenderer (T4d): pageBackground's
// transparent-bgcolor + pad + radial-gradient dispatch, attachEdgeDraws'
// nothing-flushed early return, textspan's obj===null / null fontName /
// null fontColor branches, penOp/fillOp/styleOp/getBuf's obj===null
// fallbacks, and styleOp's dashed/dotted rawStyle-empty fallback.

import { describe, it, expect } from "vitest";
import { XdotRenderer } from "./dot.js";
import { RenderJob, createObjState, ObjType } from "../gvc/job.js";
import { PenType } from "../gvc/context.js";
import type { TextMeasurer } from "../common/textmeasure.js";
import type { TextSpan } from "../common/emit-types.js";
import { Graph } from "../model/graph.js";
import { Node } from "../model/node.js";
import { Edge } from "../model/edge.js";

const measurer: TextMeasurer = { measure: () => ({ w: 0, h: 0 }) };

function makeJob(): RenderJob {
  const j = new RenderJob("xdot", measurer);
  j.bb = { ll: { x: 0, y: 0 }, ur: { x: 100, y: 100 } };
  return j;
}

function makeSpan(overrides: Partial<TextSpan> = {}): TextSpan {
  return {
    str: "hi", fontName: "Times", fontSize: 14, fontColor: null, fontFlags: 0,
    yoffset_layout: 0, yoffset_centerline: 0, size: { x: 10, y: 10 }, just: "n",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// pageBackground
// ---------------------------------------------------------------------------

describe("pageBackground", () => {
  it("maps bgcolor=transparent to white (xdot has no truecolor device)", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    g.attrs.set("bgcolor", "transparent");
    r.beginGraph(g, job);
    r.pageBackground(g, job);
    r.endGraph(g, job);
    const draw = r.drawStringsByObject().get(g)?.draw ?? "";
    expect(draw).toContain("#ffffff");
  });

  it("expands the canvas box by an explicit pad= attribute", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    g.attrs.set("pad", "0.5");
    r.beginGraph(g, job);
    r.pageBackground(g, job);
    r.endGraph(g, job);
    const draw = r.drawStringsByObject().get(g)?.draw ?? "";
    // pad=0.5in = 36pt; ll.x=0-36=-36.
    expect(draw).toContain("-36");
  });

  it("dispatches to the radial gradient op when style=radial", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    g.attrs.set("bgcolor", "red:blue");
    g.attrs.set("style", "radial");
    r.beginGraph(g, job);
    r.pageBackground(g, job);
    r.endGraph(g, job);
    const draw = r.drawStringsByObject().get(g)?.draw ?? "";
    expect(draw).toContain("("); // radial op uses "(...)" bracket, linear uses "[...]"
    expect(draw).not.toContain("[");
  });
});

// ---------------------------------------------------------------------------
// attachEdgeDraws — nothing flushed
// ---------------------------------------------------------------------------

describe("attachEdgeDraws — nothing flushed", () => {
  it("an edge with an empty spline list and no arrows records no draw entry", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    r.beginGraph(new Graph("G", "directed"), job);
    const g = new Graph("G", "directed");
    const e = new Edge(new Node(0, "a", g), new Node(1, "b", g), "");
    e.info.spl = { size: 0, list: [], bb: { ll: { x: 0, y: 0 }, ur: { x: 0, y: 0 } } };
    r.beginEdge(e, job);
    r.endEdge(e, job);
    expect(r.drawStringsByObject().has(e)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// textspan — obj===null, null fontName, null fontColor
// ---------------------------------------------------------------------------

describe("textspan — obj === null", () => {
  it("routes to EmitState.GDraw and uses default font-family/color fallbacks", () => {
    const job = makeJob(); // no obj pushed
    const r = new XdotRenderer();
    r.beginGraph(new Graph("G", "directed"), job);
    r.textspan({ x: 0, y: 0 }, makeSpan({ fontName: null, fontColor: null }), job);
    const g = new Graph("G", "directed");
    r.pageBackground(g, job); // no-op besides flushing GDraw isn't needed; read via endGraph
    r.endGraph(g, job);
    const draw = r.drawStringsByObject().get(g)?.draw ?? "";
    expect(draw).toContain("F 14 0 - "); // empty font name (fontName ?? '')
    expect(draw).toContain("#000000"); // fontColor ?? 'black'
  });
});

// ---------------------------------------------------------------------------
// penOp / fillOp / styleOp / getBuf — obj === null fallbacks
// ---------------------------------------------------------------------------

describe("ellipse — obj === null uses default black pen, no style/fill ops", () => {
  it("emits stroke as black pen with no S/C ops", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    r.beginGraph(new Graph("G", "directed"), job);
    r.ellipse({ x: 0, y: 0 }, 5, 5, false, job);
    const g = new Graph("G", "directed");
    r.endGraph(g, job);
    const draw = r.drawStringsByObject().get(g)?.draw ?? "";
    expect(draw).toContain("c 7 -#000000"); // penOp fallback
    expect(draw).toContain("e "); // unfilled ellipse op
  });
});

describe("fillOp — obj === null uses default black fill", () => {
  it("emits a plain black fill op when no obj is pushed", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    r.beginGraph(new Graph("G", "directed"), job);
    r.ellipse({ x: 0, y: 0 }, 5, 5, true, job);
    const g = new Graph("G", "directed");
    r.endGraph(g, job);
    const draw = r.drawStringsByObject().get(g)?.draw ?? "";
    expect(draw).toContain("C 7 -#000000");
  });
});

describe("styleOp — rawStyle empty, pen=Dashed/Dotted fallback", () => {
  it("emits an 'S ...dashed' op when rawStyle is empty and pen=Dashed", () => {
    const job = makeJob();
    const g = new Graph("G", "directed");
    const n = new Node(0, "a", g);
    const obj = createObjState(ObjType.Node);
    obj.graphObj = n;
    obj.pen = PenType.Dashed;
    obj.rawStyle = [];
    job.pushObj(obj);
    const r = new XdotRenderer();
    r.beginGraph(g, job);
    r.polygon([{ x: 0, y: 0 }, { x: 1, y: 1 }], false, job);
    r.endNode(n, job);
    const draw = r.drawStringsByObject().get(n)?.draw ?? "";
    expect(draw).toContain("-dashed");
  });

  it("emits an 'S ...dotted' op when rawStyle is empty and pen=Dotted", () => {
    const job = makeJob();
    const g = new Graph("G", "directed");
    const n = new Node(0, "a", g);
    const obj = createObjState(ObjType.Node);
    obj.graphObj = n;
    obj.pen = PenType.Dotted;
    obj.rawStyle = [];
    job.pushObj(obj);
    const r = new XdotRenderer();
    r.beginGraph(g, job);
    r.polygon([{ x: 0, y: 0 }, { x: 1, y: 1 }], false, job);
    r.endNode(n, job);
    const draw = r.drawStringsByObject().get(n)?.draw ?? "";
    expect(draw).toContain("-dotted");
  });
});
