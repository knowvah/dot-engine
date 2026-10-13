// SPDX-License-Identifier: EPL-2.0
/**
 * orthoEdges' `goto orthofinish` exits still return 0 in graphviz 16.1: only
 * a mkMaze failure is reported as -1 (178fe6d2f). A shortPath failure (PQ
 * overflow) or an assignTracks failure abandons routing without installing
 * any edge, then falls through to `return 0`, so dot_splines_ carries on.
 * Both failures are unreachable on real inputs, so the two collaborators are
 * stubbed here to force each exit.
 *
 * @see lib/ortho/ortho.c:orthoEdges (orthofinish)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { OrthoGraph, OrthoNode } from "./types.js";

const failures = vi.hoisted(() => ({ shortPath: 0, assignTracks: 0 }));

vi.mock("./sgraph.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./sgraph.js")>();
  return {
    ...mod,
    shortPath: (...args: Parameters<typeof mod.shortPath>): number =>
      failures.shortPath !== 0 ? failures.shortPath : mod.shortPath(...args),
  };
});

vi.mock("./ortho-route.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./ortho-route.js")>();
  return {
    ...mod,
    assignTracks: (...args: Parameters<typeof mod.assignTracks>): number =>
      failures.assignTracks !== 0 ? failures.assignTracks : mod.assignTracks(...args),
  };
});

const { orthoEdges } = await import("./index.js");

function twoNodeGraph(): OrthoGraph {
  const a: OrthoNode = { bb: { LL: { x: 0, y: 0 }, UR: { x: 20, y: 20 } } };
  const b: OrthoNode = { bb: { LL: { x: 100, y: 0 }, UR: { x: 120, y: 20 } } };
  return { nodes: [a, b], edges: [{ tail: a, head: b }] };
}

beforeEach(() => {
  failures.shortPath = 0;
  failures.assignTracks = 0;
});

describe("orthoEdges — orthofinish exits return 0", () => {
  it("returns 0 and installs nothing when shortPath fails", () => {
    failures.shortPath = 1;
    const install = vi.fn();
    expect(orthoEdges(twoNodeGraph(), false, install)).toBe(0);
    expect(install).not.toHaveBeenCalled();
  });

  it("returns 0 and installs nothing when assignTracks fails", () => {
    failures.assignTracks = -1;
    const install = vi.fn();
    expect(orthoEdges(twoNodeGraph(), false, install)).toBe(0);
    expect(install).not.toHaveBeenCalled();
  });

  it("installs the route when neither collaborator fails", () => {
    const install = vi.fn();
    expect(orthoEdges(twoNodeGraph(), false, install)).toBe(0);
    expect(install).toHaveBeenCalledTimes(1);
  });
});
