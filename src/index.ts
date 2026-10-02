// SPDX-License-Identifier: EPL-2.0

/**
 * Public entry point for the @knowvah/dot-engine library.
 *
 * Wires together the parser, layout engines, SVG renderer, and GVC
 * orchestration layer into a single renderSvg function.
 *
 * @see lib/gvc/gvc.h
 */

import { parse } from './parser/index.js';
import {
  InternalError,
  invalidArgType,
  isGvError,
  isUsageError,
  messageOf,
  rethrowAtBoundary,
} from './errors.js';
import type { GvError, RenderResult } from './errors.js';
import type { EngineName } from './gvc/context.js';
import { render as deviceRender } from './gvc/device.js';
import { createDefaultContext } from './gvc/default-context.js';



/** Reject non-string `dotSource` / `engine` before any work starts. */
function checkRenderArgs(dotSource: unknown, engine: unknown): void {
  if (typeof dotSource !== 'string') {
    throw invalidArgType('dotSource', 'string', dotSource);
  }
  if (typeof engine !== 'string') {
    throw invalidArgType('engine', 'string', engine);
  }
}

/**
 * Normalize a thrown {@link GvError} to a plain, JSON-serializable data object
 * (no stack, no `cause`). A value that is not a GvError is wrapped as an
 * `InternalError` first.
 */
function classifyError(err: unknown): GvError {
  /* v8 ignore next 3 -- renderSvg already normalizes every non-usage throw to
     a GvError, so only a throw escaping its context setup could land here. */
  const gv: GvError = isGvError(err)
    ? err
    : new InternalError(messageOf(err), { cause: err });
  const out: GvError = {
    type: gv.type, code: gv.code, message: gv.message, friendlyMessage: gv.friendlyMessage,
  };
  if (gv.location !== undefined) out.location = gv.location;
  if (gv.expected !== undefined) out.expected = gv.expected;
  return out;
}

/**
 * Render a DOT-language string to SVG using the specified layout engine.
 *
 * Throws a {@link DotEngineError} for any problem with the input: `ParseError`
 * (`SYNTAX_*`, `EDGE_OP_*`, `GENERIC_ERROR` for nesting too deep) for invalid
 * DOT, `RenderError`
 * (`RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE`) for layout/render
 * failures, and `InternalError` (`INTERNAL_ERROR`, `cause` = original) for a
 * dot-engine bug. Invalid arguments throw a `TypeError` carrying a `code`. A
 * malformed HTML-like label does not throw: as in C (htmlparse.y YYABORT) the
 * label renders empty.
 *
 * @remarks
 * Security: when `dotSource` is untrusted, treat the returned SVG as
 * attacker-controlled markup. Attribute values are XML-escaped (no element or
 * attribute breakout), but URL schemes and resource origins in `href`/`URL`/
 * `image`/`stylesheet` are passed through unfiltered, matching native Graphviz.
 * Embedding pages should apply a Content-Security-Policy (or sanitize the
 * markup) — see the "Security" section of the README.
 *
 * @param dotSource - DOT-language graph source
 * @param engine    - layout engine name ({@link EngineName}): a built-in
 *                    ('dot', 'neato', 'fdp', 'sfdp', 'circo', 'twopi',
 *                    'osage', 'patchwork') or any custom-registered name
 * @returns SVG string
 * @throws TypeError `ERR_INVALID_ARG_TYPE` if `dotSource` or `engine` is not a string
 * @throws TypeError `ERR_INVALID_ARG_VALUE` if `engine` names no registered engine
 * @throws ParseError `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`,
 *   `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED` if
 *   `dotSource` is not valid DOT
 * @throws RenderError `RENDER_ERROR`, `UNKNOWN_LAYOUT` or `UNSUPPORTED_FEATURE`
 *   if layout or rendering fails
 * @throws InternalError `INTERNAL_ERROR` on a dot-engine bug
 */
export function renderSvg(dotSource: string, engine: EngineName): string {
  checkRenderArgs(dotSource, engine);
  const ctx = createDefaultContext();
  try {
    // parse() is inside the try so any non-ParseError throw (e.g. a raw
    // RangeError from stack exhaustion) is still normalized (InternalError).
    const g = parse(dotSource);
    ctx.layout(g, engine);
    const svg = deviceRender(ctx, g, 'svg');
    // C: gvFreeLayout runs after gvRenderJobs; cleanup is destructive.
    ctx.freeLayout(g, engine);
    return svg;
  } catch (err: unknown) {
    return rethrowAtBoundary(err);
  }
}

/**
 * Result-style render: returns `{ svg }` on success or `{ errors: [one] }` on
 * the first failure (svg XOR errors). Errors are plain JSON-serializable
 * {@link GvError} data objects. Returns (never throws) for any DOT input and
 * any failure of the graph itself; throws only for invalid arguments.
 *
 * @remarks
 * Security: same untrusted-input caveat as {@link renderSvg} — the returned
 * `svg` is attacker-controlled markup for untrusted `dotSource`; apply a CSP or
 * sanitize before embedding. See the README "Security" section.
 *
 * @throws TypeError `ERR_INVALID_ARG_TYPE` if `dotSource` or `engine` is not a string
 * @throws TypeError `ERR_INVALID_ARG_VALUE` if `engine` names no registered engine
 */
export function tryRenderSvg(dotSource: string, engine: EngineName): RenderResult {
  checkRenderArgs(dotSource, engine);
  try {
    return { svg: renderSvg(dotSource, engine) };
  } catch (err: unknown) {
    if (isUsageError(err)) throw err;
    return { errors: [classifyError(err)] };
  }
}

export { parse } from './parser/index.js';
export { ParseError } from './parser/index.js';
export { DotEngineError, InternalError, RenderError, isGvError } from './errors.js';
export type {
  GvError,
  UsageErrorCode,
  GvErrorType,
  GvErrorCode,
  GvExpectation,
  RenderResult,
} from './errors.js';
export { setImageSizer } from './gvc/usershape.js';
export type { ImageSizer } from './common/htmltable-types.js';
export { setImageResolver } from './gvc/image-resolver.js';
export type { ImageResolver } from './gvc/image-resolver.js';

// Text measurement: install a custom measurer (deterministic tests, or a
// host-faithful Node measurer wired from node-canvas). The library auto-resolves
// browser canvas → Node LUT by default and never imports `canvas` itself (zero
// runtime deps). @see plans/fix-xcoord-position/DESIGN.md
export { setTextMeasurer, getTextMeasurer } from './common/textmeasure-factory.js';
export {
  CanvasTextMeasurer, EstimateTextMeasurer, LutTextMeasurer,
} from './common/textmeasure.js';
export type { TextMeasurer, TextSize, TextVariantFlags } from './common/textmeasure.js';
export { GvcContext } from './gvc/context.js';
export type { BuiltinEngine, EngineName } from './gvc/context.js';

// Lower-level renderer-pipeline primitive: render a graph against a
// caller-built `GvcContext`. The root `render` name is taken by the new
// public `render(g, format, opts?)` (collision resolution below), so this
// is namespaced as `renderWithContext` to preserve the GvcContext workflow.
export { render as renderWithContext } from './gvc/device.js';

// Discoverable root re-exports of the api + render surfaces (ADR-2): root
// `@knowvah/dot-engine` exposes everything from `@knowvah/dot-engine/api` and
// `@knowvah/dot-engine/render` for one-import discoverability.
//
// Collision resolution: the root `render` is the new public
// `render(g, format, opts?)` from `./render`. The low-level
// `render(ctx, g, format)` is re-exported as `renderWithContext` (above)
// rather than `render`. See decisions.md ADR-5 and the decision journal.
export * from './api/index.js';
export * from './render/index.js';
