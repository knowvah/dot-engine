// SPDX-License-Identifier: EPL-2.0
//
// Branch coverage for viewport.ts (T4d): parseDrawingSize's lone-x (square,
// no comma) fallback path, and initJobViewportZoom's fillsUp binary-expr
// (both operands reached) plus the degenerate-bb szx/szy floor.

import { describe, it, expect } from "vitest";
import { parseDrawingSize, initJobViewportZoom } from "./viewport.js";

describe("parseDrawingSize — lone-x (square) fallback", () => {
  it("a single positive number with no comma yields a square size", () => {
    const size = parseDrawingSize("5");
    expect(size).toEqual({ x: 360, y: 360, filled: false }); // 5in * 72
  });

  it("a trailing '!' on the lone-x form sets filled=true", () => {
    const size = parseDrawingSize("2!");
    expect(size).toEqual({ x: 144, y: 144, filled: true });
  });
});

describe("initJobViewportZoom — fillsUp (filled, drawing smaller than size in both axes)", () => {
  it("zooms up to fill the requested size when filled=true and the drawing is smaller", () => {
    const bb = { ll: { x: 0, y: 0 }, ur: { x: 100, y: 100 } };
    const pad = { x: 0, y: 0 };
    const size = { x: 400, y: 400, filled: true };
    const z = initJobViewportZoom(bb, size, pad);
    expect(z).toBe(4); // min(400/100, 400/100)
  });
});

describe("initJobViewportZoom — degenerate bb floors szx/szy to size", () => {
  it("a zero-extent bb (szx<=0.001) falls back to size.x, keeping zoom=1", () => {
    const bb = { ll: { x: 0, y: 0 }, ur: { x: 0, y: 0 } };
    const pad = { x: 0, y: 0 };
    const size = { x: 200, y: 200, filled: false };
    const z = initJobViewportZoom(bb, size, pad);
    // szx=szy=0 -> floored to size.x/size.y -> drawingNeedsFit: tooBig false
    // (size.x<szx false since szx now ==size.x), fillsUp false -> zoom=1.
    expect(z).toBe(1.0);
  });
});
