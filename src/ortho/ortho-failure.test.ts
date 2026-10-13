// SPDX-License-Identifier: EPL-2.0
/**
 * Graphviz 16.1 ortho failure chain (Gitlab #2784).
 *
 * 16.1 turned the "case cannot arise" branch of add_segment into a reported
 * failure that propagates outward:
 *   add_segment → -1 + "trapezoid segment construction failed"   (3c01aaeb4)
 *   construct_trapezoids → empty trapezoid list                  (3660b260e)
 *   partition → NULL + "horizontal|vertical trapezoid ..."       (057e8779d, 67bacf48e)
 *   mkMaze → NULL                                                (312e49714)
 *   orthoEdges → -1                                              (178fe6d2f)
 *
 * The geometry is the dot layout of graphviz tests/2784.dot as mkMaze sees
 * it: five 54x36 nodes and one 2.16e18-tall node on a single rank at
 * y = 1.08e18, where `y ± 18` rounds back to `y` (ULP 256) so five gcells
 * are zero-height. Native 16.1 prints exactly the two lines asserted below
 * on that input (stderr captured from `dot -Tsvg tests/2784.dot`).
 *
 * Every partition expectation (NULL vs rectangle count, and the exact stderr
 * lines) was captured from a C harness linking the 16.1 build's libortho.a
 * and calling `partition()` with these exact cells and BB. The small
 * single/double-cell cases came from fuzzing that harness. The silent-NULL case
 * is partition's final `LIST_DETACH(&rs, &ret, nrects)`: an empty list has a
 * NULL base, so mkMaze's new `rects == NULL` check fails it too.
 *
 * @see lib/ortho/trapezoid.c:add_segment
 * @see lib/ortho/trapezoid.c:construct_trapezoids
 * @see lib/ortho/partition.c:partition
 * @see lib/ortho/maze.c:mkMaze
 * @see lib/ortho/ortho.c:orthoEdges
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { partition } from "./partition.js";
import { mkMaze } from "./maze.js";
import { orthoEdges } from "./index.js";
import type { Cell, OrthoBox, OrthoGraph, OrthoNode } from "./types.js";

const TRAP_SEG_FAILED = "trapezoid segment construction failed";
const HOR_TRAPS_FAILED = "horizontal trapezoid construction failed";
const VER_TRAPS_FAILED = "vertical trapezoid construction failed";

/** Rank-0 centre line of 2784 (ND_coord.y of every node). */
const Y_2784 = 1080000000000000000;
/** Node x centres of 2784, in agfstnode order: 00, 0, e, 2, 1, 6. */
const X_2784 = [0, 72, 144, 216, 288, 360];
/** Index of node "2" (height=3e16 inches → ht 2.16e18 points). */
const TALL_2784 = 3;

function node2784(x: number, i: number): OrthoNode {
  const ysize = i === TALL_2784 ? 2 * Y_2784 : 36;
  return {
    bb: { LL: { x: x - 27, y: Y_2784 - ysize / 2 }, UR: { x: x + 27, y: Y_2784 + ysize / 2 } },
    coord: { x, y: Y_2784 },
    xsize: 54,
    ysize,
  };
}

function graph2784(): OrthoGraph {
  const nodes = X_2784.map(node2784);
  return { nodes, edges: [{ tail: nodes[0]!, head: nodes[1]! }] };
}

function box(LLx: number, LLy: number, URx: number, URy: number): OrthoBox {
  return { LL: { x: LLx, y: LLy }, UR: { x: URx, y: URy } };
}

function cell(bb: OrthoBox): Cell {
  return { flags: 0, nedges: 0, edges: [], nsides: 0, sides: [], bb };
}

/** The gcells + BB mkMaze hands to partition for 2784 (captured from mkMaze). */
function cells2784(): Cell[] {
  return X_2784.map((x, i) =>
    i === TALL_2784
      ? cell(box(x - 27, 0, x + 27, 2 * Y_2784))
      : cell(box(x - 27, Y_2784, x + 27, Y_2784)));
}
const BB_2784 = box(-63, -36, 423, 2 * Y_2784);

function stderrLines(spy: { mock: { calls: unknown[][] } }): unknown[] {
  return spy.mock.calls.map((c) => c[0]);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("partition — trapezoid construction failure (057e8779d, 3c01aaeb4, 3660b260e)", () => {
  it("returns null and reports the segment then the horizontal failure on 2784", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(partition(cells2784(), BB_2784)).toBeNull();
    expect(stderrLines(err)).toEqual([TRAP_SEG_FAILED, HOR_TRAPS_FAILED]);
  });

  it("returns null and reports the horizontal failure for a single point cell", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(partition([cell(box(0, 10, 0, 10))], box(-36, -26, 36, 46))).toBeNull();
    expect(stderrLines(err)).toEqual([TRAP_SEG_FAILED, HOR_TRAPS_FAILED]);
  });

  it("returns null and reports the vertical failure when only the vertical pass fails (67bacf48e)", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const cells = [cell(box(0, 0, 0, 30)), cell(box(0, 0, 10, 10))];
    expect(partition(cells, box(-36, -36, 46, 66))).toBeNull();
    expect(stderrLines(err)).toEqual([TRAP_SEG_FAILED, VER_TRAPS_FAILED]);
  });

  it("returns null silently when no rectangle survives (LIST_DETACH of an empty list)", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(partition([cell(box(10, 20, 10, 30))], box(-26, -16, 46, 66))).toBeNull();
    expect(err).not.toHaveBeenCalled();
  });

  it("still returns the rectangle set for well-formed cells", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const rects = partition([cell(box(0, 0, 10, 10))], box(-36, -36, 46, 46));
    expect(rects).toHaveLength(8);
    expect(err).not.toHaveBeenCalled();
  });
});

describe("mkMaze — partition failure (312e49714)", () => {
  it("returns null when partition fails", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(mkMaze(graph2784())).toBeNull();
  });
});

describe("orthoEdges — mkMaze failure (178fe6d2f)", () => {
  it("returns -1 and installs no edge when mkMaze fails", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const install = vi.fn();
    expect(orthoEdges(graph2784(), false, install)).toBe(-1);
    expect(install).not.toHaveBeenCalled();
    expect(stderrLines(err)).toEqual([TRAP_SEG_FAILED, HOR_TRAPS_FAILED]);
  });

  it("returns 0 after routing a well-formed graph", () => {
    const a: OrthoNode = { bb: box(0, 0, 20, 20) };
    const b: OrthoNode = { bb: box(100, 0, 120, 20) };
    const install = vi.fn();
    expect(orthoEdges({ nodes: [a, b], edges: [{ tail: a, head: b }] }, false, install)).toBe(0);
    expect(install).toHaveBeenCalledTimes(1);
  });
});
