// SPDX-License-Identifier: EPL-2.0
//
// Branch coverage for svg-multicolor.ts (T4d): ellipticWedge's flat-ellipse
// coefficient-table selection and >PI wedge-span correction, wedgedEllipse/
// stripedBox's parse-error early return, obj===null penWidth fallback,
// null-color segment break, and stripedBox's non-rotated corner order.
// Uses the real XdotRenderer (implements RendererPlugin) as the render
// target so bezier()/polygon() calls have a genuine sink to write into.

import { describe, it, expect } from "vitest";
import { ellipticWedge, wedgedEllipse, stripedBox } from "./svg-multicolor.js";
import { XdotRenderer } from "./dot.js";
import { RenderJob, createObjState, ObjType } from "../gvc/job.js";
import type { TextMeasurer } from "../common/textmeasure.js";
import { Graph } from "../model/graph.js";

const measurer: TextMeasurer = { measure: () => ({ w: 0, h: 0 }) };

function makeJob(): RenderJob {
  const j = new RenderJob("xdot", measurer);
  j.bb = { ll: { x: 0, y: 0 }, ur: { x: 100, y: 100 } };
  return j;
}

// ---------------------------------------------------------------------------
// ellipticWedge — flat-ellipse coefficient table + >PI span correction
// ---------------------------------------------------------------------------

describe("ellipticWedge — flat ellipse (b/a < 0.25) selects COEFFS3LOW", () => {
  it("produces a finite, non-empty point path for a very flat ellipse", () => {
    const pts = ellipticWedge({ cx: 0, cy: 0, xsemi: 100, ysemi: 5 }, 0, Math.PI / 2);
    expect(pts.length).toBeGreaterThan(0);
    for (const p of pts) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });
});

describe("ellipticWedge — wedge span > PI with a small raw eta difference", () => {
  it("wraps eta2 by 2*PI so the arc still sweeps the full requested angle", () => {
    // angle0=0, angle1=350deg: geometric span (350deg) > PI, but atan2's
    // eta2-eta1 (before correction) comes back < PI without the +=TWOPI fix.
    const angle1 = (350 * Math.PI) / 180;
    const pts = ellipticWedge({ cx: 0, cy: 0, xsemi: 10, ysemi: 10 }, 0, angle1);
    // A near-full-circle wedge produces many more points than a small arc.
    const smallArc = ellipticWedge({ cx: 0, cy: 0, xsemi: 10, ysemi: 10 }, 0, Math.PI / 8);
    expect(pts.length).toBeGreaterThan(smallArc.length);
  });
});

// ---------------------------------------------------------------------------
// wedgedEllipse
// ---------------------------------------------------------------------------

describe("wedgedEllipse — parse error short-circuits", () => {
  it("returns the parseSegs error code without drawing anything", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    r.beginGraph(g, job);
    const rc = wedgedEllipse(job, [{ x: -10, y: -10 }, { x: 10, y: 10 }], "red;bogus:blue", r);
    r.endGraph(g, job);
    expect(rc).toBe(2);
    expect(r.drawStringsByObject().get(g)?.draw ?? "").toBe("");
  });
});

describe("wedgedEllipse — obj === null uses default penWidth (no restore needed)", () => {
  it("draws successfully with no obj pushed", () => {
    const job = makeJob(); // no obj pushed
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    r.beginGraph(g, job);
    const rc = wedgedEllipse(job, [{ x: -10, y: -10 }, { x: 10, y: 10 }], "red:blue", r);
    r.endGraph(g, job);
    expect(rc).toBe(0);
    expect(r.drawStringsByObject().get(g)?.draw ?? "").toContain("b ");
  });
});

describe("wedgedEllipse — null-color segment breaks the loop early", () => {
  it("a leading empty color token stops after drawing nothing (color=null)", () => {
    const job = makeJob();
    const obj = createObjState(ObjType.Node);
    obj.graphObj = new Graph("G", "directed");
    job.pushObj(obj);
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    r.beginGraph(g, job);
    const rc = wedgedEllipse(job, [{ x: -10, y: -10 }, { x: 10, y: 10 }], ":blue", r);
    r.endGraph(g, job);
    expect(rc).toBe(0);
    // The first segment has color=null -> break immediately -> zero bezier ops.
    const draw = r.drawStringsByObject().get(g)?.draw ?? "";
    expect((draw.match(/b /g) ?? []).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// stripedBox
// ---------------------------------------------------------------------------

describe("stripedBox — parse error short-circuits", () => {
  it("returns the parseSegs error code without drawing anything", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    r.beginGraph(g, job);
    const rc = stripedBox(job, [{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 0 }], "red;bogus:blue", true, r);
    r.endGraph(g, job);
    expect(rc).toBe(2);
    expect(r.drawStringsByObject().get(g)?.draw ?? "").toBe("");
  });
});

describe("stripedBox — non-rotated corner order (rotate=false)", () => {
  it("draws stripes using the pts corners directly (no swap)", () => {
    const job = makeJob(); // obj===null -> also covers the penWidth fallback
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    r.beginGraph(g, job);
    const rc = stripedBox(job, [{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 0 }], "red:blue", false, r);
    r.endGraph(g, job);
    expect(rc).toBe(0);
    const draw = r.drawStringsByObject().get(g)?.draw ?? "";
    expect((draw.match(/P /g) ?? []).length).toBe(2); // 2 filled stripe polygons
  });
});

describe("stripedBox — null-color segment breaks the loop early", () => {
  it("a leading empty color token stops after drawing nothing", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    r.beginGraph(g, job);
    const rc = stripedBox(job, [{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 0 }], ":blue", true, r);
    r.endGraph(g, job);
    expect(rc).toBe(0);
    const draw = r.drawStringsByObject().get(g)?.draw ?? "";
    expect((draw.match(/P /g) ?? []).length).toBe(0);
  });
});
