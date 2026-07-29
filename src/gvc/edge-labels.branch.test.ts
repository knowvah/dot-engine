// SPDX-License-Identifier: EPL-2.0
//
// Branch coverage for edge-labels.ts (T4d): renderEdgeLabels' obj===null
// path with decorate=true (drives emitAttachment through the label/xlabel
// slots), the obj.id ?? '' fallback in the non-null path, and
// emitAttachment's own set/whitespace guards plus the fontcolor fallback.

import { describe, it, expect } from "vitest";
import { renderEdgeLabels } from "./edge-labels.js";
import { XdotRenderer } from "../render/dot.js";
import { RenderJob, createObjState, ObjType } from "./job.js";
import type { RendererPlugin } from "./context.js";
import type { TextMeasurer } from "../common/textmeasure.js";
import type { TextlabelT } from "../common/types.js";
import type { Point } from "../model/geom.js";
import { Graph } from "../model/graph.js";
import { Node } from "../model/node.js";
import { Edge } from "../model/edge.js";

const measurer: TextMeasurer = { measure: () => ({ w: 0, h: 0 }) };

function makeJob(): RenderJob {
  const j = new RenderJob("xdot", measurer);
  j.devscale = { x: 1, y: -1 };
  j.translation = { x: 0, y: 0 };
  j.zoom = 1;
  return j;
}

function makeEdge(): Edge {
  const g = new Graph("G", "directed");
  return new Edge(new Node(0, "a", g), new Node(1, "b", g), "");
}

function makeLabel(text: string, overrides: Partial<TextlabelT> = {}): TextlabelT {
  return {
    text, fontname: "Times", fontcolor: "", charset: 0, fontsize: 14,
    dimen: { x: 10, y: 10 }, space: { x: 10, y: 10 }, pos: { x: 5, y: 5 },
    u: { kind: "txt", span: [], nspans: 0 }, // nspans=0: renderOneLabel bails
    // before touching the renderer's textspan, isolating emitAttachment.
    valign: "c".charCodeAt(0), set: true, html: false,
    ...overrides,
  };
}

const SPL = {
  size: 1,
  list: [{
    list: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }],
    size: 4, sflag: 0, eflag: 0, sp: { x: 0, y: 0 }, ep: { x: 3, y: 3 },
  }],
  bb: { ll: { x: 0, y: 0 }, ur: { x: 3, y: 3 } },
};

// A minimal renderer stub implementing only attachmentPolyline — sufficient
// because with nspans=0, renderOneLabel never calls textspan/beginNode/etc.
function makeAttachmentCaptureRenderer(): { calls: [Point[], string][] } & RendererPlugin {
  const calls: [Point[], string][] = [];
  const stub = {
    type: "stub", quality: 0,
    beginGraph() {}, endGraph() {}, beginNode() {}, endNode() {},
    beginEdge() {}, endEdge() {}, beginCluster() {}, endCluster() {},
    textspan() {}, ellipse() {}, polygon() {}, bezier() {}, polyline() {},
    calls,
    attachmentPolyline(pts: Point[], pencolor: string) { calls.push([pts, pencolor]); },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return stub;
}

describe("renderEdgeLabels — obj===null with decorate=true draws attachment polylines", () => {
  it("emits an attachment for the center label when spl is present", () => {
    const job = makeJob(); // no obj pushed
    const r = makeAttachmentCaptureRenderer();
    const e = makeEdge();
    e.attrs.set("decorate", "true");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    e.info.spl = SPL as any;
    e.info.label = makeLabel("hello");
    renderEdgeLabels(e, r, job);
    expect(r.calls.length).toBe(1);
    expect(r.calls[0]![1]).toBe("black"); // fontcolor='' falls back to black
  });
});

describe("emitAttachment — all-whitespace label text is skipped", () => {
  it("draws no attachment when the label text has no non-whitespace chars", () => {
    const job = makeJob();
    const r = makeAttachmentCaptureRenderer();
    const e = makeEdge();
    e.attrs.set("decorate", "true");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    e.info.spl = SPL as any;
    e.info.label = makeLabel("   ");
    renderEdgeLabels(e, r, job);
    expect(r.calls.length).toBe(0);
  });

  it("draws no attachment when the label text is undefined (?? '' fallback)", () => {
    const job = makeJob();
    const r = makeAttachmentCaptureRenderer();
    const e = makeEdge();
    e.attrs.set("decorate", "true");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    e.info.spl = SPL as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    e.info.label = { ...makeLabel(""), text: undefined } as any;
    renderEdgeLabels(e, r, job);
    expect(r.calls.length).toBe(0);
  });
});

describe("renderEdgeLabels — non-null obj with id=null uses the '' fallback", () => {
  it("completes without throwing when obj.id is null", () => {
    const job = makeJob();
    const obj = createObjState(ObjType.Edge);
    obj.id = null;
    job.pushObj(obj);
    const r = new XdotRenderer();
    const e = makeEdge();
    r.beginGraph(new Graph("G", "directed"), job);
    expect(() => renderEdgeLabels(e, r, job)).not.toThrow();
  });
});
