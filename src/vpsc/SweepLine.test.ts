// SPDX-License-Identifier: EPL-2.0

/**
 * The orderings of lib/vpsc/generate-constraints.cpp's `NodeSet`
 * (`std::set<Node*, CmpNodePos>`): position, ties by `Node*` address, which
 * the port reads as creation order (part-8 AD-8). Expected constraint lists
 * are traced by hand from the C++ and were cross-checked against a native
 * driver linked to the oracle's libvpsc.a.
 */

import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildXEvents,
  buildYEvents,
  compareEvents,
  generateXConstraints,
  generateYConstraints,
  getLeftNeighbours,
  getRightNeighbours,
  makeNode,
  nodePosLt,
  scanlineInsert,
  scanlineRemove,
  xOpenNeighbour,
} from "./SweepLine.js";
import { Rectangle } from "./Solver.js";
import { Variable } from "./Variable.js";
import type { Constraint } from "./Constraint.js";
import { EvType } from "./sweepTypes.js";
import type { SweepEvent, SweepNode } from "./sweepTypes.js";
import { libcxxSort } from "../util/libcxx-sort.js";

/** Rectangles spanning y 0..100, so every x overlap is resolved in x. */
const TALL_MAX_Y = 100;

/** @param seq also the variable id, so results read as creation indices */
function nodeAt(seq: number, pos: number, minX = 0, maxX = 1): SweepNode {
  const r = new Rectangle(minX, maxX, 0, TALL_MAX_Y);
  return makeNode(new Variable(seq, 0, 1), r, pos, seq);
}

/** A node positioned at its rectangle's centre, as generateXConstraints builds it. */
function tallNode(seq: number, minX: number, maxX: number): SweepNode {
  return nodeAt(seq, (minX + maxX) / 2, minX, maxX);
}

const seqs = (ns: readonly SweepNode[]): number[] => ns.map((n) => n.seq);

function variables(n: number): Variable[] {
  return Array.from({ length: n }, (_, i) => new Variable(i, 0, 1));
}

const triples = (cs: readonly Constraint[]): number[][] =>
  cs.map((c) => [c.left.id, c.right.id, c.gap]);

describe("nodePosLt (CmpNodePos)", () => {
  it("orders by position first, whatever the creation order", () => {
    const later = nodeAt(5, 1);
    const earlier = nodeAt(0, 2);
    expect(nodePosLt(later, earlier)).toBe(true);
    expect(nodePosLt(earlier, later)).toBe(false);
  });

  it("breaks an exact position tie by creation order", () => {
    const first = nodeAt(0, 3);
    const second = nodeAt(1, 3);
    expect(nodePosLt(first, second)).toBe(true);
    expect(nodePosLt(second, first)).toBe(false);
  });

  it("is irreflexive, as a std::set comparator must be", () => {
    const n = nodeAt(0, 3);
    expect(nodePosLt(n, n)).toBe(false);
  });
});

describe("scanlineInsert (NodeSet::insert)", () => {
  it("keeps position order with ties by creation order, for any insert order", () => {
    const set: SweepNode[] = [];
    for (const n of [nodeAt(2, 5), nodeAt(3, 1), nodeAt(0, 5), nodeAt(1, 9)]) {
      scanlineInsert(set, n);
    }
    expect(seqs(set)).toEqual([3, 0, 2, 1]);
  });

  it("does not insert a node the set already holds", () => {
    const n = nodeAt(0, 5);
    const set: SweepNode[] = [];
    scanlineInsert(set, n);
    scanlineInsert(set, n);
    expect(seqs(set)).toEqual([0]);
  });
});

describe("scanlineRemove (NodeSet::erase)", () => {
  it("removes the node and ignores one the set does not hold", () => {
    const [a, b, absent] = [nodeAt(0, 1), nodeAt(1, 2), nodeAt(2, 3)];
    const set = [a, b];
    scanlineRemove(set, absent);
    expect(seqs(set)).toEqual([0, 1]);
    scanlineRemove(set, a);
    expect(seqs(set)).toEqual([1]);
  });
});

describe("getLeftNeighbours / getRightNeighbours", () => {
  it("returns the left set in position order though the walk descends", () => {
    const sl = [tallNode(1, 0, 12), tallNode(2, 2, 12), tallNode(0, 10, 14)];
    expect(seqs(getLeftNeighbours(sl, sl[2]!))).toEqual([1, 2]);
  });

  it("returns the right set in position order", () => {
    const sl = [tallNode(0, 0, 4), tallNode(2, 2, 12), tallNode(1, 3, 13)];
    expect(seqs(getRightNeighbours(sl, sl[0]!))).toEqual([2, 1]);
  });

  it("stops each walk at the first node with no x overlap, keeping it", () => {
    const sl = [
      tallNode(0, 0, 1), tallNode(1, 2, 3), tallNode(2, 4, 5),
      tallNode(3, 6, 7), tallNode(4, 8, 9),
    ];
    expect(seqs(getLeftNeighbours(sl, sl[2]!))).toEqual([1]);
    expect(seqs(getRightNeighbours(sl, sl[2]!))).toEqual([3]);
  });
});

describe("xOpenNeighbour (Node::setNeighbours)", () => {
  it("adds the node to its neighbours' sets in position order", () => {
    const low = tallNode(0, 0, 8);
    const high = tallNode(1, 6, 14);
    const sl = [low, high];
    xOpenNeighbour(sl, high);
    const mid = tallNode(2, 3, 11);
    sl.splice(1, 0, mid);
    xOpenNeighbour(sl, mid);
    expect(seqs(low.rightNeighbours)).toEqual([2, 1]);
    expect(seqs(high.leftNeighbours)).toEqual([0, 2]);
    expect(seqs(mid.leftNeighbours)).toEqual([0]);
    expect(seqs(mid.rightNeighbours)).toEqual([1]);
  });
});

describe("generateXConstraints with neighbour lists", () => {
  it("emits a close's left neighbours in position order, not creation order", () => {
    const rects = [
      new Rectangle(2, 8, 0, 101),
      new Rectangle(0, 6, 1, 102),
      new Rectangle(4, 12, 2, 50),
    ];
    const cs = generateXConstraints(rects, variables(3), true);
    expect(triples(cs)).toEqual([[1, 2, 7], [0, 2, 7], [1, 0, 6]]);
  });

  it("emits a close's right neighbours in position order, not arrival order", () => {
    const rects = [
      new Rectangle(0, 8, 0, 60),
      new Rectangle(6, 14, 1, 90),
      new Rectangle(3, 11, 2, 95),
    ];
    const cs = generateXConstraints(rects, variables(3), true);
    expect(triples(cs)).toEqual([[0, 2, 8], [0, 1, 8], [2, 1, 8]]);
  });

  it("orders tied neighbours by creation order", () => {
    // 0 and 1 share the centre x = 5; 2 (centre 8) closes first.
    const rects = [
      new Rectangle(2, 8, 0, 101),
      new Rectangle(1, 9, 1, 102),
      new Rectangle(4, 12, 2, 50),
    ];
    const cs = generateXConstraints(rects, variables(3), true);
    expect(triples(cs)).toEqual([[0, 2, 7], [1, 2, 8], [0, 1, 7]]);
  });
});

describe("ties on the scanline", () => {
  it("generateYConstraints links equal centres in creation order", () => {
    const rects = [
      new Rectangle(0, 10, 0, 2),
      new Rectangle(1, 11, 0, 2),
      new Rectangle(2, 12, 0, 2),
    ];
    const cs = generateYConstraints(rects, variables(3));
    expect(triples(cs)).toEqual([[0, 1, 2], [1, 2, 2]]);
  });

  it("generateYConstraints ignores the opening order of a tie", () => {
    const rects = [
      new Rectangle(2, 12, 0, 2),
      new Rectangle(1, 11, 0, 2),
      new Rectangle(0, 10, 0, 2),
    ];
    const cs = generateYConstraints(rects, variables(3));
    expect(triples(cs)).toEqual([[1, 2, 2], [0, 1, 2]]);
  });

  it("generateXConstraints without neighbour lists links ties in creation order", () => {
    const rects = [
      new Rectangle(0, 2, 2, 12),
      new Rectangle(0, 2, 1, 11),
      new Rectangle(0, 2, 0, 10),
    ];
    const cs = generateXConstraints(rects, variables(3), false);
    expect(triples(cs)).toEqual([[1, 2, 2], [0, 1, 2]]);
  });
});

/**
 * Dumps of plans/post-16-1-followups-9/harness/T7: sorted events from the oracle's sources with
 * a print after `std::sort`, identical over 8 environments; constraints from the unpatched
 * libvpsc.a, on the cases whose centres are distinct, so `Node*` addresses play no part.
 */
const T7_DUMPS = new URL("../../plans/post-16-1-followups-9/harness/T7/dumps/", import.meta.url);
const readDump = (name: string): Record<string, string> =>
  JSON.parse(fs.readFileSync(new URL(name, T7_DUMPS), "utf8")) as Record<string, string>;

/** The layouts of harness/T7/native-unit.cpp. */
function layoutRect(kind: string, i: number, side: number): Rectangle {
  const col = (i % side) * 10;
  const row = Math.trunc(i / side) * 10;
  switch (kind) {
    case "row": return new Rectangle(i * 10, i * 10 + 8, 0, 4);
    case "col": return new Rectangle(0, 8, i * 10, i * 10 + 4);
    case "same": return new Rectangle(0, 8, 0, 4);
    case "grid": return new Rectangle(col, col + 8, row, row + 8);
    case "touch": return new Rectangle(i * 8, i * 8 + 8, 0, 4);
    case "overlap": return new Rectangle(i * 4, i * 4 + 8, 0, 4);
    case "point": return new Rectangle(i * 10, i * 10, 0, 0);
    default: throw new Error(`unknown layout ${kind}`);
  }
}

function layout(kind: string, n: number): Rectangle[] {
  const side = Math.ceil(Math.sqrt(n));
  return Array.from({ length: n }, (_, i) => layoutRect(kind, i, side));
}

const eventText = (es: readonly SweepEvent[]): string =>
  es.map((e) => `${e.type === EvType.Open ? "o" : "c"}${e.node.v.id}`).join(" ");

describe("compareEvents (compare_events)", () => {
  const eventsOf = (minY: number, maxY: number): SweepEvent[] =>
    buildXEvents([new Rectangle(0, 1, minY, maxY)], variables(1));

  it("puts Open before Close on one rectangle, whatever the positions", () => {
    const [open, close] = eventsOf(3, 3) as [SweepEvent, SweepEvent];
    expect(compareEvents(open, close)).toBe(true);
    expect(compareEvents(close, open)).toBe(false);
    expect(compareEvents(open, open)).toBe(false);
  });

  it("orders different rectangles by position, and a tie is false both ways", () => {
    const rects = [new Rectangle(0, 1, 0, 2), new Rectangle(0, 1, 0, 5)];
    const [a, closeA, b, closeB] = buildXEvents(rects, variables(2)) as [
      SweepEvent, SweepEvent, SweepEvent, SweepEvent,
    ];
    expect(compareEvents(closeA, closeB)).toBe(true);
    expect(compareEvents(closeB, closeA)).toBe(false);
    expect(compareEvents(a, b)).toBe(false);
    expect(compareEvents(b, a)).toBe(false);
  });
});

describe("sweep event order (std::sort with compare_events)", () => {
  const NATIVE = readDump("events.json");

  it("covers every layout at every size in both passes", () => {
    expect(Object.keys(NATIVE)).toHaveLength(7 * 8 * 2);
    expect(NATIVE["row 24 X"]?.split(" ").slice(0, 24).join(" ")).toBe(
      "o0 o1 o2 o3 o4 o5 o6 o7 o8 o9 o10 o11 o12 o13 o14 o15 o16 o17 o23 o22 o21 o20 o19 o18",
    );
  });

  it.each(Object.keys(NATIVE))("matches native on %s", (key) => {
    const [kind, n, pass] = key.split(" ") as [string, string, string];
    const rects = layout(kind, Number(n));
    const vs = variables(rects.length);
    const events = pass === "X" ? buildXEvents(rects, vs) : buildYEvents(rects, vs);
    libcxxSort(events, compareEvents);
    expect(eventText(events)).toBe(NATIVE[key]?.trim());
  });
});

describe("generated constraints follow native's event order", () => {
  const NATIVE = readDump("constraints.json");

  /** Mode 1 and 0 are the X pass with and without neighbour lists, 2 is the Y pass. */
  function generate(rects: Rectangle[], mode: number): readonly Constraint[] {
    const vs = variables(rects.length);
    if (mode === 2) return generateYConstraints(rects, vs);
    return generateXConstraints(rects, vs, mode === 1);
  }

  it("covers the address-free cases at every size", () => {
    expect(Object.keys(NATIVE)).toHaveLength(9 * 8);
  });

  it.each(Object.keys(NATIVE))("matches the oracle's libvpsc on %s", (key) => {
    const [kind, n, mode] = key.split(" ") as [string, string, string];
    const got = generate(layout(kind, Number(n)), Number(mode));
    const text = got.map((c) => `${c.left.id},${c.right.id},${c.gap}`).join(" ");
    expect(text).toBe(NATIVE[key]);
  });
});
