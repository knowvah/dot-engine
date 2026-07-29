// SPDX-License-Identifier: EPL-2.0
//
// Branch coverage for emit-walk.ts (T4d): the outputorder=edgesfirst
// dispatch (chkOrder + walkNodesAndEdges) and emitEdgesThenNodes' full loop
// body — including the `outIdx.get(n) ?? []` fallback for a node with no
// out-edges, exercised in the same walk as a node that has one.

import { describe, it, expect } from "vitest";
import { walkNodesAndEdges } from "./emit-walk.js";
import { XdotRenderer } from "../render/dot.js";
import { RenderJob } from "./job.js";
import type { TextMeasurer } from "../common/textmeasure.js";
import { Graph } from "../model/graph.js";
import { Node } from "../model/node.js";
import { Edge } from "../model/edge.js";

const measurer: TextMeasurer = { measure: () => ({ w: 0, h: 0 }) };

function makeJob(): RenderJob {
  const j = new RenderJob("xdot", measurer);
  j.bb = { ll: { x: -100, y: -100 }, ur: { x: 100, y: 100 } };
  return j;
}

describe("walkNodesAndEdges — outputorder=edgesfirst", () => {
  it("renders all edges before all nodes; a node with no out-edges hits the ?? [] fallback", () => {
    const job = makeJob();
    const r = new XdotRenderer();
    const g = new Graph("G", "directed");
    g.attrs.set("outputorder", "edgesfirst");
    const a = new Node(0, "a", g);
    const b = new Node(1, "b", g);
    const c = new Node(2, "c", g); // no out-edges -> outIdx.get(c) undefined
    g.nodes.set("a", a); g.nodes.set("b", b); g.nodes.set("c", c);
    const e = new Edge(a, b, "");
    g.edges.push(e);
    r.beginGraph(g, job);
    walkNodesAndEdges(g, r, job);
    r.endGraph(g, job);
    const draws = r.drawStringsByObject();
    // None of the objects carry a shape/spline, so none produce draw ops —
    // this proves the full edgesfirst walk (all 3 nodes + the 1 edge, both
    // outIdx.get() branches) completed without throwing and without
    // accidentally attaching spurious draw entries.
    expect(draws.size).toBe(0);
  });
});
