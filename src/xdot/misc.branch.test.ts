// SPDX-License-Identifier: EPL-2.0
/**
 * Branch-coverage tests for src/xdot/misc.ts (sprintXDot, jsonXDot,
 * statXDot). Targets op-kind dispatch arms (polygon/bezier/polyline/text/
 * color/font/style/image/fontchar) and the trimZeros non-finite arm left
 * uncovered by xdot-serial.test.ts and xdot-misc.test.ts.
 * Expected values derived from ~/git/graphviz/lib/xdot/xdot.c
 * (printXDot_Op, jsonXDot_Op, statXDot).
 * Do NOT change assertions to match code output; fix the code instead.
 */

import { describe, it, expect } from "vitest";
import { parseXDot, sprintXDot, jsonXDot, statXDot } from "./index.js";
import type { Xdot, XdotStats } from "./index.js";

function makeStats(): XdotStats {
  return {
    cnt: 0, nEllipse: 0, nPolygon: 0, nPolygonPts: 0,
    nPolyline: 0, nPolylinePts: 0, nBezier: 0, nBezierPts: 0,
    nText: 0, nFont: 0, nStyle: 0, nColor: 0, nImage: 0,
    nGradcolor: 0, nFontchar: 0,
  };
}

// ---------------------------------------------------------------------------
// trimZeros — the non-finite arm. fmt() always feeds n.toFixed(2), which for
// any finite number always contains a ".", so the `!s.includes(".")` branch
// (misc.ts:21) is structurally unreachable via finite input; it is only
// reachable for NaN/Infinity, whose .toFixed(2) output has no decimal point.
// ---------------------------------------------------------------------------
describe("sprintXDot — trimZeros non-finite arm", () => {
  it("NaN coordinate: toFixed(2) has no '.', trimZeros is a no-op", () => {
    const x: Xdot = {
      ops: [{ kind: "filled_ellipse", ellipse: { x: NaN, y: 0, w: 0, h: 0 } }],
      flags: 0,
    };
    expect(sprintXDot(x)).toBe("E NaN 0 0 0");
  });

  it("Infinity coordinate: toFixed(2) has no '.', trimZeros is a no-op", () => {
    const x: Xdot = {
      ops: [{ kind: "filled_ellipse", ellipse: { x: Infinity, y: 0, w: 0, h: 0 } }],
      flags: 0,
    };
    expect(sprintXDot(x)).toBe("E Infinity 0 0 0");
  });
});

// ---------------------------------------------------------------------------
// sprintXDot — exact-string coverage for shape/attr op kinds not exercised
// by xdot-serial.test.ts's round-trip (type-equality only) tests.
// ---------------------------------------------------------------------------
describe("sprintXDot — exact strings per op kind", () => {
  it("filled_polygon: 'P <fmtPts>'", () => {
    expect(sprintXDot(parseXDot("P 3 0 0 10 0 5 10")!)).toBe("P 3 0 0 10 0 5 10");
  });

  it("filled_bezier: 'b <fmtPts>'", () => {
    expect(sprintXDot(parseXDot("b 4 0 0 5 10 15 10 20 0")!))
      .toBe("b 4 0 0 5 10 15 10 20 0");
  });

  it("polyline: 'L <fmtPts>'", () => {
    expect(sprintXDot(parseXDot("L 2 0 0 10 20")!)).toBe("L 2 0 0 10 20");
  });

  it("font: 'F <size> <len> -<name>'", () => {
    expect(sprintXDot(parseXDot("F 12 9-Helvetica")!)).toBe("F 12 9 -Helvetica");
  });

  it("style: 'S <len> -<style>'", () => {
    expect(sprintXDot(parseXDot("S 6-dashed")!)).toBe("S 6 -dashed");
  });

  it("image: 'I <rect> <len> -<name>'", () => {
    expect(sprintXDot(parseXDot("I 10 20 100 50 7-foo.png")!))
      .toBe("I 10 20 100 50 7 -foo.png");
  });

  it("grad_fill_color (C): bracket-serialized gradient string", () => {
    expect(sprintXDot(parseXDot("C 28-[0 0 1 1 2 0 3-red 1 4-blue]")!))
      .toBe("C 31 -[ 0 0 1 1 2 0 3 -red 1 4 -blue]");
  });

  it("grad_pen_color (c): paren-serialized gradient string", () => {
    expect(sprintXDot(parseXDot("c 28-(0 0 5 10 10 20 1 0 5-black)")!))
      .toBe("c 30 -( 0 0 5 10 10 20 1 0 5 -black)");
  });

  it("fmtColor 'none' arm: a grad op whose color is type=none serializes " +
    "as the bare clr string (not gradient bracket/paren syntax)", () => {
    // The parser never constructs a grad_*_color op with a "none"-type
    // gradColor (parseColorOp only takes the grad branch when
    // parseXDotColorAt returns linear/radial). fmtColor's third arm
    // (misc.ts: `return c.clr;`) is exercised only by a directly
    // constructed Xdot, which XdotColor's type permits.
    const x: Xdot = {
      ops: [{ kind: "grad_fill_color", gradColor: { type: "none", clr: "red" } }],
      flags: 0,
    };
    expect(sprintXDot(x)).toBe("C 3 -red");
  });
});

// ---------------------------------------------------------------------------
// jsonXDot — exact-string coverage for every op kind. Only ellipse and
// pen_color were exercised (loosely, via toContain) by xdot-serial.test.ts.
// ---------------------------------------------------------------------------
describe("jsonXDot — per op kind", () => {
  it("unfilled_ellipse: {\"e\": [x,y,w,h]} (key ternary false arm)", () => {
    const s = jsonXDot(parseXDot("e 10 20 5 3")!);
    expect(s).toContain('{"e":[10.000000,20.000000,5.000000,3.000000]}');
  });

  it("filled_polygon: {\"P\": [[x,y,z],...]}", () => {
    const s = jsonXDot(parseXDot("P 3 0 0 10 0 5 10")!);
    expect(s).toContain('{"P":[[0.000000,0.000000,0.000000],' +
      '[10.000000,0.000000,0.000000],[5.000000,10.000000,0.000000]]}');
  });

  it("unfilled_polygon: {\"p\": [[x,y,z],...]} (key ternary false arm)", () => {
    const s = jsonXDot(parseXDot("p 3 0 0 10 0 5 10")!);
    expect(s).toContain('{"p":[[0.000000,0.000000,0.000000],' +
      '[10.000000,0.000000,0.000000],[5.000000,10.000000,0.000000]]}');
  });

  it("filled_bezier: {\"b\": [[x,y,z],...]}", () => {
    const s = jsonXDot(parseXDot("b 4 0 0 5 10 15 10 20 0")!);
    expect(s).toContain('{"b":[[0.000000,0.000000,0.000000],' +
      '[5.000000,10.000000,0.000000],[15.000000,10.000000,0.000000],' +
      '[20.000000,0.000000,0.000000]]}');
  });

  it("unfilled_bezier: {\"B\": [[x,y,z],...]} (key ternary false arm)", () => {
    const s = jsonXDot(parseXDot("B 4 0 0 5 10 15 10 20 0")!);
    expect(s).toContain('{"B":[[0.000000,0.000000,0.000000],' +
      '[5.000000,10.000000,0.000000],[15.000000,10.000000,0.000000],' +
      '[20.000000,0.000000,0.000000]]}');
  });

  it("polyline: {\"L\": [[x,y,z],...]}", () => {
    const s = jsonXDot(parseXDot("L 2 0 0 10 20")!);
    expect(s).toContain('{"L":[[0.000000,0.000000,0.000000],' +
      '[10.000000,20.000000,0.000000]]}');
  });

  it("text: {\"T\": {x,y,align,width,text}}", () => {
    const s = jsonXDot(parseXDot("T 10 20 0 50 5-hello")!);
    expect(s).toContain(
      '{"T":{"x":10.000000,"y":20.000000,"align":0,"width":50.000000,' +
        '"text":"hello"}}',
    );
  });

  it("fill_color: {\"C\": \"<color>\"}", () => {
    const s = jsonXDot(parseXDot("C 3-red")!);
    expect(s).toContain('{"C":"red"}');
  });

  it("grad_fill_color: {\"C\": \"<bracket-gradient>\"}", () => {
    const s = jsonXDot(parseXDot("C 28-[0 0 1 1 2 0 3-red 1 4-blue]")!);
    expect(s).toContain('{"C":"[ 0 0 1 1 2 0 3 -red 1 4 -blue]"}');
  });

  it("grad_pen_color: {\"c\": \"<paren-gradient>\"}", () => {
    const s = jsonXDot(parseXDot("c 28-(0 0 5 10 10 20 1 0 5-black)")!);
    expect(s).toContain('{"c":"( 0 0 5 10 10 20 1 0 5 -black)"}');
  });

  it("font: {\"F\": [size, \"<name>\"]}", () => {
    const s = jsonXDot(parseXDot("F 12 9-Helvetica")!);
    expect(s).toContain('{"F":{"size":12.000000,"name":"Helvetica"}}');
  });

  it("style: {\"S\": \"<style>\"}", () => {
    const s = jsonXDot(parseXDot("S 6-dashed")!);
    expect(s).toContain('{"S":"dashed"}');
  });

  it("image: {\"I\": {x,y,w,h,name}}", () => {
    const s = jsonXDot(parseXDot("I 10 20 100 50 7-foo.png")!);
    expect(s).toContain(
      '{"I":{"x":10.000000,"y":20.000000,"w":100.000000,"h":50.000000,' +
        '"name":"foo.png"}}',
    );
  });

  it("fontchar: {\"t\": <uint>}", () => {
    const s = jsonXDot(parseXDot("t 7")!);
    expect(s).toContain('{"t":7}');
  });
});

// ---------------------------------------------------------------------------
// statXDot — shape/attr kinds not exercised by xdot-misc.test.ts: polyline,
// text, font, style, image, fontchar.
// ---------------------------------------------------------------------------
describe("statXDot — remaining shape and attr kinds", () => {
  it("polyline: nPolyline + accumulated nPolylinePts", () => {
    const sp = makeStats();
    statXDot(parseXDot("L 2 0 0 10 20")!, sp);
    expect(sp.nPolyline).toBe(1);
    expect(sp.nPolylinePts).toBe(2);
  });

  it("text: nText", () => {
    const sp = makeStats();
    statXDot(parseXDot("T 10 20 0 50 5-hello")!, sp);
    expect(sp.nText).toBe(1);
  });

  it("font, style, image, fontchar counted independently", () => {
    const sp = makeStats();
    // "10-Helvetica " is intentional: with trailing input the declared count
    // is satisfiable, so C consumes 10 bytes ("Helvetica " incl. the space)
    // as the font name — valid input, unlike the exhausted-input cases.
    statXDot(
      parseXDot("F 12 10-Helvetica S 6-dashed I 10 20 100 50 7-foo.png t 7")!,
      sp,
    );
    expect(sp.cnt).toBe(4);
    expect(sp.nFont).toBe(1);
    expect(sp.nStyle).toBe(1);
    expect(sp.nImage).toBe(1);
    expect(sp.nFontchar).toBe(1);
  });
});
