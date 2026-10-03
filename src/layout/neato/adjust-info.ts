// SPDX-License-Identifier: EPL-2.0

/**
 * The Info_t machinery of neatogen's adjust.c shared by the Voronoi and
 * oscale (`AM_SCALE`, "old scaling") adjusters: per-node polygons and site
 * coordinates, the clipping bounding box, site sorting, coincident-node
 * separation, the exact overlap count, and `sAdjust`. Voronoi-only functions
 * (`vAdjust`, `newPos`, `addCorners`, `increaseBoundBox`, `nextOne`) are not
 * ported.
 *
 * C keeps `nodeInfo`, `nsites`, `pxmin..pymax`, `xmin..deltax` as file
 * statics and `state_t` for the rest; here they are one `InfoState` created
 * per call (`newInfoState`). Units are inches, as in C. `Verbose` stderr
 * output ("overlap [i] : n", "Number of iterations") is not reproduced: the
 * port has no verbosity switch. `qsort` is unstable in C; `Array.sort` is
 * stable, which only changes the order among sites with identical
 * coordinates (all of which `rmEquality` treats as one group).
 *
 * @see lib/neatogen/adjust.c
 */

import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import type { Point } from '../../model/geom.js';
import { aggetGraph } from '../fdp/fdp-model.js';
import { makeAddPoly, makePoly, polyOverlap } from './poly.js';
import type { Poly } from './poly.js';
import { sepFactor } from './sep-factor.js';

/** Default `voro_margin`. @see lib/neatogen/adjust.c:chkBoundBox */
const DEFAULT_VORO_MARGIN = 0.05;
/** Growth per oscale iteration. @see lib/neatogen/adjust.c:incr */
const INCR = 0.05;
/** @see lib/common/geom.h:POINTS_PER_INCH */
const POINTS_PER_INCH = 72;

/** @see lib/neatogen/site.h:Site */
export interface Site {
  coord: Point;
  sitenbr: number;
}

/** @see lib/neatogen/info.h:Info_t (Voronoi `verts` fields omitted) */
export interface InfoT {
  site: Site;
  overlaps: boolean;
  poly: Poly;
  node: Node;
}

/**
 * `state_t` plus the adjust.c file statics (`nodeInfo`, `nsites`, `pxmin`…,
 * `xmin`…). `nsites` is `nodeInfo.length`.
 * @see lib/neatogen/adjust.c:state_t
 */
export interface InfoState {
  nodeInfo: InfoT[];
  sites: Site[];
  nw: Point;
  ne: Point;
  sw: Point;
  se: Point;
  pxmin: number;
  pxmax: number;
  pymin: number;
  pymax: number;
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  deltax: number;
}

/** Fresh, empty state (`state_t st = {0}` and zeroed statics). */
export function newInfoState(): InfoState {
  return {
    nodeInfo: [], sites: [],
    nw: { x: 0, y: 0 }, ne: { x: 0, y: 0 }, sw: { x: 0, y: 0 }, se: { x: 0, y: 0 },
    pxmin: 0, pxmax: 0, pymin: 0, pymax: 0,
    xmin: 0, xmax: 0, ymin: 0, ymax: 0, deltax: 0,
  };
}

/** @see lib/neatogen/adjust.c:setBoundBox */
function setBoundBox(st: InfoState, ll: Point, ur: Point): void {
  st.pxmin = ll.x;
  st.pxmax = ur.x;
  st.pymin = ll.y;
  st.pymax = ur.y;
  st.nw = { x: st.pxmin, y: st.pymax };
  st.sw = { x: st.pxmin, y: st.pymin };
  st.ne = { x: st.pxmax, y: st.pymax };
  st.se = { x: st.pxmax, y: st.pymin };
}

/** C `atof` on the leading numeric prefix (0 when there is none). */
function atof(s: string): number {
  const m = /^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(s);
  return m === null ? 0 : parseFloat(m[0]);
}

/**
 * Extremes of the polygons, then the bounding box as a `voro_margin`
 * (default 0.05) expansion of them. Requires at least one site.
 * @see lib/neatogen/adjust.c:chkBoundBox
 */
export function chkBoundBox(st: InfoState, graph: Graph): void {
  let xMin = Number.MAX_VALUE;
  let yMin = Number.MAX_VALUE;
  let xMax = -Number.MAX_VALUE;
  let yMax = -Number.MAX_VALUE;
  for (const ip of st.nodeInfo) {
    const pp = ip.poly;
    xMin = Math.min(xMin, pp.origin.x + ip.site.coord.x);
    yMin = Math.min(yMin, pp.origin.y + ip.site.coord.y);
    xMax = Math.max(xMax, pp.corner.x + ip.site.coord.x);
    yMax = Math.max(yMax, pp.corner.y + ip.site.coord.y);
  }
  const marg = aggetGraph(graph, 'voro_margin');
  const margin = marg !== undefined && marg !== '' ? atof(marg) : DEFAULT_VORO_MARGIN;
  const ydelta = margin * (yMax - yMin);
  const xdelta = margin * (xMax - xMin);
  setBoundBox(st, { x: xMin - xdelta, y: yMin - ydelta }, { x: xMax + xdelta, y: yMax + ydelta });
}

/**
 * Create the Info_t array for every node of `graph` (polygons per
 * `sepFactor`: additive margins use `makeAddPoly` in inches, scale margins
 * use `makePoly`). Returns false (C: 1, `nodeInfo` freed) when a polygon
 * cannot be made.
 * @see lib/neatogen/adjust.c:makeInfo
 */
export function makeInfo(st: InfoState, graph: Graph): boolean {
  const pmargin = { ...sepFactor(graph) };
  if (pmargin.doAdd) {
    pmargin.x /= POINTS_PER_INCH;
    pmargin.y /= POINTS_PER_INCH;
  }
  const polyf = pmargin.doAdd ? makeAddPoly : makePoly;
  const info: InfoT[] = [];
  for (const node of graph.nodes.values()) {
    const poly = polyf(node, pmargin.x, pmargin.y);
    if (poly === null) {
      st.nodeInfo = [];
      return false;
    }
    const pos = node.info.pos ?? [0, 0];
    info.push({
      site: { coord: { x: pos[0], y: pos[1] }, sitenbr: info.length },
      overlaps: false, poly, node,
    });
  }
  st.nodeInfo = info;
  return true;
}

/** Sort sites on y, then x. @see lib/neatogen/adjust.c:scomp */
function scomp(s1: Site, s2: Site): number {
  if (s1.coord.y < s2.coord.y) return -1;
  if (s1.coord.y > s2.coord.y) return 1;
  if (s1.coord.x < s2.coord.x) return -1;
  if (s1.coord.x > s2.coord.x) return 1;
  return 0;
}

/**
 * Fill the site array from `nodeInfo` and sort it with `scomp`.
 * @see lib/neatogen/adjust.c:sortSites
 */
export function sortSites(st: InfoState): void {
  st.sites = st.nodeInfo.map((ip) => ip.site);
  st.sites.sort(scomp);
}

/** @see lib/neatogen/adjust.c:geomUpdate */
export function geomUpdate(st: InfoState, doSort: boolean): void {
  if (doSort) sortSites(st);
  st.xmin = Number.MAX_VALUE;
  st.xmax = -Number.MAX_VALUE;
  for (const s of st.sites) {
    st.xmin = Math.min(st.xmin, s.coord.x);
    st.xmax = Math.max(st.xmax, s.coord.x);
  }
  st.ymin = st.sites[0]!.coord.y;
  st.ymax = st.sites[st.sites.length - 1]!.coord.y;
  st.deltax = st.xmax - st.xmin;
}

/** Whether sites `a` and `b` share both coordinates. */
function sameCoord(a: Site, b: Site): boolean {
  return a.coord.x === b.coord.x && a.coord.y === b.coord.y;
}

/** Spread a coincident run `[ip+1, kp)` evenly toward the site `kp` on its row. */
function spreadToRight(sites: Site[], ip: number, kp: number, cnt: number): void {
  const xdel = (sites[kp]!.coord.x - sites[ip]!.coord.x) / cnt;
  let i = 1;
  for (let jp = ip + 1; jp < kp; jp++) {
    sites[jp]!.coord.x += i * xdel;
    i++;
  }
}

/** Chain a coincident run `[ip+1, kp)` rightward by polygon widths. */
function chainByWidth(st: InfoState, ip: number, kp: number): void {
  let a = ip;
  for (let jp = ip + 1; jp < kp; a++, jp++) {
    let info = st.nodeInfo[st.sites[a]!.sitenbr]!;
    let xdel = info.poly.corner.x - info.poly.origin.x;
    info = st.nodeInfo[st.sites[jp]!.sitenbr]!;
    xdel += info.poly.corner.x - info.poly.origin.x;
    st.sites[jp]!.coord.x = st.sites[a]!.coord.x + xdel / 2;
  }
}

/**
 * Check for nodes with identical positions and tweak the positions.
 * @see lib/neatogen/adjust.c:rmEquality
 */
export function rmEquality(st: InfoState): void {
  sortSites(st);
  const sites = st.sites;
  const end = sites.length;
  let ip = 0;
  while (ip < end) {
    let jp = ip + 1;
    if (jp >= end || !sameCoord(sites[jp]!, sites[ip]!)) {
      ip = jp;
      continue;
    }
    /* Find first node kp with position different from ip */
    let cnt = 2;
    let kp = jp + 1;
    while (kp < end && sameCoord(sites[kp]!, sites[ip]!)) {
      cnt++;
      jp = kp;
      kp = jp + 1;
    }
    /* If next node exists and is on the same line */
    if (kp < end && sites[kp]!.coord.y === sites[ip]!.coord.y) {
      spreadToRight(sites, ip, kp, cnt);
    } else {
      chainByWidth(st, ip, kp);
    }
    ip = kp;
  }
}

/**
 * Count number of node-node overlaps at iteration `iter` (exact polygon
 * test), flagging the nodes involved.
 * @see lib/neatogen/adjust.c:countOverlap
 */
export function countOverlap(st: InfoState, _iter: number): number {
  const info = st.nodeInfo;
  let count = 0;
  for (const ip of info) ip.overlaps = false;
  for (let i = 0; i < info.length - 1; i++) {
    const ip = info[i]!;
    for (let j = i + 1; j < info.length; j++) {
      const jp = info[j]!;
      if (polyOverlap(ip.site.coord, ip.poly, jp.site.coord, jp.poly)) {
        count++;
        ip.overlaps = true;
        jp.overlaps = true;
      }
    }
  }
  return count;
}

/** @see lib/neatogen/adjust.c:rePos */
export function rePos(st: InfoState): void {
  const f = 1.0 + INCR;
  for (const ip of st.nodeInfo) {
    ip.site.coord.x *= f;
    ip.site.coord.y *= f;
  }
}

/**
 * Scale positions up by 5% until no polygons overlap. Returns 1 when
 * positions changed, 0 when there was nothing to do.
 * @see lib/neatogen/adjust.c:sAdjust
 */
export function sAdjust(st: InfoState): number {
  let iterCnt = 0;
  if (countOverlap(st, iterCnt) === 0) return 0;
  rmEquality(st);
  for (;;) {
    rePos(st);
    iterCnt++;
    if (countOverlap(st, iterCnt) === 0) break;
  }
  return 1;
}

/**
 * Enter new node positions into the graph.
 * @see lib/neatogen/adjust.c:updateGraph
 */
export function updateGraph(st: InfoState): void {
  for (const ip of st.nodeInfo) {
    ip.node.info.pos = [ip.site.coord.x, ip.site.coord.y];
  }
}

/**
 * Exact overlap count of the graph's nodes (`makeInfo` + `countOverlap(0)`);
 * 0 when `makeInfo` fails.
 * @see lib/neatogen/adjust.c:countOverlap
 */
export function countOverlapIn(g: Graph): number {
  const st = newInfoState();
  if (!makeInfo(st, g)) return 0;
  return countOverlap(st, 0);
}

/**
 * The AM_SCALE branch of `removeOverlapWith`: `makeInfo`, `chkBoundBox`,
 * `sAdjust`, and `updateGraph` when sAdjust moved nodes. Returns sAdjust's
 * result (0 when `makeInfo` fails). Requires at least one node.
 * @see lib/neatogen/adjust.c:removeOverlapWith
 */
export function sAdjustGraph(g: Graph): number {
  const st = newInfoState();
  if (!makeInfo(st, g)) return 0;
  chkBoundBox(st, g);
  const ret = sAdjust(st);
  if (ret !== 0) updateGraph(st);
  return ret;
}
