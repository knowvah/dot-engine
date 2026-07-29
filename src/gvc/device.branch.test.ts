// SPDX-License-Identifier: EPL-2.0
//
// Branch coverage for device.ts (T4d): renderNode's "invisible" style-alias
// early return (distinct from the earlier plain "invis" gate), and
// renderOneLabel's valign/justify branches (labelFirstSpanY/labelSpanX) plus
// its nspans<1 short-circuit and the sparse-span break.
//
// Not covered here (documented, not forced): the `job.obj ?? undefined`
// fallbacks at L174/L267/L423 and the `job.obj === null` guard in setEdgePen
// (L241) are unreachable through any public entry point — emitNodeBody,
// setEdgePen, and renderOneCluster's anchor block are each called from
// exactly one call site (renderNode / renderEdge / renderOneCluster), and in
// every case job.pushObj() runs immediately before, in the same function,
// with no intervening pop. job.obj is therefore provably non-null at each of
// those four sites; forcing the null path would require calling an
// unexported private function out of its real invariant, not exercising a
// reachable production state.

import { describe, it, expect } from "vitest";
import { renderNode, renderOneLabel } from "./device.js";
import { XdotRenderer } from "../render/dot.js";
import { RenderJob } from "./job.js";
import type { TextMeasurer } from "../common/textmeasure.js";
import type { TextlabelT } from "../common/types.js";
import type { TextSpan } from "../common/emit-types.js";
import { Graph } from "../model/graph.js";
import { Node } from "../model/node.js";

const measurer: TextMeasurer = { measure: () => ({ w: 0, h: 0 }) };

function makeJob(): RenderJob {
  const j = new RenderJob("xdot", measurer);
  j.bb = { ll: { x: -100, y: -100 }, ur: { x: 100, y: 100 } };
  return j;
}

// ---------------------------------------------------------------------------
// renderNode — style=invisible alias (distinct from plain "invis")
// ---------------------------------------------------------------------------

describe("renderNode — style=invisible alias on a non-point shape", () => {
  it("draws nothing (no beginNode call reaches the renderer)", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    const n = new Node(0, "a", g);
    n.attrs.set("style", "invisible");
    g.nodes.set("a", n);
    r.beginGraph(g, job);
    renderNode(n, r, job, new Set());
    r.endGraph(g, job);
    expect(r.drawStringsByObject().has(n)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// renderOneLabel — valign/justify branches + nspans/sparse-span guards
// ---------------------------------------------------------------------------

function makeSpan(overrides: Partial<TextSpan> = {}): TextSpan {
  return {
    str: "x", fontName: "Times", fontSize: 14, fontColor: null, fontFlags: 0,
    yoffset_layout: 0, yoffset_centerline: 0, size: { x: 5, y: 10 }, just: "n",
    ...overrides,
  };
}

function makeLabel(overrides: Partial<TextlabelT> = {}): TextlabelT {
  return {
    text: "x", fontname: "Times", fontcolor: "black", charset: 0, fontsize: 14,
    dimen: { x: 10, y: 10 }, space: { x: 10, y: 10 }, pos: { x: 0, y: 0 },
    u: { kind: "txt", span: [makeSpan()], nspans: 1 },
    valign: "c".charCodeAt(0), set: true, html: false,
    ...overrides,
  };
}

describe("renderOneLabel — valign=top", () => {
  it("positions the first span using the top formula", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    r.beginGraph(g, job);
    const lp = makeLabel({ valign: "t".charCodeAt(0), pos: { x: 0, y: 0 }, space: { x: 10, y: 20 }, fontsize: 14 });
    renderOneLabel(lp, r, job);
    r.endGraph(g, job);
    const draw = r.drawStringsByObject().get(g)?.draw ?? "";
    // y = 0 + 20/2 - 14 = -4 (xdot is y-up, no inversion)
    expect(draw).toContain("T 0 -4 ");
  });
});

describe("renderOneLabel — valign=bottom", () => {
  it("positions the first span using the bottom formula", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    r.beginGraph(g, job);
    const lp = makeLabel({ valign: "b".charCodeAt(0), pos: { x: 0, y: 0 }, space: { x: 10, y: 20 }, dimen: { x: 10, y: 30 }, fontsize: 14 });
    renderOneLabel(lp, r, job);
    r.endGraph(g, job);
    const draw = r.drawStringsByObject().get(g)?.draw ?? "";
    // y = 0 - 20/2 + 30 - 14 = 6
    expect(draw).toContain("T 0 6 ");
  });
});

describe("renderOneLabel — just=left / just=right span x-position", () => {
  it("left justification offsets x by -space.x/2", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    r.beginGraph(g, job);
    const lp = makeLabel({ pos: { x: 100, y: 0 }, space: { x: 20, y: 10 }, u: { kind: "txt", span: [makeSpan({ just: "l" })], nspans: 1 } });
    renderOneLabel(lp, r, job);
    r.endGraph(g, job);
    const draw = r.drawStringsByObject().get(g)?.draw ?? "";
    expect(draw).toContain("T 90 "); // 100 - 20/2 = 90
  });

  it("right justification offsets x by +space.x/2", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    r.beginGraph(g, job);
    const lp = makeLabel({ pos: { x: 100, y: 0 }, space: { x: 20, y: 10 }, u: { kind: "txt", span: [makeSpan({ just: "r" })], nspans: 1 } });
    renderOneLabel(lp, r, job);
    r.endGraph(g, job);
    const draw = r.drawStringsByObject().get(g)?.draw ?? "";
    expect(draw).toContain("T 110 "); // 100 + 20/2 = 110
  });
});

describe("renderOneLabel — nspans < 1 draws nothing", () => {
  it("returns immediately for an empty txt label", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    r.beginGraph(g, job);
    const lp = makeLabel({ u: { kind: "txt", span: [], nspans: 0 } });
    renderOneLabel(lp, r, job);
    r.endGraph(g, job);
    expect(r.drawStringsByObject().has(g)).toBe(false);
  });
});

describe("renderOneLabel — a sparse (undefined) span entry breaks the loop", () => {
  it("stops emitting once it hits an undefined span slot", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    r.beginGraph(g, job);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spans: any[] = [undefined];
    const lp = makeLabel({ u: { kind: "txt", span: spans, nspans: 1 } });
    renderOneLabel(lp, r, job);
    r.endGraph(g, job);
    expect(r.drawStringsByObject().has(g)).toBe(false);
  });
});
