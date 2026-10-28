// SPDX-License-Identifier: EPL-2.0
//
// Cluster fill/pen state helpers, split from device.ts (file-size cap).
// These are leaf helpers with no dependency on the device render loop;
// renderOneCluster (in device.ts) drives them.

import type { Graph } from '../model/graph.js';
import type { ObjState } from './job.js';
import type { RendererPlugin } from './context.js';
import { transformPoint } from './device-transform.js';
import { stripedBox } from '../render/svg-multicolor.js';
import { RenderJob } from './job.js';
import { FillType } from './context.js';
import type { ResolvedFill, ClusterAttrs } from '../common/style-resolve.js';
import {
  parseStyleFlags, resolvePenColor, resolvePenType, resolvePenWidth,
  resolveClusterFillEx, styleTokens,
} from '../common/style-resolve.js';
import { gvrenderSetStyle, checkClusterStyleTokens } from './gvrender-set-style.js';
import { resolveRenderColor, reportColorNames } from '../render/color-resolve.js';
import { parseSegs } from '../common/multicolor.js';
import { graphAttrInherited } from '../common/attr-get.js';

/**
 * Copy gradient fields from a linear/radial ResolvedFill onto obj.
 * @see lib/common/emit.c:emit_clusters:3857-3869 GRADIENT/RGRADIENT block
 */
function applyClusterGradient(
  obj: ObjState,
  fill: Extract<ResolvedFill, { kind: 'linear' | 'radial' }>,
): void {
  obj.fill = fill.kind === 'radial' ? FillType.Radial : FillType.Linear;
  obj.fillColor = resolveRenderColor(fill.fillColor);
  obj.stopColor = resolveRenderColor(fill.stopColor);
  obj.gradientFrac = fill.frac;
  obj.gradientAngle = fill.angle;
}

/**
 * Read a cluster graph-attribute as C's `agget(sg, key)` does: the cluster's
 * own value, else the ancestor defaults snapshotted when `agsubg` opened it.
 * A root `graph[key=...]` declared after the cluster is NOT seen (item 89).
 * @see lib/cgraph/graph.c:agsubg
 * @see lib/common/emit.c:emit_clusters (cluster attrs via agget/agxget)
 */
export function clusterAttr(sg: Graph, key: string): string | undefined {
  return graphAttrInherited(sg, key);
}

/** Cluster `style` with ancestor inheritance. @see clusterAttr */
export function clusterStyle(sg: Graph): string | undefined {
  return clusterAttr(sg, 'style');
}

/**
 * Cluster `peripheries`, mirroring `late_int(sg, G_peripheries, 1, 0)`:
 * default 1, non-numeric → default, clamped to a minimum of 0.
 * @see lib/common/emit.c:3878
 */
export function clusterPeripheries(sg: Graph): number {
  const raw = clusterAttr(sg, 'peripheries');
  if (raw === undefined || raw.length === 0) return 1;
  const v = parseInt(raw, 10);
  if (Number.isNaN(v)) return 1;
  return v < 0 ? 0 : v;
}

/** Apply pen state (color, width, type) to a cluster obj from attrs.
 * `peripheries=0` suppresses the boundary stroke: C sets pencolor
 * "transparent" (the box is still drawn for fill).
 * @see lib/common/emit.c:emit_clusters:3835-3840, 3907-3917 */
function applyClusterPenState(obj: ObjState, sg: Graph): void {
  const flags = parseStyleFlags(clusterStyle(sg));
  const pen = clusterAttr(sg, 'pencolor') ?? clusterAttr(sg, 'color');
  obj.penColor = clusterPeripheries(sg) === 0
    ? resolveRenderColor('transparent')
    : resolveRenderColor(resolvePenColor(pen));
  obj.penWidth = resolvePenWidth(flags, clusterAttr(sg, 'penwidth'));
  obj.pen = resolvePenType(flags);
}

/** Build the ClusterAttrs bag from a subgraph's attrs, with inheritance. */
function clusterAttrsOf(sg: Graph): ClusterAttrs {
  return {
    style: clusterStyle(sg),
    color: clusterAttr(sg, 'color'),
    pencolor: clusterAttr(sg, 'pencolor'),
    fillcolor: clusterAttr(sg, 'fillcolor'),
    bgcolor: clusterAttr(sg, 'bgcolor'),
    penwidth: clusterAttr(sg, 'penwidth'),
    gradientangle: clusterAttr(sg, 'gradientangle'),
  };
}

/**
 * Apply cluster fill/pen state to job.obj from resolved cluster attrs.
 * @see lib/common/emit.c:emit_clusters:3805-3874
 */
export function applyClusterObjState(sg: Graph, job: RenderJob): boolean {
  const fillRes = resolveClusterFillEx(clusterAttrsOf(sg));
  if (job.obj === null) return false;
  const obj = job.obj;
  // emit_clusters: gvrender_set_style(job, checkClusterStyle list) precedes the
  // colour resolution. @see lib/common/emit.c:3808
  gvrenderSetStyle(checkClusterStyleTokens(styleTokens(clusterStyle(sg))));
  // Runs inside renderCluster's setColorScheme window. @see emit.c:3800/3943
  // C resolves the fill (set_fillcolor / gradient vals) before the pen,
  // which is set just before gvrender_box. @see emit.c:3846-3868 vs 3907-3913
  const filled = applyClusterFill(obj, fillRes);
  applyClusterPenState(obj, sg);
  reportColorNames(stripedClusterColors(sg));
  return filled;
}

/**
 * True when emit_clusters takes the striped branch: `style=striped` and not
 * `rounded` (the rounded branch is tested first).
 * @see lib/common/emit.c:3877-3892 emit_clusters (rounded / striped / plain)
 */
export function isStripedCluster(sg: Graph): boolean {
  const flags = parseStyleFlags(clusterStyle(sg));
  return flags.striped && !flags.rounded;
}

/**
 * The fillcolor string emit_clusters hands to stripedBox.
 * @see lib/common/emit.c:3820-3850 emit_clusters (fillcolor selection)
 */
function stripedFillSpec(sg: Graph): string {
  const flags = parseStyleFlags(clusterStyle(sg));
  const color = clusterAttr(sg, 'color') ?? '';
  let fill = clusterAttr(sg, 'fillcolor') || color;
  const bg = clusterAttr(sg, 'bgcolor') ?? '';
  if ((!flags.filled || fill === '') && bg !== '') fill = bg;
  return fill === '' ? 'lightgrey' : fill;
}

/**
 * The colours stripedBox sets for a `style=striped` cluster (not rounded): each
 * segment of the fill spec with a positive width, after the pen.
 * @see lib/common/emit.c:3896-3906 emit_clusters (striped branch)
 * @see lib/common/emit.c:595 stripedBox
 */
function stripedClusterColors(sg: Graph): string[] {
  if (!isStripedCluster(sg)) return [];
  const { segs, error } = parseSegs(stripedFillSpec(sg), () => `in cluster ${sg.name}`);
  if (error === 1 || error === 2) return [];
  return segs.flatMap((seg) => (seg.color !== null && seg.t > 0 ? [seg.color] : []));
}

/**
 * Draw a `style=striped` cluster box: stripedBox over the bb corners, then the
 * unfilled bb outline (pen already "transparent" for `peripheries=0`). The
 * once-per-render Total-size warning is claimed by stripedClusterColors when
 * the pen state is applied, so the parse here does not print twice.
 * @see lib/common/emit.c:3892-3906 emit_clusters (striped branch)
 */
export function renderStripedClusterBox(
  sg: Graph, renderer: RendererPlugin, job: RenderJob,
): void {
  // stripedBox runs inside renderCluster's setColorScheme window (3800/3943).
  const { ll, ur } = sg.info.bb!;
  const af = [
    { x: ll.x, y: ll.y }, { x: ur.x, y: ll.y }, { x: ur.x, y: ur.y }, { x: ll.x, y: ur.y },
  ].map((p) => transformPoint(p, job));
  // stripedBox passes filled=1 (never GRADIENT) to gvrender_polygon; the port's
  // renderers read the gradient from obj.fill, so show them a solid fill.
  const obj = job.obj;
  const savedFill = obj?.fill;
  if (obj !== null && savedFill !== undefined) obj.fill = FillType.Solid;
  stripedBox(job, af, stripedFillSpec(sg), false, renderer, () => `in cluster ${sg.name}`);
  if (obj !== null && savedFill !== undefined) obj.fill = savedFill;
  const rawPts = [
    { x: ll.x, y: ll.y }, { x: ll.x, y: ur.y }, { x: ur.x, y: ur.y }, { x: ur.x, y: ll.y },
  ];
  renderer.polygon(rawPts.map((p) => transformPoint(p, job)), false, job);
}

/** The fill half of {@link applyClusterObjState}; true when the box is filled. */
function applyClusterFill(obj: ObjState, fillRes: ResolvedFill): boolean {
  if (fillRes.kind === 'none') { obj.fill = FillType.None; return false; }
  if (fillRes.kind === 'solid') {
    obj.fill = FillType.Solid;
    obj.fillColor = resolveRenderColor(fillRes.color);
    return true;
  }
  applyClusterGradient(obj, fillRes);
  return true;
}
