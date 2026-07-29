// SPDX-License-Identifier: EPL-2.0
//
// Branch coverage for attrs.ts (T4d): graphInputParts' computed-attr skip and
// eagerEmptyParts' root/parent-null/computed-key arms, echoAttr's empty-value
// branch, echoGraphAttr's writeDictSkips branch, and edgePosRaw's IGNORED
// gate and multi-bezier separator. All are pure exported functions, tested
// directly against hand-built Graph/Edge fixtures.

import { describe, it, expect } from "vitest";
import {
  graphInputParts, echoAttr, echoGraphAttr, formatEdgePos, edgePosRaw,
} from "./attrs.js";
import { IGNORED } from "../../layout/dot/rank.js";
import { Graph } from "../../model/graph.js";
import { Node } from "../../model/node.js";
import { Edge } from "../../model/edge.js";
import type { Bezier, Spline } from "../../model/geom.js";

// ---------------------------------------------------------------------------
// graphInputParts — computed-attr skip
// ---------------------------------------------------------------------------

describe("graphInputParts — computed-attr skip", () => {
  it("a graph attr named 'bb' (a COMPUTED_GRAPH_ATTRS member) is skipped", () => {
    const g = new Graph("G", "directed");
    g.attrs.set("bb", "0,0,10,10");
    g.attrs.set("rankdir", "LR");
    const parts = graphInputParts(g, true, false);
    expect(parts).not.toContain("bb=0,0,10,10");
    expect(parts.some((p) => p.startsWith("rankdir="))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// eagerEmptyParts (via graphInputParts, top=false, snapshot present)
// ---------------------------------------------------------------------------

describe("eagerEmptyParts — parent === null returns no eager-empty parts", () => {
  it("a non-top graph with parent=null and a snapshot produces only its own attrs", () => {
    const g = new Graph("", "directed"); // parent stays null
    g.graphDefaultsSnapshot = new Map();
    g.attrs.set("label", "x");
    const parts = graphInputParts(g, false, false);
    expect(parts).toContain("label=x");
  });
});

describe("eagerEmptyParts — root parent, computed key in p.attrs is skipped", () => {
  it("does not emit an eager-empty part for a key in COMPUTED_GRAPH_ATTRS", () => {
    const root = new Graph("G", "directed");
    root.attrs.set("bb", "0,0,1,1"); // COMPUTED_GRAPH_ATTRS member
    root.attrs.set("rankdir", "LR"); // ordinary key -> triggers eager-empty
    const sub = new Graph("", "directed");
    sub.parent = root; sub.root = root;
    sub.graphDefaultsSnapshot = new Map(); // snapshot present, no 'rankdir'/'bb' recorded
    const parts = graphInputParts(sub, false, false);
    // 'bb' must never appear as an eager-empty part (computed.has short-circuits it).
    expect(parts.some((p) => p.startsWith("bb="))).toBe(false);
    // 'rankdir' (ordinary, root-declared, not in snapshot, not in sub.attrs) DOES
    // get the eager-empty treatment — confirms the loop actually ran.
    expect(parts).toContain('rankdir=""');
  });
});

// ---------------------------------------------------------------------------
// echoAttr — empty-value branch
// ---------------------------------------------------------------------------

describe("echoAttr — empty string value", () => {
  it("returns [] for a present-but-empty attribute", () => {
    const attrs = new Map([["foo", ""]]);
    expect(echoAttr(attrs, "foo")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// echoGraphAttr — writeDictSkips branch
// ---------------------------------------------------------------------------

describe("echoGraphAttr — writeDictSkips (empty local, empty inherited)", () => {
  it("skips an empty value whose inherited snapshot value is also empty", () => {
    const g = new Graph("", "directed");
    g.attrs.set("lp", "");
    g.graphDefaultsSnapshot = new Map([["lp", ""]]);
    expect(echoGraphAttr(g, "lp")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// edgePosRaw / formatEdgePos — IGNORED gate + multi-bezier separator
// ---------------------------------------------------------------------------

function bez(pts: { x: number; y: number }[]): Bezier {
  return { list: pts, size: pts.length, sflag: 0, eflag: 0, sp: pts[0]!, ep: pts[pts.length - 1]! };
}

function makeEdgeWithSpl(spl: Spline): Edge {
  const g = new Graph("G", "directed");
  const e = new Edge(new Node(0, "a", g), new Node(1, "b", g), "");
  e.info.spl = spl;
  return e;
}

describe("edgePosRaw — IGNORED edge returns null", () => {
  it("an IGNORED (concentrate-absorbed) edge carries no pos", () => {
    const e = makeEdgeWithSpl({ size: 1, list: [bez([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }])], bb: { ll: { x: 0, y: 0 }, ur: { x: 3, y: 3 } } });
    e.info.edge_type = IGNORED;
    expect(edgePosRaw(e)).toBeNull();
    expect(formatEdgePos(e)).toBe("");
  });
});

describe("edgePosRaw — multi-bezier separator", () => {
  it("joins two beziers with ';' and no leading space", () => {
    const b1 = bez([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }]);
    const b2 = bez([{ x: 4, y: 4 }, { x: 5, y: 5 }, { x: 6, y: 6 }, { x: 7, y: 7 }]);
    const e = makeEdgeWithSpl({ size: 2, list: [b1, b2], bb: { ll: { x: 0, y: 0 }, ur: { x: 7, y: 7 } } });
    const raw = edgePosRaw(e);
    expect(raw).toBe("0,0 1,1 2,2 3,3;4,4 5,5 6,6 7,7");
    expect(formatEdgePos(e)).toBe('pos="0,0 1,1 2,2 3,3;4,4 5,5 6,6 7,7"');
  });
});
