// SPDX-License-Identifier: EPL-2.0

/**
 * Multi-format public render entry point.
 *
 * Wraps the low-level `gvc/device.ts:render` with context lifecycle
 * management (layout → render → freeLayout) and structured-error handling,
 * mirroring `src/index.ts:renderSvg` exactly.
 *
 * @see lib/gvc/gvc.c:gvRender
 */

import type { Graph } from '../model/graph.js';
import { createDefaultContext } from '../gvc/default-context.js';
import { render as deviceRender } from '../gvc/device.js';
import { invalidArgType, rethrowAtBoundary } from '../errors.js';
import type { EngineName } from '../gvc/context.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Supported output formats. Closed string union matching the built-in
 * renderers registered by `createDefaultContext`.
 */
export type OutputFormat =
  | 'svg'
  | 'dot'
  | 'xdot'
  | 'json'
  | 'plain'
  | 'plain-ext'
  | 'imap'
  | 'cmapx';

/**
 * Options for {@link render}.
 */
export interface RenderOptions {
  /**
   * Layout engine to use. Defaults to `'dot'`.
   *
   * yAxis is intentionally absent: coordinate orientation is a `getLayout`
   * concern (ADR-5). The raw format strings produced here carry native
   * y-up coordinates; callers that need y-down must flip in post-processing.
   */
  engine?: EngineName;

  /**
   * Inline external images as `data:` URIs (AD-1, additive). Defaults to
   * `false` — unset reproduces the pre-AD-1 raw `xlink:href="src"`
   * passthrough byte-for-byte. When `true`, the SVG emitter consults the
   * process-global resolver registered via `setImageResolver` (from
   * `@knowvah/dot-engine`) for each `image=`/HTML `<IMG>` source; a hit is inlined
   * as `data:<mime>;base64,<...>`, a miss (or no resolver registered) falls
   * back to the raw src passthrough. Has no effect on non-SVG formats.
   */
  inlineImages?: boolean;
}

// ---------------------------------------------------------------------------
// Argument validation (shared with the async entry points)
// ---------------------------------------------------------------------------

/**
 * Reject a bad `g` / `format` / `opts` before any work starts.
 * @internal shared with src/async/render-async.ts; not part of the public API.
 */
export function checkRenderArgs(g: unknown, format: unknown, opts: unknown): void {
  if (typeof g !== 'object' || g === null) {
    throw invalidArgType('g', 'object', g);
  }
  if (typeof format !== 'string') {
    throw invalidArgType('format', 'string', format);
  }
  if (opts !== undefined && (typeof opts !== 'object' || opts === null)) {
    throw invalidArgType('opts', 'object or undefined', opts);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a (parsed or built) graph to the requested format string.
 *
 * Lifecycle: createDefaultContext → layout → deviceRender → freeLayout.
 * Error handling mirrors `renderSvg`: usage errors and GvErrors re-surface
 * unchanged; any other throw becomes an `InternalError` with `cause` set.
 *
 * @remarks
 * Security: for the markup formats (`svg`, `cmapx`, `imap`), treat the output
 * as attacker-controlled when the source graph came from untrusted DOT.
 * Attribute values are XML-escaped, but URL schemes and resource origins
 * (`href`/`URL`/`image`/`stylesheet`) are passed through unfiltered, matching
 * native Graphviz. Apply a Content-Security-Policy or sanitize before embedding
 * — see the README "Security" section.
 *
 * @param g      - graph produced by `parse(...)` or the builder API
 * @param format - target output format
 * @param opts   - optional engine override (default: `'dot'`)
 * @returns rendered string in the requested format
 * @throws TypeError `ERR_INVALID_ARG_TYPE` if `g` is not an object, `format`
 *   is not a string, or `opts` is neither undefined nor an object
 * @throws TypeError `ERR_INVALID_ARG_VALUE` if the engine or format is not
 *   registered
 * @throws RenderError `RENDER_ERROR`, `UNKNOWN_LAYOUT` or `UNSUPPORTED_FEATURE`
 *   on layout or render failure
 * @throws InternalError `INTERNAL_ERROR` on a dot-engine bug
 *
 * @see lib/gvc/gvc.c:gvRender
 */
export function render(
  g: Graph,
  format: OutputFormat,
  opts?: RenderOptions,
): string {
  checkRenderArgs(g, format, opts);
  const engine: EngineName = opts?.engine ?? 'dot';
  const inlineImages = opts?.inlineImages ?? false;
  const ctx = createDefaultContext();
  try {
    ctx.layout(g, engine);
    const result = deviceRender(ctx, g, format, inlineImages);
    ctx.freeLayout(g, engine);
    return result;
  } catch (err: unknown) {
    return rethrowAtBoundary(err);
  }
}
