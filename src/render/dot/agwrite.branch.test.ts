// SPDX-License-Identifier: EPL-2.0
//
// Branch coverage for agwrite.ts (T4d): DotWriterBase is an abstract class
// whose serialization helpers (irrelevantSubgraph, the sort-tie-break in
// writeDict/objAttrBlock, clustnode endpoint naming, portSuffix's HTML-value
// branch, clusterAttrs' emitDraws=false path) are private. Most are exercised
// through the concrete XdotRenderer/DotRenderer's public endGraph (which
// calls the protected `serialize`); a few structurally-private-only branches
// (irrelevantSubgraph's rare arms, the sort tie-break) are reached via a
// direct cast to the instance — a standard technique for unit-testing class
// internals that have no other public seam, matching the pattern already
// used elsewhere in this port's branch-test suite.

import { describe, it, expect } from "vitest";
import { XdotRenderer, DotRenderer } from "../dot.js";
import { RenderJob } from "../../gvc/job.js";
import type { TextMeasurer } from "../../common/textmeasure.js";
import { Graph } from "../../model/graph.js";
import { Node } from "../../model/node.js";
import { Edge } from "../../model/edge.js";
import { HTML_STRING_MARK } from "../../common/html-string.js";

const measurer: TextMeasurer = { measure: () => ({ w: 0, h: 0 }) };

function makeJob(): RenderJob {
  const j = new RenderJob("xdot", measurer);
  j.bb = { ll: { x: 0, y: 0 }, ur: { x: 100, y: 100 } };
  return j;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Priv = any;

// ---------------------------------------------------------------------------
// irrelevantSubgraph — direct private-method access
// ---------------------------------------------------------------------------

describe("irrelevantSubgraph", () => {
  it("an anonymous subgraph registered as a cluster is never irrelevant", () => {
    const g = new Graph("G", "directed");
    const sg = new Graph("", "directed");
    sg.parent = g; sg.root = g;
    const r = new XdotRenderer() as Priv;
    r.clusters = [sg];
    expect(r.irrelevantSubgraph(sg)).toBe(false);
  });

  it("an anonymous subgraph whose own attr differs from its parent's is not irrelevant", () => {
    const root = new Graph("G", "directed");
    const mid = new Graph("", "directed");
    mid.parent = root; mid.root = root;
    const sg = new Graph("", "directed");
    sg.parent = mid; sg.root = root;
    sg.attrs.set("rank", "same"); // mid.attrs has no 'rank' -> mismatch
    const r = new XdotRenderer() as Priv;
    r.clusters = [];
    expect(r.irrelevantSubgraph(sg)).toBe(false);
  });

  it("a root-like graph (parent=null) with attrs is not irrelevant", () => {
    const root = new Graph("", "directed"); // parent stays null (constructor default)
    root.attrs.set("foo", "bar");
    const r = new XdotRenderer() as Priv;
    r.clusters = [];
    expect(r.irrelevantSubgraph(root)).toBe(false);
  });

  it("a root-like graph (parent=null) with no attrs IS irrelevant", () => {
    const root = new Graph("", "directed");
    const r = new XdotRenderer() as Priv;
    r.clusters = [];
    expect(r.irrelevantSubgraph(root)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// writeDict / objAttrBlock — sort comparator tie-break (equal keys)
// ---------------------------------------------------------------------------

describe("writeDict / objAttrBlock — sort tie-break on equal keys", () => {
  it("writeDict's comparator returns 0 for two parts sharing the same key", () => {
    const r = new XdotRenderer() as Priv;
    const ctx: Priv = { level: 0, out: [] };
    r.writeDict("graph", ['a="1"', 'a="2"'], ctx);
    // Stable sort with a 0 comparator preserves input order.
    expect(ctx.out.join("")).toBe('graph [a="1",\n\ta="2"\n];\n');
  });

  it("objAttrBlock's comparator returns 0 for two parts sharing the same key", () => {
    const r = new XdotRenderer() as Priv;
    const ctx: Priv = { level: 0 };
    const block = r.objAttrBlock(['a="1"', 'a="2"'], ctx) as string;
    expect(block).toBe('\t[a="1",\n\ta="2"]');
  });
});

// ---------------------------------------------------------------------------
// writeSubgs — an irrelevant subgraph is inlined (no header), its own
// children are written at the parent's level instead.
// ---------------------------------------------------------------------------

describe("writeSubgs — irrelevant subgraph inlines its children", () => {
  it("the irrelevant anonymous grandchild is inlined; its own nested cluster still gets a header", () => {
    // irrelevantSubgraph's hasBb check requires the candidate's hasBb to MATCH
    // its parent's. A direct child of the literal root can never match (the
    // root's hasBb is always true), so the irrelevant subgraph must be nested
    // one level deeper, under a plain NAMED (non-cluster) subgraph — which is
    // never itself inlined (isAnonymous short-circuits first) and has
    // hasBb=false, same as its anonymous child.
    const g = new Graph("G", "directed");
    const outer = new Graph("sub1", "directed"); // named, non-cluster -> always written
    outer.parent = g; outer.root = g;
    g.subgraphs.set("sub1", outer);
    const mid = new Graph("", "directed"); // anonymous, no attrs -> irrelevant (matches outer's hasBb=false)
    mid.parent = outer; mid.root = g;
    outer.subgraphs.set("%1", mid);
    const inner = new Graph("cluster_x", "directed");
    inner.parent = mid; inner.root = g;
    mid.subgraphs.set("cluster_x", inner);
    const job = makeJob();
    const r = new XdotRenderer();
    r.beginGraph(g, job);
    r.beginCluster(inner, job);
    r.endCluster(inner, job);
    r.endGraph(g, job);
    const out = job.output.join("");
    // "sub1" gets its own header; the anonymous "mid" does not (inlined —
    // its content appears directly inside sub1's block); the named cluster
    // nested inside "mid" still gets its own header.
    expect(out).toContain("subgraph sub1 {");
    expect(out).toContain("subgraph cluster_x {");
    // Exactly 2 "subgraph " headers total: sub1 and cluster_x — mid inlined.
    expect((out.match(/subgraph /g) ?? []).length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// writeNodeTest / emitNodeName — clustnode endpoints
// ---------------------------------------------------------------------------

describe("clustnode endpoint naming", () => {
  it("a clustnode is never independently declared, and its edge endpoint name strips the '__i:' prefix", () => {
    const g = new Graph("G", "directed");
    const a = new Node(0, "a", g);
    const cn = new Node(1, "__1:clusterA", g);
    cn.info.clustnode = true;
    g.nodes.set("a", a);
    g.nodes.set("__1:clusterA", cn);
    const e = new Edge(a, cn, "");
    g.edges.push(e);
    const job = makeJob();
    const r = new XdotRenderer();
    r.beginGraph(g, job);
    r.endGraph(g, job);
    const out = job.output.join("");
    expect(out).not.toContain("__1:clusterA");
    expect(out).toMatch(/a\s*->\s*clusterA/);
  });

  it("a clustnode name with no ':' is used verbatim as the edge endpoint", () => {
    const g = new Graph("G", "directed");
    const a = new Node(0, "a", g);
    const cn = new Node(1, "plainclust", g);
    cn.info.clustnode = true;
    g.nodes.set("a", a);
    g.nodes.set("plainclust", cn);
    const e = new Edge(a, cn, "");
    g.edges.push(e);
    const job = makeJob();
    const r = new XdotRenderer();
    r.beginGraph(g, job);
    r.endGraph(g, job);
    const out = job.output.join("");
    expect(out).toMatch(/a\s*->\s*plainclust/);
  });
});

// ---------------------------------------------------------------------------
// portSuffix — HTML-like port value
// ---------------------------------------------------------------------------

describe("portSuffix — HTML-like port value", () => {
  it("an HTML-like tailport value is canonicalized whole (not split on ':')", () => {
    const g = new Graph("G", "directed");
    const a = new Node(0, "a", g);
    const b = new Node(1, "b", g);
    g.nodes.set("a", a);
    g.nodes.set("b", b);
    const e = new Edge(a, b, "");
    e.attrs.set("tailport", HTML_STRING_MARK + "<b>x</b>");
    g.edges.push(e);
    const job = makeJob();
    const r = new XdotRenderer();
    r.beginGraph(g, job);
    r.endGraph(g, job);
    const out = job.output.join("");
    expect(out).toContain(":<");
  });
});

// ---------------------------------------------------------------------------
// clusterAttrs — emitDraws=false (DotRenderer / -Tdot)
// ---------------------------------------------------------------------------

describe("clusterAttrs — emitDraws=false (DotRenderer) omits _draw_", () => {
  it("a cluster written under DotRenderer carries no _draw_ attribute", () => {
    const g = new Graph("G", "directed");
    const cl = new Graph("cluster_0", "directed");
    cl.parent = g; cl.root = g;
    g.subgraphs.set("cluster_0", cl);
    const job = makeJob();
    const r = new DotRenderer();
    r.beginGraph(g, job);
    r.beginCluster(cl, job);
    r.endCluster(cl, job);
    r.endGraph(g, job);
    const out = job.output.join("");
    expect(out).toContain("subgraph cluster_0 {");
    expect(out).not.toContain("_draw_");
  });
});
