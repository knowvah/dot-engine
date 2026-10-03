// SPDX-License-Identifier: EPL-2.0

/**
 * `renderSvgInto` (async-api ADR-6): render DOT to SVG and insert it into a
 * DOM element, sanitizing by default. Insertion goes through
 * `DOMParser('image/svg+xml')` + `importNode` + `replaceChildren`; never
 * `innerHTML`. DOM-coupled by design (owner decision 4); browser-safe.
 *
 * @see src/async/render-async.ts:renderSvgAsync
 * @see src/async/sanitize.ts:scrubSvgDocument
 */

import { RenderError, invalidArgType, invalidArgValue, invalidState } from '../errors.js';
import type { EngineName } from '../gvc/context.js';
import { renderSvgAsync } from './render-async.js';
import type { AsyncSvgOptions } from './render-async.js';
import type { FontIssue } from './fonts.js';
import { scrubSvgDocument } from './sanitize.js';
import type { SvgParserLike } from './sanitize.js';

const SVG_MIME = 'image/svg+xml';
const PARSER_ERROR_NAME = 'parsererror';

/** Options for {@link renderSvgInto}. */
export interface RenderSvgIntoOptions extends AsyncSvgOptions {
  /** Custom sanitizer: receives the SVG string, returns the markup to insert. */
  sanitize?: (svg: string) => string;
  /** Insert the SVG as rendered, with no sanitizing at all. Default false. */
  trusted?: boolean;
  /** Document to look up `id` in and insert into. Default `globalThis.document`. */
  document?: Document;
  /** Parser override (test seam). Default: the document window's `DOMParser`. */
  domParser?: SvgParserLike;
}

/** Resolved value of {@link renderSvgInto}. */
export interface RenderSvgIntoResult {
  /** The inserted (imported) root `<svg>` element. */
  element: SVGSVGElement;
  fontIssues: FontIssue[];
}

function resolveDocument(opts: RenderSvgIntoOptions | undefined): Document {
  const doc: unknown = opts?.document ?? Reflect.get(globalThis, 'document');
  if (typeof doc !== 'object' || doc === null) {
    throw invalidState('renderSvgInto requires a document; pass opts.document or run in a browser');
  }
  return doc as Document; // structural: used only via getElementById/importNode
}

function resolveParser(doc: Document, opts: RenderSvgIntoOptions | undefined): SvgParserLike {
  if (opts?.domParser !== undefined) return opts.domParser;
  const view: unknown = doc.defaultView ?? globalThis;
  const ctor: unknown = typeof view === 'object' && view !== null ? Reflect.get(view, 'DOMParser') : undefined;
  if (typeof ctor !== 'function') {
    throw invalidState('renderSvgInto requires a DOMParser; pass opts.domParser');
  }
  return new (ctor as new () => SvgParserLike)(); // structural: DOMParser.parseFromString
}

function hasParserError(doc: Document): boolean {
  const root = doc.documentElement as Element | null;
  if (root === null || root.nodeName.toLowerCase() === PARSER_ERROR_NAME) return true;
  return root.getElementsByTagName(PARSER_ERROR_NAME).length > 0;
}

function parseSvg(parser: SvgParserLike, svg: string): Document {
  let doc: Document;
  try {
    doc = parser.parseFromString(svg, SVG_MIME);
  } catch (err: unknown) {
    throw new RenderError('renderSvgInto could not parse the rendered SVG', 'RENDER_ERROR', {
      cause: err,
    });
  }
  if (hasParserError(doc)) {
    throw new RenderError('renderSvgInto could not parse the rendered SVG', 'RENDER_ERROR');
  }
  return doc;
}

/**
 * Render `src` and replace the children of the element with id `id` by the
 * resulting `<svg>`.
 *
 * Order (ADR-6): `trusted === true` inserts as rendered; else `sanitize(svg)`
 * if given; else the built-in scrubber (`scrubSvgDocument`).
 *
 * @param id     - id of the target element in the document
 * @param src    - DOT source
 * @param engine - layout engine name
 * @param opts   - async render options plus `sanitize`, `trusted`, `document`
 * @returns the inserted `<svg>` element and any font issues
 * @throws TypeError `ERR_INVALID_ARG_TYPE` / `ERR_INVALID_ARG_VALUE` /
 *   `ERR_INVALID_STATE` (as rejection); RenderError if the SVG does not parse
 */
export async function renderSvgInto(
  id: string,
  src: string,
  engine: EngineName,
  opts?: RenderSvgIntoOptions,
): Promise<RenderSvgIntoResult> {
  if (typeof id !== 'string') throw invalidArgType('id', 'string', id);
  const doc = resolveDocument(opts);
  const target = doc.getElementById(id);
  if (target === null) throw invalidArgValue('id', id, ['the id of an element in the document']);
  const parser = resolveParser(doc, opts);
  const { svg, fontIssues } = await renderSvgAsync(src, engine, opts);
  const custom = opts?.trusted !== true ? opts?.sanitize : undefined;
  const parsed = parseSvg(parser, custom !== undefined ? custom(svg) : svg);
  if (opts?.trusted !== true && custom === undefined) scrubSvgDocument(parsed);
  const element = doc.importNode(parsed.documentElement, true) as unknown as SVGSVGElement;
  target.replaceChildren(element);
  return { element, fontIssues };
}
