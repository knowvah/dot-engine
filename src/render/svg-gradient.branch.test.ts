// SPDX-License-Identifier: EPL-2.0
//
// Branch coverage for svg-gradient.ts (T4d): printGradientColor's rgba and
// fallthrough (neither string nor rgba) branches, emitStopOpacity's
// partial-alpha branch, emitLinearGradient/emitRadialGradient's obj===null
// early returns, and emitRadialGradient's non-zero gradientAngle branch.

import { describe, it, expect } from "vitest";
import { emitStop, emitLinearGradient, emitRadialGradient } from "./svg-gradient.js";
import { RenderJob, createObjState } from "../gvc/job.js";
import { FillType } from "../gvc/context.js";
import type { TextMeasurer } from "../common/textmeasure.js";

const measurer: TextMeasurer = { measure: () => ({ w: 0, h: 0 }) };

function makeJob(): RenderJob {
  return new RenderJob("svg", measurer);
}

describe("emitStop — printGradientColor rgba + fallthrough", () => {
  it("emits a #rrggbb hex for an rgba color with partial alpha", () => {
    const job = makeJob();
    emitStop(job, 0.5, { type: "rgba", r: 1, g: 0, b: 0, a: 200 / 255 });
    const s = job.output.join("");
    expect(s).toContain("stop-color:#ff0000");
    expect(s).toContain("stop-opacity:" + String(200 / 255));
  });

  it("writes no color text for a color that is neither string nor rgba", () => {
    const job = makeJob();
    emitStop(job, 0, { type: "none" });
    const s = job.output.join("");
    expect(s).toBe('<stop offset="0" style="stop-color:;stop-opacity:1.;"/>\n');
  });
});

describe("emitLinearGradient / emitRadialGradient — obj === null", () => {
  it("emitLinearGradient writes nothing when job.obj is null", () => {
    const job = makeJob();
    emitLinearGradient(job, [{ x: 0, y: 0 }, { x: 10, y: 10 }], "g0");
    expect(job.output.join("")).toBe("");
  });

  it("emitRadialGradient writes nothing when job.obj is null", () => {
    const job = makeJob();
    emitRadialGradient(job, "g0");
    expect(job.output.join("")).toBe("");
  });
});

describe("emitRadialGradient — non-zero gradientAngle shifts the focal point", () => {
  it("computes ifx/ify from the angle instead of the 50/50 default", () => {
    const job = makeJob();
    const obj = createObjState();
    obj.fill = FillType.Radial;
    obj.fillColor = { type: "string", s: "red" };
    obj.stopColor = { type: "string", s: "blue" };
    obj.gradientAngle = 90;
    obj.gradientFrac = 0;
    job.pushObj(obj);
    emitRadialGradient(job, "g0");
    const s = job.output.join("");
    // angle=90deg: ifx=round(50*(1+cos90))=50, ify=round(50*(1-sin90))=0.
    expect(s).toContain('fx="50%" fy="0%"');
  });
});
