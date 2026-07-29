// SPDX-License-Identifier: EPL-2.0
//
// Branch coverage for xdot-public.ts's error-normalization helpers
// (isGvErrorLike / rethrowAsRender), reached only from layoutAndRenderXdot's
// catch block — no existing test throws through getDrawOps, so this file
// exercises all three catch shapes: a GvError-like object (rethrown as-is),
// a real Error instance (message used), and a non-Error thrown value
// (String()'d). createDefaultContext is mocked so ctx.layout throws each
// shape directly, without needing a real layout failure.

import { describe, it, expect, vi } from "vitest";
import { Graph } from "../model/graph.js";
import { RenderError } from "../errors.js";

const layoutMock = vi.fn();

vi.mock("../gvc/default-context.js", () => ({
  createDefaultContext: () => ({
    layout: layoutMock,
    freeLayout: () => {},
    bestRenderer: () => { throw new Error("unused"); },
    textMeasurer: { measure: () => ({ w: 0, h: 0 }) },
  }),
}));

describe("getDrawOps — error normalization in layoutAndRenderXdot's catch", () => {
  it("rethrows a GvError-like object as-is (isGvErrorLike true)", async () => {
    const { getDrawOps } = await import("./xdot-public.js");
    const gvErr = { type: "LayoutError", code: "E_LAYOUT", message: "bad graph" };
    layoutMock.mockImplementationOnce(() => { throw gvErr; });
    const g = new Graph("G", "directed");
    try {
      getDrawOps(g);
      expect.unreachable();
    } catch (err) {
      expect(err).toBe(gvErr); // same object, not wrapped
    }
  });

  it("wraps a real Error instance using its .message", async () => {
    const { getDrawOps } = await import("./xdot-public.js");
    layoutMock.mockImplementationOnce(() => { throw new Error("boom"); });
    const g = new Graph("G", "directed");
    try {
      getDrawOps(g);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(RenderError);
      expect((err as RenderError).message).toBe("boom");
    }
  });

  it("wraps a non-Error thrown value using String()", async () => {
    const { getDrawOps } = await import("./xdot-public.js");
    layoutMock.mockImplementationOnce(() => { throw "plain string failure"; });
    const g = new Graph("G", "directed");
    try {
      getDrawOps(g);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(RenderError);
      expect((err as RenderError).message).toBe("plain string failure");
    }
  });
});
