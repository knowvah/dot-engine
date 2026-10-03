// SPDX-License-Identifier: EPL-2.0

/**
 * GVC context and plugin registry.
 *
 * Ports GVC_t / GVC_s (lib/gvc/gvcint.h) and the plugin capability
 * negotiation order from lib/gvc/gvplugin.c.  libltdl dynamic loading
 * is replaced by static registration (AD-2).
 *
 * renderToString is NOT on GvcContext — it lives in src/gvc/device.ts as
 * render(ctx, g, format) to avoid a circular import: device.ts imports
 * GvcContext, so GvcContext cannot import device.ts.
 *
 * @see lib/gvc/gvcint.h
 * @see lib/gvc/gvplugin.c:gvplugin_install
 * @see lib/gvc/gvcjob.h
 */

import type { Graph } from '../model/graph.js';
import type { Node } from '../model/node.js';
import type { Edge } from '../model/edge.js';
import type { Point, Box } from '../model/geom.js';
import type { TextSpan } from '../common/emit-types.js';
import type { TextMeasurer } from '../common/textmeasure.js';
import type { DebugOptions } from '../debug.js';
import type { RenderJob } from './job.js';  // scaffold in T25; full class in T26
import { RenderError, invalidArgType, invalidArgValue } from '../errors.js';

// ---------------------------------------------------------------------------
// Enums — match C definitions in lib/gvc/gvcjob.h exactly
// ---------------------------------------------------------------------------

/** @see lib/gvc/gvcjob.h:label_type */
export const enum LabelType { Plain = 0, Html = 1 }

/** @see lib/gvc/gvcjob.h:pen_type */
export const enum PenType { None = 0, Dashed = 1, Dotted = 2, Solid = 3 }

/** @see lib/gvc/gvcjob.h:fill_type */
export const enum FillType { None = 0, Solid = 1, Linear = 2, Radial = 3 }

// ---------------------------------------------------------------------------
// RendererPlugin interface
// ---------------------------------------------------------------------------

/**
 * Fused equivalent of gvplugin_installed_t + gvrender_engine_s vtable.
 *
 * AD-2 collapses the two-step install/load into one self-contained object.
 * Plugins are registered with GvcContext.register() and selected by
 * bestRenderer() using the capability negotiation order from gvplugin_install.
 *
 * @see lib/gvc/gvcext.h:gvrender_engine_s
 * @see lib/gvc/gvplugin.c:gvplugin_install
 */
export interface RendererPlugin {
  /** Format name, e.g. "svg", "dot:core". Type prefix (before `:`) is the sort key. */
  readonly type: string;
  /** Capability quality — higher wins when multiple plugins match the same format. */
  readonly quality: number;

  beginGraph(g: Graph, job: RenderJob): void;
  endGraph(g: Graph, job: RenderJob): void;
  /** Per-layer group (only called when numLayers > 1). @see svg_begin_layer */
  beginLayer?(name: string, job: RenderJob): void;
  endLayer?(job: RenderJob): void;
  /** Per-page content (graph group + background); split from beginGraph so it
   * can be re-emitted per layer. @see svg_begin_page */
  beginPage?(g: Graph, job: RenderJob): void;
  /** Page background polygon; split from beginPage so the page loop can wrap
   * it (and the graph label) in the graph anchor. @see emit_page */
  pageBackground?(g: Graph, job: RenderJob): void;
  endPage?(g: Graph, job: RenderJob): void;
  beginNode(n: Node, job: RenderJob): void;
  endNode(n: Node, job: RenderJob): void;
  beginEdge(e: Edge, job: RenderJob): void;
  endEdge(e: Edge, job: RenderJob): void;
  textspan(pos: Point, span: TextSpan, job: RenderJob): void;
  ellipse(center: Point, rx: number, ry: number, filled: boolean, job: RenderJob): void;
  polygon(pts: Point[], filled: boolean, job: RenderJob): void;
  bezier(pts: Point[], filled: boolean, job: RenderJob): void;
  polyline(pts: Point[], job: RenderJob): void;
  /** Edge-label attachment line (decorate=true): default line style, pen =
   *  label fontcolor — NOT the edge's style. @see lib/common/emit.c:emit_attachment */
  attachmentPolyline?(pts: Point[], pencolor: string, job: RenderJob): void;
  comment?(text: string, job: RenderJob): void;
  beginAnchor?(href: string, tooltip: string, target: string, id: string, job: RenderJob): void;
  endAnchor?(job: RenderJob): void;
  /**
   * Set the pending hot-spot rectangle (graph-coordinate box) for the anchor
   * about to open, mirroring C's `emit_map_rect(job, b)` call inside
   * `initAnchor`. The map renderer records it as `obj.urlMapPts`; other
   * renderers no-op. @see lib/common/emit.c:640 emit_map_rect
   */
  emitMapRect?(box: Box, job: RenderJob): void;
  beginLabel?(type: LabelType, job: RenderJob): void;
  endLabel?(job: RenderJob): void;
  beginCluster?(sg: Graph, job: RenderJob): void;
  endCluster?(sg: Graph, job: RenderJob): void;
  /**
   * Draw a user image filling box b (graph coordinates, as C's
   * loadimage plugins receive it). Renderers without image support
   * omit this — C formats without a loadimage plugin skip the shape.
   * @see lib/gvc/gvrender.c:gvrender_usershape
   * @see plugin/core/gvloadimage_core.c:core_loadimage_svg
   */
  usershape?(src: string, b: Box, job: RenderJob): void;
}

// ---------------------------------------------------------------------------
// Engine names
// ---------------------------------------------------------------------------

/**
 * The layout engines bundled by the default context (see makeContext in
 * src/index.ts — the source of truth for what `renderSvg` registers).
 * Mirrors the `const char *engine` plugin keys of C's gvLayout.
 * @see lib/gvc/gvc.h:gvLayout
 */
export type BuiltinEngine =
  | 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

/**
 * A layout-engine name. The registry is open — callers may `register` custom
 * engines — so any string is accepted; `(string & {})` keeps editor
 * autocomplete for the built-ins without closing the set. Unknown names throw
 * at `layout`/`freeLayout` time, mirroring C's gvLayout error on a missing
 * plugin.
 */
export type EngineName = BuiltinEngine | (string & {});

// ---------------------------------------------------------------------------
// LayoutEngine interface
// ---------------------------------------------------------------------------

/**
 * TypeScript equivalent of the layout-engine plugin vtable.
 *
 * @see lib/gvc/gvplugin.h:gvlayout_engine_s
 */
export interface LayoutEngine {
  /** Engine name, e.g. "dot", "neato". */
  readonly type: EngineName;
  layout(g: Graph): void;
  cleanup(g: Graph): void;
}

// ---------------------------------------------------------------------------
// GvcContext
// ---------------------------------------------------------------------------

/** Find the insertion index for plugin in sorted renderers array. */
class PluginRegistry {
  /** @see lib/gvc/gvplugin.c:gvplugin_install — ordering rules */
  static insertionIdx(renderers: RendererPlugin[], plugin: RendererPlugin): number {
    const pPfx = plugin.type.split(':')[0];
    for (let i = 0; i < renderers.length; i++) {
      const e = renderers[i]!;
      const ePfx = e.type.split(':')[0];
      if (ePfx < pPfx) continue;
      if (ePfx > pPfx) return i;
      if (e.quality > plugin.quality) continue;
      return i;
    }
    return renderers.length;
  }
}

/** Argument check for a TextMeasurer parameter (ADR-3). */
function checkMeasurer(m: unknown): void {
  if (typeof m !== 'object' || m === null
      || typeof (m as { measure?: unknown }).measure !== 'function') {
    throw invalidArgType('measurer', 'TextMeasurer', m);
  }
}

/** Argument check for `register` (ADR-3): shape of a plugin, not its behaviour. */
function checkPlugin(p: unknown): void {
  const o = p as { type?: unknown; quality?: unknown; layout?: unknown; cleanup?: unknown };
  const ok = typeof p === 'object' && p !== null && typeof o.type === 'string'
    && ('quality' in o
      ? typeof o.quality === 'number'
      : typeof o.layout === 'function' && typeof o.cleanup === 'function');
  if (!ok) throw invalidArgType('p', 'RendererPlugin or LayoutEngine', p);
}

/**
 * Root Graphviz context.  Owns the plugin registry, text measurer, and
 * the layout-engine dispatch.
 *
 * Counterpart of GVC_t in lib/gvc/gvcint.h.
 *
 * @see lib/gvc/gvc.h:gvContext
 */
export class GvcContext {
  private readonly renderers: RendererPlugin[] = [];
  private readonly layouts: Map<string, LayoutEngine> = new Map();

  textMeasurer: TextMeasurer;
  readonly debug: DebugOptions | undefined;

  /**
   * @throws TypeError `ERR_INVALID_ARG_TYPE` if `measurer` has no `measure`
   *   function or `options` is neither undefined nor an object
   */
  constructor(measurer: TextMeasurer, options?: { debug?: DebugOptions }) {
    checkMeasurer(measurer);
    if (options !== undefined && (typeof options !== 'object' || options === null)) {
      throw invalidArgType('options', 'object or undefined', options);
    }
    this.textMeasurer = measurer;
    this.debug = options?.debug;
  }

  /**
   * Register a renderer or layout engine; overload discriminated by `quality`.
   * @throws TypeError `ERR_INVALID_ARG_TYPE` if `p` is not a renderer plugin
   *   (string `type`, numeric `quality`) or a layout engine (string `type`,
   *   `layout` and `cleanup` functions)
   */
  register(p: RendererPlugin): void;
  register(p: LayoutEngine): void;
  register(p: RendererPlugin | LayoutEngine): void {
    checkPlugin(p);
    if ('quality' in p) {
      const idx = PluginRegistry.insertionIdx(this.renderers, p);
      this.renderers.splice(idx, 0, p);
    } else {
      this.layouts.set(p.type, p);
    }
  }

  /**
   * Return the first registered renderer whose type prefix matches format.
   * Because renderers are sorted quality-descending within a prefix, the first
   * match is always the highest-quality one (last-registered wins on tie).
   *
   * @throws TypeError (ERR_INVALID_ARG_TYPE) if format is not a string
   * @throws TypeError (ERR_INVALID_ARG_VALUE) if no renderer is registered
   *   for format
   * @see lib/gvc/gvplugin.c:gvplugin_find
   */
  bestRenderer(format: string): RendererPlugin {
    if (typeof format !== 'string') {
      throw invalidArgType('format', 'string', format);
    }
    for (const r of this.renderers) {
      if (r.type.split(':')[0] === format) return r;
    }
    const prefixes = new Set(this.renderers.map((r) => r.type.split(':')[0]!));
    throw invalidArgValue('format', format, [...prefixes]);
  }

  /** Validate the `(g, engineName)` arguments shared by layout/freeLayout. */
  private checkLayoutArgs(g: Graph, engineName: EngineName): LayoutEngine {
    if (typeof g !== 'object' || g === null) {
      throw invalidArgType('g', 'object', g);
    }
    if (typeof engineName !== 'string') {
      throw invalidArgType('engine', 'string', engineName);
    }
    const engine = this.layouts.get(engineName);
    if (engine === undefined) {
      throw invalidArgValue('engine', engineName, [...this.layouts.keys()]);
    }
    return engine;
  }

  /**
   * Run layout on g using engineName. Engine cleanup is deferred to
   * freeLayout, matching C's gvLayoutJobs / gvFreeLayout split —
   * rendering happens in between and must see the layout state
   * (e.g. cluster arrays).
   *
   * @throws TypeError (ERR_INVALID_ARG_TYPE / ERR_INVALID_ARG_VALUE) for a
   *   bad `g`, or an engine argument that is not registered
   * @throws RenderError (UNKNOWN_LAYOUT) if the `layout` attribute names no
   *   registered engine
   * @throws RenderError (RENDER_ERROR / UNSUPPORTED_FEATURE) or InternalError
   *   from the engine itself, unwrapped; a foreign throw from an engine bug
   *   also propagates unwrapped (only the public render functions wrap it)
   * @see lib/gvc/gvlayout.c:gvLayoutJobs
   */
  layout(g: Graph, engineName: EngineName): void {
    const selected = this.checkLayoutArgs(g, engineName);
    // C gvLayoutJobs: the graph's `layout` ATTRIBUTE unconditionally
    // overrides the selected engine (-K / API choice); an unrecognized
    // value is an error, not a fallback. @see lib/gvc/gvlayout.c:66-73
    const attr = g.attrs?.get('layout'); // test doubles may lack attrs
    let engine = selected;
    if (attr !== undefined && attr !== '') {
      const override = this.layouts.get(attr);
      if (override === undefined) {
        throw new RenderError(
          `Layout type: "${attr}" not recognized`,
          'UNKNOWN_LAYOUT',
        );
      }
      engine = override;
    }
    if (g.info) g.info.gvc = this;
    engine.layout(g);
    // C: GD_cleanup(g) = gvle->cleanup — freeLayout must use the engine that
    // actually ran, not its argument. @see lib/gvc/gvlayout.c:88
    if (g.info) g.info.cleanup = (x: Graph): void => engine.cleanup(x);
    // Mark the graph laid-out so the public getLayout can reject a graph that
    // still carries calloc-zero geometry defaults.
    if (g.info) g.info.laidOut = true;
  }

  /**
   * Release engine layout state after rendering.
   *
   * @throws TypeError (ERR_INVALID_ARG_TYPE / ERR_INVALID_ARG_VALUE) for a
   *   bad `g`, or an engine argument that is not registered
   * @see lib/gvc/gvlayout.c:gvFreeLayout
   */
  freeLayout(g: Graph, engineName: EngineName): void {
    this.checkLayoutArgs(g, engineName); // argument validation only
    const cleanup = g.info?.cleanup;
    if (cleanup) {
      cleanup(g);
      g.info.cleanup = undefined;
    }
  }
}
