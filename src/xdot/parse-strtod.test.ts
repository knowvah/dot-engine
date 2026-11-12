// SPDX-License-Identifier: EPL-2.0
/**
 * xdot numbers are read with strtod (lib/xdot/xdot.c parseReal, parseRect,
 * parsePolyline), and op separators are skipped with gv_isspace
 * (lib/util/gv_ctype.h). Every expected value and stop offset below is what
 * the oracle platform's libc strtod returns (macOS, probed with a C harness
 * printing the value as %a and the end offset); none is taken from the port.
 * Do NOT change assertions to match code output; fix the code instead.
 */

import { describe, it, expect } from "vitest";
import { parseXDot, parseRect, parsePolyline } from "./parse.js";
import { scanStrtod } from "./strtod.js";
import { XDOT_PARSE_ERROR } from "./types.js";

const INF = Infinity;

/** The cluster frame osage writes for a bb of inf,inf,nan,nan (corpus 1221). */
const NONFINITE_FRAME = "p 4 inf inf inf nan nan nan nan inf ";
const NONFINITE_POINTS = [
  { x: INF, y: INF, z: 0 },
  { x: INF, y: NaN, z: 0 },
  { x: NaN, y: NaN, z: 0 },
  { x: NaN, y: INF, z: 0 },
];

describe("parseXDot: non-finite coordinates", () => {
  it("keeps a polygon whose points are inf and nan", () => {
    const x = parseXDot(NONFINITE_FRAME)!;
    expect(x.flags & XDOT_PARSE_ERROR).toBe(0);
    expect(x.ops).toEqual([{ kind: "unfilled_polygon", polygon: { pts: NONFINITE_POINTS } }]);
  });

  it("keeps the polygon after the pen colour, with no parse error", () => {
    const x = parseXDot(`c 7 -#000000 ${NONFINITE_FRAME}`)!;
    expect(x.flags & XDOT_PARSE_ERROR).toBe(0);
    expect(x.ops).toEqual([
      { kind: "pen_color", color: "#000000" },
      { kind: "unfilled_polygon", polygon: { pts: NONFINITE_POINTS } },
    ]);
  });

  it("keeps the filled frame of corpus 1332", () => {
    const x = parseXDot(`c 7 -#ffffff C 9 -#fffffe00 P${NONFINITE_FRAME.slice(1)}`)!;
    expect(x.flags & XDOT_PARSE_ERROR).toBe(0);
    expect(x.ops.map((op) => op.kind)).toEqual(["pen_color", "fill_color", "filled_polygon"]);
    expect(x.ops[2]).toEqual({ kind: "filled_polygon", polygon: { pts: NONFINITE_POINTS } });
  });

  it("reads inf and nan in a polyline through the exported parser", () => {
    const r = parsePolyline("2 -inf nan 0x10 1e1", 0)!;
    expect(r.val.pts).toEqual([{ x: -INF, y: NaN, z: 0 }, { x: 16, y: 10, z: 0 }]);
    expect(r.pos).toBe(19);
  });

  it("reads each inf and nan spelling in a rect field", () => {
    const r = parseRect("INF Infinity -inf +nan", 0)!;
    expect(r.val).toEqual({ x: INF, y: INF, w: -INF, h: NaN });
    expect(parseRect("NaN(abc_1) 1 2 3", 0)!.val).toEqual({ x: NaN, y: 1, w: 2, h: 3 });
  });
});

/** [input, value, stop offset], each row copied from the libc probe. */
type Row = [string, number, number];

function expectRows(rows: Row[]): void {
  for (const [text, val, pos] of rows) {
    const r = scanStrtod(text, 0);
    expect(r, JSON.stringify(text)).not.toBeNull();
    expect(Object.is(r!.val, val), `${JSON.stringify(text)} value ${r!.val}`).toBe(true);
    expect(r!.pos, `${JSON.stringify(text)} stop`).toBe(pos);
  }
}

describe("scanStrtod: infinity and nan", () => {
  it("matches inf and infinity case-insensitively, longest first", () => {
    expectRows([
      [" infinity", INF, 9], ["infx", INF, 3], ["INF", INF, 3], ["Infinity", INF, 8],
      ["-inf", -INF, 4], ["+inf", INF, 4], ["infinit", INF, 3], ["infi", INF, 3],
      ["infinityx", INF, 8], ["inFiNiTy", INF, 8], ["-INFINITY ", -INF, 9],
    ]);
  });

  it("matches nan, and nan(...) through the first close paren", () => {
    expectRows([
      ["+nan", NaN, 4], ["-nan", NaN, 4], ["nanx", NaN, 3], ["nan(12)x", NaN, 7],
      ["NaN(abc_1)", NaN, 10], ["NAN(ABC)z", NaN, 8], ["nan()", NaN, 5], ["nan(_)", NaN, 6],
      // macOS libc takes any characters before the close paren.
      ["nan(a b)", NaN, 8], ["nan(-1)", NaN, 7], ["nan(a(b)c)", NaN, 8], ["nan(!@#)", NaN, 8],
      ["-NaN(x y z)!", NaN, 11],
      // No close paren: only "nan" is taken.
      ["nan(", NaN, 3], ["nan(abc", NaN, 3], ["nan((", NaN, 3], ["nan (1)", NaN, 3],
    ]);
  });

  it("fails on a prefix of inf or nan", () => {
    for (const text of ["in", "na", "e5", "- 1", "+-1", "", " "]) {
      expect(scanStrtod(text, 0), JSON.stringify(text)).toBeNull();
    }
  });
});

describe("scanStrtod: decimal", () => {
  it("needs a mantissa digit and takes an exponent only with digits", () => {
    expectRows([
      ["1e+", 1, 1], ["1e", 1, 1], ["0e", 0, 1], ["1e5", 100000, 3], ["1E-2x", 0.01, 4],
      [".5", 0.5, 2], ["+.5", 0.5, 3], ["5.", 5, 2], ["1.", 1, 2], ["1.e2", 100, 4],
      ["1.5e3.2", 1500, 5], ["00x1", 0, 2], ["-0", -0, 2],
    ]);
    expect(scanStrtod(".", 0)).toBeNull();
    expect(scanStrtod("-.", 0)).toBeNull();
  });

  it("overflows to infinity and underflows to zero", () => {
    expectRows([
      ["1e400", INF, 5], ["1e-400", 0, 6], ["1e18446744073709551617", INF, 22],
    ]);
  });

  it("skips the whitespace gv_isspace names, from the given offset", () => {
    expectRows([["\v\f2", 2, 3], ["\t\n\r 3", 3, 5]]);
    expect(scanStrtod("xx 7", 2)).toEqual({ val: 7, pos: 4 });
  });
});

describe("scanStrtod: hexadecimal", () => {
  it("reads hex digits, a fraction and a binary exponent", () => {
    expectRows([
      ["0x1.8p1", 3, 7], ["0X10", 16, 4], ["-0x1p-1", -0.5, 7], ["0x.8", 0.5, 4],
      ["0x1.8", 1.5, 5], ["0x1P+2", 4, 6], ["0X1.8P+1", 3, 8], ["0x1.p1", 2, 6],
      ["0x1.2p3.4", 9, 7], ["-0x0", -0, 4],
      ["0x00000000000000000000000000000000000000001p0", 1, 45],
      ["0x.0000000000000000000000000001p1100", 2 ** 988, 36],
      ["0x10000000000000000000000000000p-1100", 2 ** -988, 37],
    ]);
  });

  it("falls back to the leading zero when no hex digit follows 0x", () => {
    expectRows([["0x", 0, 1], ["0x.", 0, 1], ["0x.p1", 0, 1], ["0xg", 0, 1], ["0x 1", 0, 1]]);
  });

  it("takes a binary exponent only with digits, and stops after a bare dot", () => {
    expectRows([["0x1p", 1, 3], ["0x1p+", 1, 3], ["0x1.g", 1, 4], ["0x1p-1074x", 5e-324, 9]]);
  });

  it("rounds half-even at 53 bits", () => {
    expectRows([
      ["0x1.00000000000008p0", 1, 20],
      ["0x1.00000000000018p0", 1.0000000000000004, 20],
      ["0x1.00000000000008000001p0", 1.0000000000000002, 26],
    ]);
  });

  it("overflows to infinity", () => {
    expectRows([
      ["0x1.fffffffffffff8p1023", INF, 23], ["0x1.ffffffffffffffp1023", INF, 23],
      ["0x1.fffffffffffff7p1023", Number.MAX_VALUE, 23],
      ["0x1.fffffffffffffp1023", Number.MAX_VALUE, 22],
      ["0x1p1024", INF, 8], ["0x1p1023", 2 ** 1023, 8],
      ["0x1p99999999999", INF, 15], ["0x1p2147483648", INF, 14],
      ["0x1p18446744073709551617", INF, 24],
    ]);
  });

  it("rounds half-even in the subnormal range and underflows to zero", () => {
    expectRows([
      ["0x1p-1074", 5e-324, 9], ["0x1p-1075", 0, 9], ["0x1.8p-1075", 5e-324, 11],
      ["0x1.000001p-1075", 5e-324, 16], ["0x3p-1075", 1e-323, 9], ["0x1p-1076", 0, 9],
      ["0x8p-1077", 5e-324, 9], ["0x18p-1078", 1e-323, 10],
      ["0xfffffffffffff8p-1126", 2 ** -1070, 22],
      ["0x1.fffffffffffffp-1023", 2.2250738585072014e-308, 23],
      ["0x1.ffffffffffffep-1023", 2.2250738585072009e-308, 23],
      ["0x0.0000000000001p-1022", 5e-324, 23],
      ["0x7ffffffffffffcp-1076", 4.4501477170144023e-308, 22],
      ["0x1.7ffffffffffffcp-1023", 1.668805393880401e-308, 24],
      ["0x1p-99999999999", 0, 16], ["0x1p-2147483649", 0, 15],
      ["0x1p-18446744073709551617", 0, 25], ["0x0p99999999999999999999", 0, 24],
    ]);
  });
});

describe("parseXDot: gv_isspace separators", () => {
  it("skips \\v and \\f between an op letter and its numbers", () => {
    const x = parseXDot("E\v1\f2 3 4")!;
    expect(x.flags & XDOT_PARSE_ERROR).toBe(0);
    expect(x.ops).toEqual([{ kind: "filled_ellipse", ellipse: { x: 1, y: 2, w: 3, h: 4 } }]);
  });

  it("skips \\v and \\f between ops", () => {
    const x = parseXDot("e 1 2 3 4\v\fe 5 6 7 8")!;
    expect(x.ops.length).toBe(2);
    expect(x.flags & XDOT_PARSE_ERROR).toBe(0);
  });

  it("stops a number at a trailing e and reports the stray op letter", () => {
    // strtod("1e ...") is 1, stopping at "e"; the next rect field then fails.
    const x = parseXDot("c 7 -#000000 E 1e 2 3 4");
    expect(x!.ops).toEqual([{ kind: "pen_color", color: "#000000" }]);
    expect(x!.flags & XDOT_PARSE_ERROR).toBe(XDOT_PARSE_ERROR);
  });
});
