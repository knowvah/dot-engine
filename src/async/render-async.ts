// SPDX-License-Identifier: EPL-2.0

/**
 * Async render entry points (async-api ADR-1, 3, 4, 5, 7).
 *
 * Parse, collect the fonts and images the graph will request, await them,
 * then run the unchanged synchronous `layout → render → freeLayout` on a fresh
 * per-call context whose image hooks are sync closures over per-call Maps.
 *
 * @see src/render/public.ts:render
 * @see src/index.ts:renderSvg
 */

import type { Graph } from '../model/graph.js';
import { parse } from '../parser/index.js';
import { invalidArgType, rethrowAtBoundary } from '../errors.js';
import type { EngineName } from '../gvc/context.js';
import { createDefaultContext } from '../gvc/default-context.js';
import { render as deviceRender } from '../gvc/device.js';
import type { ImageSizer } from '../common/htmltable-types.js';
import type { ImageResolver } from '../gvc/image-resolver.js';
import type { OutputFormat, RenderOptions } from '../render/public.js';
import { collectResources } from './collect.js';
import { loadFonts } from './fonts.js';
import type { FontIssue, FontSetLike } from './fonts.js';

export type { FontIssue, FontSetLike } from './fonts.js';

/** Default font-load deadline in milliseconds (ADR-3). */
export const DEFAULT_FONT_TIMEOUT_MS = 3000;

/** Result of an async image-size lookup; `null` is a miss. */
export type AsyncImageSize = { w: number; h: number } | null;

/** Result of an async image-bytes lookup; `null` is a miss. */
export type AsyncImageBytes = { bytes: Uint8Array; mime?: string } | Uint8Array | null;

/** Options for {@link renderAsync}. */
export interface AsyncRenderOptions extends RenderOptions {
  /** Async HTML `<IMG>` dimension lookup; a throw/reject counts as a miss. */
  imageSizer?: (src: string) => Promise<AsyncImageSize>;
  /** Async image bytes lookup for `inlineImages`; a throw/reject counts as a miss. */
  imageResolver?: (src: string) => Promise<AsyncImageBytes>;
  /** Font-load deadline in ms, shared by all faces. Default 3000. */
  fontTimeoutMs?: number;
  /** FontFaceSet-like to load faces from. Default `document.fonts` when present. */
  fontSet?: FontSetLike;
}

/** Options for {@link renderSvgAsync}: {@link AsyncRenderOptions} minus `engine`. */
export type AsyncSvgOptions = Omit<AsyncRenderOptions, 'engine'>;

/** Resolved value of {@link renderAsync}. */
export interface AsyncRenderResult {
  output: string;
  fontIssues: FontIssue[];
}

/** Resolved value of {@link renderSvgAsync}. */
export interface AsyncSvgResult {
  svg: string;
  fontIssues: FontIssue[];
}

/** Reject a bad `g` / `format` / `opts` before any work starts (mirrors `render`). */
function checkRenderArgs(g: unknown, format: unknown, opts: unknown): void {
  if (typeof g !== 'object' || g === null) throw invalidArgType('g', 'object', g);
  if (typeof format !== 'string') throw invalidArgType('format', 'string', format);
  if (opts !== undefined && (typeof opts !== 'object' || opts === null)) {
    throw invalidArgType('opts', 'object or undefined', opts);
  }
}

/**
 * `document.fonts` in a page, else `self.fonts` (WorkerGlobalScope.fonts) in a
 * Worker; undefined in Node. @see plans/async-api/DESIGN.md D5
 */
function defaultFontSet(): FontSetLike | undefined {
  const doc: unknown = Reflect.get(globalThis, 'document');
  const owner: unknown = typeof doc === 'object' && doc !== null ? doc : globalThis;
  const fonts: unknown = Reflect.get(owner as object, 'fonts');
  if (typeof fonts !== 'object' || fonts === null) return undefined;
  return fonts as FontSetLike; // structural: FontFaceSet.load
}

/** Call `hook` once per distinct src; a throw or reject is a `null` miss. */
async function prefetch<T>(
  srcs: readonly string[],
  hook: ((src: string) => Promise<T | null>) | undefined,
): Promise<Map<string, T | null>> {
  const out = new Map<string, T | null>();
  if (hook === undefined) return out;
  await Promise.all(
    srcs.map(async (src) => {
      try {
        out.set(src, await hook(src));
      } catch {
        // ADR-5: a failing async hook is a miss, as in the sync hooks' null path.
        out.set(src, null);
      }
    }),
  );
  return out;
}

/** Everything awaited before layout starts. */
interface Prefetched {
  fontIssues: FontIssue[];
  sizes: Map<string, AsyncImageSize>;
  bytes: Map<string, AsyncImageBytes>;
}

async function prefetchAll(g: Graph, opts: AsyncRenderOptions | undefined): Promise<Prefetched> {
  const res = collectResources(g, { inlineImages: opts?.inlineImages ?? false });
  const [fontIssues, sizes, bytes] = await Promise.all([
    loadFonts(
      opts?.fontSet ?? defaultFontSet(),
      res.fonts,
      opts?.fontTimeoutMs ?? DEFAULT_FONT_TIMEOUT_MS,
    ),
    prefetch(res.sizeSrcs, opts?.imageSizer),
    prefetch(res.bytesSrcs, opts?.imageResolver),
  ]);
  return { fontIssues, sizes, bytes };
}

/**
 * Render a (parsed or built) graph to the requested format after prefetching
 * web fonts and image data, so layout measures real faces and sizes.
 *
 * Every failure, including usage `TypeError`s, is a promise rejection with the
 * same classes and codes as {@link render}. Font problems never reject; they
 * are returned in `fontIssues` (and `console.warn`ed).
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
 * @param opts   - engine, `inlineImages`, async image hooks and font options
 * @returns the rendered string and any font issues
 * @throws TypeError `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` (as rejection)
 * @throws RenderError, InternalError (as rejection), as {@link render}
 */
export async function renderAsync(
  g: Graph,
  format: OutputFormat,
  opts?: AsyncRenderOptions,
): Promise<AsyncRenderResult> {
  checkRenderArgs(g, format, opts);
  const engine: EngineName = opts?.engine ?? 'dot';
  try {
    const { fontIssues, sizes, bytes } = await prefetchAll(g, opts);
    // Created after fonts settle so the measurer sees the loaded faces.
    const ctx = createDefaultContext();
    if (opts?.imageSizer !== undefined) {
      const sizer: ImageSizer = (src) => sizes.get(src) ?? null;
      ctx.imageSizer = sizer;
    }
    if (opts?.imageResolver !== undefined) {
      const resolver: ImageResolver = (src) => bytes.get(src) ?? null;
      ctx.imageResolver = resolver;
    }
    ctx.layout(g, engine);
    const output = deviceRender(ctx, g, format, opts?.inlineImages ?? false);
    ctx.freeLayout(g, engine);
    return { output, fontIssues };
  } catch (err: unknown) {
    return rethrowAtBoundary(err);
  }
}

/**
 * Async counterpart of `renderSvg`: parse DOT, prefetch fonts/images, render.
 *
 * @remarks
 * Security: same untrusted-input caveat as `renderSvg` and {@link renderAsync}
 * — the returned `svg` is attacker-controlled markup for untrusted `dotSource`;
 * apply a CSP or sanitize before embedding. See the README "Security" section.
 *
 * @param dotSource - DOT-language graph source
 * @param engine    - layout engine name
 * @param opts      - `inlineImages`, async image hooks and font options
 * @returns the SVG string and any font issues
 * @throws TypeError `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` (as rejection)
 * @throws ParseError, RenderError, InternalError (as rejection), as `renderSvg`
 */
export async function renderSvgAsync(
  dotSource: string,
  engine: EngineName,
  opts?: AsyncSvgOptions,
): Promise<AsyncSvgResult> {
  if (typeof dotSource !== 'string') throw invalidArgType('dotSource', 'string', dotSource);
  if (typeof engine !== 'string') throw invalidArgType('engine', 'string', engine);
  let g: Graph;
  try {
    g = parse(dotSource);
  } catch (err: unknown) {
    return rethrowAtBoundary(err);
  }
  const { output, fontIssues } = await renderAsync(g, 'svg', { ...opts, engine });
  return { svg: output, fontIssues };
}
