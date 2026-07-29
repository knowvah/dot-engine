// SPDX-License-Identifier: EPL-2.0

/**
 * Shared test helper: render a (parsed) graph to any registered format
 * string, including formats outside the public `OutputFormat` union
 * (`json0`, `imap-np`, `cmapx-np`) that the branch-coverage suites still
 * need to exercise. Mirrors `src/render/public.ts:render`'s lifecycle
 * (createDefaultContext -> layout -> deviceRender -> freeLayout) without
 * the closed-union format type.
 */

import { createDefaultContext } from '../../src/gvc/default-context.js';
import { render as deviceRender } from '../../src/gvc/device.js';
import type { EngineName } from '../../src/gvc/context.js';
import type { Graph } from '../../src/model/graph.js';

export function renderFormat(g: Graph, format: string, engine: EngineName = 'dot'): string {
  const ctx = createDefaultContext();
  ctx.layout(g, engine);
  const out = deviceRender(ctx, g, format);
  ctx.freeLayout(g, engine);
  return out;
}
