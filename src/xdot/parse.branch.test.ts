// SPDX-License-Identifier: EPL-2.0
/**
 * Branch-coverage tests for src/xdot/parse.ts.
 * Targets the malformed-input, exponent, multi-byte-string, and gradient-
 * failure arms left uncovered by xdot-parse.test.ts's acceptance-criteria
 * tests. Expected values derived from ~/git/graphviz/lib/xdot/xdot.c
 * (parseReal/parseInt/parseUInt/parseRect/parsePolyline/parseString/
 * parseAlign/parseOp/linGradient/radGradient/parseXDotColor).
 * Do NOT change assertions to match code output; fix the code instead.
 */

import { describe, it, expect } from "vitest";
import {
  parseXDot,
  parseXDotF,
  parseRect,
  parsePolyline,
  parseString,
  parseXDotColorAt,
  parseXDotColor,
} from "./parse.js";
import { XDOT_PARSE_ERROR } from "./types.js";

// ---------------------------------------------------------------------------
// consumeExponent / parseReal — scientific notation (via ellipse rect x)
// C: strtod handles [eE][+-]?digits natively.
// ---------------------------------------------------------------------------
describe("parseReal — exponent notation", () => {
  it("lowercase e, no sign: 1e2 == 100", () => {
    const op = parseXDot("E 1e2 20 5 3")!.ops[0];
    if (op.kind !== "filled_ellipse") throw new Error("wrong kind");
    expect(op.ellipse.x).toBe(100);
  });

  it("lowercase e, explicit plus sign: 1e+2 == 100", () => {
    const op = parseXDot("E 1e+2 20 5 3")!.ops[0];
    if (op.kind !== "filled_ellipse") throw new Error("wrong kind");
    expect(op.ellipse.x).toBe(100);
  });

  it("lowercase e, minus sign: 1e-2 == 0.01", () => {
    const op = parseXDot("E 1e-2 20 5 3")!.ops[0];
    if (op.kind !== "filled_ellipse") throw new Error("wrong kind");
    expect(op.ellipse.x).toBe(0.01);
  });

  it("uppercase E: 1E2 == 100", () => {
    const op = parseXDot("E 1E2 20 5 3")!.ops[0];
    if (op.kind !== "filled_ellipse") throw new Error("wrong kind");
    expect(op.ellipse.x).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// parseReal failure arms (via parseRect, the exported wrapper).
// C: parseRect returns NULL as soon as any strtod call makes no progress.
// ---------------------------------------------------------------------------
describe("parseRect — sequential field failures", () => {
  it("all valid: returns rect + final pos", () => {
    expect(parseRect("10 20 5 3", 0)).toEqual({
      val: { x: 10, y: 20, w: 5, h: 3 },
      pos: 9,
    });
  });

  it("x fails (no digits at all) -> null", () => {
    expect(parseRect("abc", 0)).toBeNull();
  });

  it("x fails (bare sign, no digits) -> null", () => {
    // Exercises the i===digStart arm distinct from i===start (sign consumed,
    // no digits followed).
    expect(parseRect("- 20 5 3", 0)).toBeNull();
  });

  it("y fails after valid x -> null", () => {
    expect(parseRect("10 abc", 0)).toBeNull();
  });

  it("w fails after valid x,y -> null", () => {
    expect(parseRect("10 20 abc", 0)).toBeNull();
  });

  it("h fails after valid x,y,w -> null", () => {
    expect(parseRect("10 20 5 abc", 0)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parsePoint / parsePolyline — count parse failure, per-point failure, and
// the zero-count edge (loop body never executes).
// C: parsePolyline frees and returns NULL on any strtod-no-progress point.
// ---------------------------------------------------------------------------
describe("parsePolyline — count and point failures", () => {
  it("count is non-numeric -> null", () => {
    expect(parsePolyline("abc", 0)).toBeNull();
  });

  it("zero count -> empty pts array, no loop iterations", () => {
    expect(parsePolyline("0", 0)).toEqual({ val: { pts: [] }, pos: 1 });
  });

  it("point x fails (count says 1, no coordinates) -> null", () => {
    expect(parsePolyline("1 abc", 0)).toBeNull();
  });

  it("point y fails after valid x -> null", () => {
    expect(parsePolyline("1 10 abc", 0)).toBeNull();
  });

  it("fewer points than declared count -> null", () => {
    // Count says 3 but only 2 points (4 numbers) are present.
    expect(parsePolyline("3 0 0 10 0", 0)).toBeNull();
  });

  it("all points present -> full pts array with z=0", () => {
    expect(parsePolyline("2 0 0 10 20", 0)).toEqual({
      val: { pts: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 20, z: 0 }] },
      pos: 11,
    });
  });
});

// ---------------------------------------------------------------------------
// parseString — count/dash/escape/multi-byte arms.
// @see mission memory: byte count is UTF-8 BYTES, not UTF-16 code units;
// an unescaped backslash is an escape prefix (uncounted); a backslash
// preceded by a backslash counts as a normal byte.
// ---------------------------------------------------------------------------
describe("parseString — count and dash failures", () => {
  it("no digits at all -> null", () => {
    expect(parseString("abc", 0)).toBeNull();
  });

  it("count is zero -> null (C: i <= 0 rejected)", () => {
    expect(parseString("0-x", 0)).toBeNull();
  });

  it("count is negative -> null (C: i <= 0 rejected)", () => {
    expect(parseString("-1-x", 0)).toBeNull();
  });

  it("missing dash after count -> null", () => {
    expect(parseString("5xhello", 0)).toBeNull();
  });
});

describe("parseString — escape accounting", () => {
  it("unescaped backslash is an uncounted escape prefix", () => {
    // declared len=1: backslash (uncounted, escape prefix) + 'n' (counted).
    expect(parseString("1-\\n", 0)).toEqual({ val: "\\n", pos: 4 });
  });

  it("backslash preceded by backslash counts as a normal byte", () => {
    // declared len=1: first backslash uncounted (escape prefix), second
    // backslash IS preceded by a backslash so it counts toward the budget.
    expect(parseString("1-\\\\", 0)).toEqual({ val: "\\\\", pos: 4 });
  });
});

describe("parseString — UTF-8 byte-length dispatch (cpByteLen)", () => {
  it("2-byte code point ('ÿ'): declared count 2 consumes exactly it", () => {
    const op = parseXDot("T 0 0 0 50 2-ÿ")!.ops[0];
    if (op.kind !== "text") throw new Error("wrong kind");
    expect(op.text.text).toBe("ÿ");
  });

  it("3-byte code point ('中'): declared count 3 consumes exactly it", () => {
    const op = parseXDot("T 0 0 0 50 3-中")!.ops[0];
    if (op.kind !== "text") throw new Error("wrong kind");
    expect(op.text.text).toBe("中");
  });

  it("4-byte code point (surrogate pair, U+1F600): declared count 4", () => {
    const op = parseXDot("T 0 0 0 50 4-\u{1F600}")!.ops[0];
    if (op.kind !== "text") throw new Error("wrong kind");
    expect(op.text.text).toBe("\u{1F600}");
  });
});

describe("parseString — truncated input (documented port bug)", () => {
  // BUG: C's parseString (xdot.c:138-142) returns 0/NULL the moment the
  // input runs out (`s[j] == '\0'`) before the declared byte count is
  // satisfied. The port instead breaks out of the loop and returns a
  // partial string as if parsing had succeeded (parse.ts:124-125,
  // "// C strncpy semantics: stop at end of input" — this gloss is
  // inaccurate; C does not use strncpy here, it fails hard). Confirmed via
  // direct probe: parseString("5-ab", 0) currently returns
  // { val: "ab", pos: 4 } instead of null.
  it.todo(
    "declared byte count exceeds available input -> should return null " +
      "per C xdot.c:139-142 (currently returns partial {val:'ab',pos:4}); " +
      "see src/xdot/parse.ts:124-125",
  );
});

// ---------------------------------------------------------------------------
// parseAlign failure (via parseInt_ propagation).
// ---------------------------------------------------------------------------
describe("parseAlign — malformed align field", () => {
  it("non-numeric align -> whole text op fails -> null result", () => {
    expect(parseXDot("T 0 0 abc 50 5-hello")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseXDotColorAt — position-past-end and character-class dispatch.
// ---------------------------------------------------------------------------
describe("parseXDotColorAt — direct calls", () => {
  it("pos at end of string -> null (C: *cp is NUL -> default -> NULL)", () => {
    expect(parseXDotColorAt("abc", 3)).toBeNull();
  });

  it("invalid first char '!' -> null", () => {
    expect(parseXDotColorAt("!invalid", 0)).toBeNull();
  });

  it("invalid first char '`' (just below 'a') -> null", () => {
    expect(parseXDotColorAt("`invalid", 0)).toBeNull();
  });

  it("digit-led color -> type=none (isAlnum digit branch)", () => {
    expect(parseXDotColorAt("1blue", 0)).toEqual({
      val: { type: "none", clr: "1blue" },
      pos: 0,
    });
  });

  it("uppercase-led color -> type=none (isAlnum uppercase branch)", () => {
    expect(parseXDotColorAt("Red", 0)).toEqual({
      val: { type: "none", clr: "Red" },
      pos: 0,
    });
  });

  it("malformed '[' gradient (no valid content) -> null", () => {
    expect(parseXDotColorAt("[abc", 0)).toBeNull();
  });

  it("malformed '(' gradient (no valid content) -> null", () => {
    expect(parseXDotColorAt("(abc", 0)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// linGradient / radGradient — sequential field failures, one per position.
// ---------------------------------------------------------------------------
describe("linGradient — sequential field failures", () => {
  it("x0 fails -> null", () => {
    expect(parseXDotColor("[abc")).toBeNull();
  });
  it("y0 fails after x0 -> null", () => {
    expect(parseXDotColor("[0 abc")).toBeNull();
  });
  it("x1 fails after x0,y0 -> null", () => {
    expect(parseXDotColor("[0 0 abc")).toBeNull();
  });
  it("y1 fails after x0,y0,x1 -> null", () => {
    expect(parseXDotColor("[0 0 1 abc")).toBeNull();
  });
  it("stop count fails after x0,y0,x1,y1 -> null", () => {
    expect(parseXDotColor("[0 0 1 1 abc")).toBeNull();
  });
  it("stop frac fails -> null", () => {
    expect(parseXDotColor("[0 0 1 1 1 abc]")).toBeNull();
  });
  it("stop color fails -> null", () => {
    expect(parseXDotColor("[0 0 1 1 1 0 abc]")).toBeNull();
  });
  it("all fields valid -> linear gradient with one stop", () => {
    const c = parseXDotColor("[0 0 1 1 1 0 3-red]");
    expect(c).toEqual({
      type: "linear",
      ling: { x0: 0, y0: 0, x1: 1, y1: 1, stops: [{ frac: 0, color: "red" }] },
    });
  });
});

describe("radGradient — sequential field failures", () => {
  it("x0 fails -> null", () => {
    expect(parseXDotColor("(abc")).toBeNull();
  });
  it("y0 fails after x0 -> null", () => {
    expect(parseXDotColor("(0 abc")).toBeNull();
  });
  it("r0 fails after x0,y0 -> null", () => {
    expect(parseXDotColor("(0 0 abc")).toBeNull();
  });
  it("x1 fails after x0,y0,r0 -> null", () => {
    expect(parseXDotColor("(0 0 5 abc")).toBeNull();
  });
  it("y1 fails after x0,y0,r0,x1 -> null", () => {
    expect(parseXDotColor("(0 0 5 10 abc")).toBeNull();
  });
  it("r1 fails after x0,y0,r0,x1,y1 -> null", () => {
    expect(parseXDotColor("(0 0 5 10 10 abc")).toBeNull();
  });
  it("stop count fails -> null", () => {
    expect(parseXDotColor("(0 0 5 10 10 20 abc")).toBeNull();
  });
  it("stop frac fails -> null", () => {
    expect(parseXDotColor("(0 0 5 10 10 20 1 abc)")).toBeNull();
  });
  it("stop color fails -> null", () => {
    expect(parseXDotColor("(0 0 5 10 10 20 1 0 abc)")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseOp / parseShapeOp / parseMetaOp — malformed-argument "error" arms
// for every op kind, plus the NUL-terminator arm.
// C: CHK(s) macro sets *error=1 and returns 0 the moment any sub-parse
// fails; parseXDotFOn folds that into XDOT_PARSE_ERROR and, with zero
// successfully parsed ops, returns NULL.
// ---------------------------------------------------------------------------
describe("parseOp — malformed shape ops", () => {
  it("E: malformed rect -> null overall (0 ops parsed)", () => {
    expect(parseXDot("E abc")).toBeNull();
  });
  it("P: malformed polyline -> null overall", () => {
    expect(parseXDot("P abc")).toBeNull();
  });
  it("b: malformed bezier -> null overall", () => {
    expect(parseXDot("b abc")).toBeNull();
  });
  it("L: malformed polyline -> null overall", () => {
    expect(parseXDot("L abc")).toBeNull();
  });
});

describe("parseOp — malformed text op (each of 5 fields)", () => {
  it("x fails -> null", () => {
    expect(parseXDot("T abc 0 0 50 5-hello")).toBeNull();
  });
  it("y fails after x -> null", () => {
    expect(parseXDot("T 0 abc 0 50 5-hello")).toBeNull();
  });
  it("align fails after x,y -> null", () => {
    expect(parseXDot("T 0 0 abc 50 5-hello")).toBeNull();
  });
  it("width fails after x,y,align -> null", () => {
    expect(parseXDot("T 0 0 0 abc 5-hello")).toBeNull();
  });
  it("text string fails after x,y,align,width -> null", () => {
    expect(parseXDot("T 0 0 0 50 abc")).toBeNull();
  });
});

describe("parseOp — malformed color op", () => {
  it("string count malformed -> null", () => {
    expect(parseXDot("C abc")).toBeNull();
  });
  it("string ok but color content invalid -> null", () => {
    expect(parseXDot("C 1-!")).toBeNull();
  });
});

describe("parseOp — malformed font/style/image/fontchar ops", () => {
  it("F: size fails -> null", () => {
    expect(parseXDot("F abc")).toBeNull();
  });
  it("F: name fails after size -> null", () => {
    expect(parseXDot("F 12 abc")).toBeNull();
  });
  it("S: style string fails -> null", () => {
    expect(parseXDot("S abc")).toBeNull();
  });
  it("I: rect fails -> null", () => {
    expect(parseXDot("I abc")).toBeNull();
  });
  it("I: name fails after rect -> null", () => {
    expect(parseXDot("I 0 0 0 0 abc")).toBeNull();
  });
  it("t: uint fails -> null", () => {
    expect(parseXDot("t abc")).toBeNull();
  });
});

describe("parseOp — NUL terminator (ch === '\\0')", () => {
  it("embedded NUL after a valid op ends parsing cleanly (no error flag)", () => {
    const x = parseXDot("E 10 20 5 3 \0");
    expect(x).not.toBeNull();
    expect(x!.ops).toHaveLength(1);
    expect(x!.flags & XDOT_PARSE_ERROR).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// parseXDotF — thin wrapper sanity (opFns not required).
// ---------------------------------------------------------------------------
describe("parseXDotF", () => {
  it("parses without opFns callbacks", () => {
    const x = parseXDotF("E 10 20 5 3", {}, 0);
    expect(x!.ops[0].kind).toBe("filled_ellipse");
  });
});
