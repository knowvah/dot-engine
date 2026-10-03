// SPDX-License-Identifier: EPL-2.0

/**
 * Orthogonal-ordering overlap removal — cAdjust (overlap=ortho*, portho*).
 *
 * Builds horizontal/vertical constraint graphs over the node boxes and solves
 * them with network simplex (a linear objective, so `rank` is reused). Based
 * on Marriott, Stuckey, Tam and He, "Removing Node Overlapping in Graph Layout
 * Using Constrained Optimization", Constraints 8(2):143-172, 2003 (per the C
 * source comment). All geometry is integer points scaled by SCALE (10).
 *
 * Deviations from C, all structural (results identical):
 *  - the visibility graph `vg` of mkConstraintG is a per-item adjacency array
 *    (C builds a strict cgraph whose out-edge order — by head sequence — equals
 *    the ascending list order used here);
 *  - cAdjust's `switch` is a mode -> plan table (same eight cases plus the
 *    PORTHO default);
 *  - constrainX/constrainY share `buildConstraintGraph` for the ortho choice.
 *
 * @see lib/neatogen/constraint.c:cAdjust
 */

import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import type { EdgeList } from '../../model/nodeInfo.js';
import { DtBag } from '../../cdt/index.js';
import { cround } from '../../common/arith.js';
import { rank } from '../dot/ns.js';
import { elistAppend } from '../dot/fastgr.js';
import { nodesInSeq } from '../dot/decomp.js';
import { sepFactor } from './sep-factor.js';
import type { ExpandT } from './sep-factor.js';

/** @see lib/neatogen/adjust.h:adjust_mode */
export const AM_ORTHO = 5;
export const AM_ORTHO_YX = 6;
export const AM_ORTHOXY = 7;
export const AM_ORTHOYX = 8;
export const AM_PORTHO = 9;
export const AM_PORTHO_YX = 10;
export const AM_PORTHOXY = 11;
export const AM_PORTHOYX = 12;

/** For precision, scale up before the algorithms, then scale down. */
const SCALE = 10;
const SCALE2 = SCALE / 2;
/** C `INT_MAX` (rank's maxiter) and `-INT_MAX` (mkConstraintG's sentinel). */
const INT_MAX = 2147483647;
/** @see lib/common/geom.h:POINTS_PER_INCH */
const POINTS_PER_INCH = 72;

interface Pt { x: number; y: number }
interface Box { llx: number; lly: number; urx: number; ury: number }

/** @see lib/neatogen/constraint.c:nitem */
interface Nitem {
  /** Sort key (the dtdisc key, `offsetof(nitem, val)`). */
  val: number;
  /** Position for sorting (integer scaled points). */
  pos: Pt;
  /** Base node. */
  np: Node;
  /** Corresponding node in the constraint graph. */
  cnode: Node | undefined;
  bb: Box;
}

type DistFn = (b1: Box, b2: Box) => number;
type IntersectFn = (p: Nitem, q: Nitem) => boolean;
type Items = DtBag<Nitem, number>;

/** Constraint graph plus the strict-graph edge index (agedge find/create). */
interface ConstraintGraph {
  g: Graph;
  edges: Map<Node, Map<Node, Edge>>;
}

/** @see lib/neatogen/constraint.c:cmpitem */
function cmpitem(a: number, b: number): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** C int division truncates toward zero. */
function idiv2(v: number): number {
  return Math.trunc(v / 2);
}

/** @see lib/neatogen/constraint.c:distY */
function distY(b1: Box, b2: Box): number {
  return idiv2(b1.ury - b1.lly + (b2.ury - b2.lly));
}

/** @see lib/neatogen/constraint.c:distX */
function distX(b1: Box, b2: Box): number {
  return idiv2(b1.urx - b1.llx + (b2.urx - b2.llx));
}

/**
 * True if boxes could overlap if shifted in y but don't, or if they overlap and
 * a y move is smallest. Assumes q pos above p pos.
 * @see lib/neatogen/constraint.c:intersectX0
 */
function intersectX0(p: Nitem, q: Nitem): boolean {
  if (!(p.bb.llx <= q.bb.urx && q.bb.llx <= p.bb.urx)) return false;
  if (p.bb.ury < q.bb.lly) return true;
  const ydelta = distY(p.bb, q.bb) - (q.pos.y - p.pos.y);
  const dx = q.pos.x >= p.pos.x ? q.pos.x - p.pos.x : p.pos.x - q.pos.x;
  const xdelta = distX(p.bb, q.bb) - dx;
  return ydelta <= xdelta;
}

/**
 * True if boxes could overlap if shifted in x but don't, or if they overlap and
 * an x move is smallest. Assumes q pos right of p pos.
 * @see lib/neatogen/constraint.c:intersectY0
 */
function intersectY0(p: Nitem, q: Nitem): boolean {
  if (!(p.bb.lly <= q.bb.ury && q.bb.lly <= p.bb.ury)) return false;
  if (p.bb.urx < q.bb.llx) return true;
  const xdelta = distX(p.bb, q.bb) - (q.pos.x - p.pos.x);
  const dy = q.pos.y >= p.pos.y ? q.pos.y - p.pos.y : p.pos.y - q.pos.y;
  const ydelta = distY(p.bb, q.bb) - dy;
  return xdelta <= ydelta;
}

/** @see lib/neatogen/constraint.c:intersectY */
function intersectY(p: Nitem, q: Nitem): boolean {
  return p.bb.lly <= q.bb.ury && q.bb.lly <= p.bb.ury;
}

/** @see lib/neatogen/constraint.c:intersectX */
function intersectX(p: Nitem, q: Nitem): boolean {
  return p.bb.llx <= q.bb.urx && q.bb.llx <= p.bb.urx;
}

/** dtflatten order: ascending key, bag-internal order among equal keys. */
function flatten(list: Items): Nitem[] {
  const out: Nitem[] = [];
  for (let p = list.first(); p !== undefined; p = list.next(p)) out.push(p);
  return out;
}

function newCg(): ConstraintGraph {
  return { g: new Graph('cg', 'strict-directed'), edges: new Map() };
}

/** agnode + agbindrec + alloc_elist for a constraint-graph node. */
function newCgNode(cg: ConstraintGraph, name: string): Node {
  const n = new Node(cg.g.nodes.size, name, cg.g);
  cg.g.nodes.set(name, n);
  n.info.in = { list: [], size: 0 };
  n.info.out = { list: [], size: 0 };
  return n;
}

/** Append n to GD_nlist(cg). */
function linkNode(cg: ConstraintGraph, last: Node | undefined, n: Node): Node {
  if (last === undefined) cg.g.info.nlist = n;
  else last.info.next = n;
  return n;
}

/** agedge(cg, t, h, NULL, 1): strict, returns the existing edge if any. */
function cgEdge(cg: ConstraintGraph, t: Node, h: Node): Edge {
  let heads = cg.edges.get(t);
  if (heads === undefined) {
    heads = new Map();
    cg.edges.set(t, heads);
  }
  let e = heads.get(h);
  if (e === undefined) {
    e = new Edge(t, h, '');
    e.info.minlen = 0;
    heads.set(h, e);
  }
  return e;
}

function listOf(l: EdgeList | undefined): EdgeList {
  if (l === undefined) throw new Error('constraint graph node has no edge list');
  return l;
}

/** elist_append(e, ND_out(t)); elist_append(e, ND_in(h)). */
function linkEdge(e: Edge): void {
  elistAppend(listOf(e.tail.info.out), e);
  elistAppend(listOf(e.head.info.in), e);
}

function cnodeOf(p: Nitem): Node {
  if (p.cnode === undefined) throw new Error('nitem has no constraint node');
  return p.cnode;
}

/**
 * agfindedge(g, a, b): an a->b edge, or b->a when g is undirected.
 * @see lib/cgraph/edge.c:agedge
 */
function makeHasEdge(g: Graph): (a: Node, b: Node) => boolean {
  const undirected = g.root.kind === 'undirected' || g.root.kind === 'strict-undirected';
  const pairs = new Map<Node, Set<Node>>();
  for (const e of g.edges) {
    const s = pairs.get(e.tail) ?? new Set<Node>();
    s.add(e.head);
    pairs.set(e.tail, s);
  }
  return (a, b) => pairs.get(a)?.has(b) === true || (undirected && pairs.get(b)?.has(a) === true);
}

/**
 * For every item pair, add a constraint when `intersect` holds; no orthogonal
 * ordering is enforced. Edges that exist in `g` get weight 100.
 * @see lib/neatogen/constraint.c:mkNConstraintG
 */
function mkNConstraintG(g: Graph, list: Items, intersect: IntersectFn, dist: DistFn): ConstraintGraph {
  const cg = newCg();
  const flat = flatten(list);
  let lastn: Node | undefined;
  for (const p of flat) {
    const n = newCgNode(cg, p.np.name);
    p.cnode = n;
    lastn = linkNode(cg, lastn, n);
  }
  const hasEdge = makeHasEdge(g);
  const created: Edge[] = [];
  for (let i = 0; i < flat.length; i++) {
    const p = flat[i]!;
    for (let j = i + 1; j < flat.length; j++) {
      const nxp = flat[j]!;
      if (!intersect(p, nxp)) continue;
      const e = cgEdge(cg, cnodeOf(p), cnodeOf(nxp));
      e.info.minlen = dist(p.bb, nxp.bb);
      e.info.weight = hasEdge(p.np, nxp.np) ? 100 : 1;
      created.push(e);
    }
  }
  // C walks each node's cgraph out-edges (by head sequence); creation order
  // above is already tail-major and head-ascending, which is that order.
  for (const e of created) linkEdge(e);
  return cg;
}

/**
 * Chain one node per distinct val, in order, joined by SCALE-length edges.
 * @see lib/neatogen/constraint.c:mkConstraintG (basic chain)
 */
function buildChain(cg: ConstraintGraph, flat: Nitem[]): void {
  let oldval = -INT_MAX;
  let prev: Node | undefined;
  let n: Node | undefined;
  let lastn: Node | undefined;
  for (const p of flat) {
    if (oldval !== p.val) {
      oldval = p.val;
      n = newCgNode(cg, p.np.name);
      lastn = linkNode(cg, lastn, n);
      if (prev !== undefined) {
        const e = cgEdge(cg, prev, n);
        e.info.minlen = SCALE;
        e.info.weight = 1;
        linkEdge(e);
      }
      prev = n;
    }
    p.cnode = n;
  }
}

/**
 * Visibility graph as per-item adjacency (head indices ascending).
 * @see lib/neatogen/constraint.c:mkConstraintG (immediate right neighbours)
 */
function buildVisibility(flat: Nitem[], intersect: IntersectFn): number[][] {
  const vg: number[][] = flat.map(() => []);
  let oldval = -INT_MAX;
  let nxt = flat.length;
  for (let i = 0; i < flat.length; i++) {
    const p = flat[i]!;
    if (oldval !== p.val) {
      oldval = p.val;
      nxt = i + 1;
      while (nxt < flat.length && flat[nxt]!.val === oldval) nxt++;
      if (nxt >= flat.length) break;
    }
    for (let j = nxt; j < flat.length; j++) {
      if (intersect(p, flat[j]!)) vg[i]!.push(j);
    }
  }
  return vg;
}

/**
 * Add a constraint edge per visibility edge, with minlen = dist.
 * @see lib/neatogen/constraint.c:mapGraphs
 */
function mapGraphs(vg: number[][], flat: Nitem[], cg: ConstraintGraph, dist: DistFn): void {
  for (let i = 0; i < flat.length; i++) {
    const tp = flat[i]!;
    for (const j of vg[i]!) {
      const hp = flat[j]!;
      const delta = dist(tp.bb, hp.bb);
      const ce = cgEdge(cg, cnodeOf(tp), cnodeOf(hp));
      ce.info.weight = 1;
      if ((ce.info.minlen ?? 0) < delta) {
        if (ce.info.minlen === 0) linkEdge(ce);
        ce.info.minlen = delta;
      }
    }
  }
}

/** @see lib/neatogen/constraint.c:mkConstraintG */
function mkConstraintG(list: Items, intersect: IntersectFn, dist: DistFn): ConstraintGraph {
  const cg = newCg();
  const flat = flatten(list);
  buildChain(cg, flat);
  mapGraphs(buildVisibility(flat, intersect), flat, cg, dist);
  return cg;
}

function buildConstraintGraph(
  g: Graph, list: Items, ifn: IntersectFn, dist: DistFn, ortho: boolean,
): ConstraintGraph {
  return ortho ? mkConstraintG(list, ifn, dist) : mkNConstraintG(g, list, ifn, dist);
}

function newItems(): Items {
  return new DtBag<Nitem, number>((p) => p.val, cmpitem);
}

/**
 * Create the X constraints and solve (linear objective, so network simplex).
 * @see lib/neatogen/constraint.c:constrainX
 */
function constrainX(g: Graph, nlist: Nitem[], ifn: IntersectFn, ortho: boolean): void {
  const list = newItems();
  for (const p of nlist) {
    p.val = p.pos.x;
    list.insert(p);
  }
  const cg = buildConstraintGraph(g, list, ifn, distX, ortho);
  rank(cg.g, 2, INT_MAX);
  for (const p of nlist) {
    const newpos = cnodeOf(p).info.rank ?? 0;
    const delta = newpos - p.pos.x;
    p.pos.x = newpos;
    p.bb.llx += delta;
    p.bb.urx += delta;
  }
}

/**
 * See constrainX.
 * @see lib/neatogen/constraint.c:constrainY
 */
function constrainY(g: Graph, nlist: Nitem[], ifn: IntersectFn, ortho: boolean): void {
  const list = newItems();
  for (const p of nlist) {
    p.val = p.pos.y;
    list.insert(p);
  }
  const cg = buildConstraintGraph(g, list, ifn, distY, ortho);
  rank(cg.g, 2, INT_MAX);
  for (const p of nlist) {
    const newpos = cnodeOf(p).info.rank ?? 0;
    const delta = newpos - p.pos.y;
    p.pos.y = newpos;
    p.bb.lly += delta;
    p.bb.ury += delta;
  }
}

/** @see lib/neatogen/constraint.c:overlaps (geom.h OVERLAP) */
function overlaps(p: Nitem[]): boolean {
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i]!.bb;
    for (let j = i + 1; j < p.length; j++) {
      const b = p[j]!.bb;
      if (a.urx >= b.llx && b.urx >= a.llx && a.ury >= b.lly && b.ury >= a.lly) return true;
    }
  }
  return false;
}

/** @see lib/neatogen/constraint.c:initItem */
function initItem(n: Node, margin: ExpandT): Nitem {
  const x = cround(SCALE * (n.info.pos?.[0] ?? 0) * POINTS_PER_INCH);
  const y = cround(SCALE * (n.info.pos?.[1] ?? 0) * POINTS_PER_INCH);
  const width = n.info.width ?? 0;
  const height = n.info.height ?? 0;
  let w2: number;
  let h2: number;
  if (margin.doAdd) {
    w2 = Math.trunc(SCALE * (cround((width / 2.0) * POINTS_PER_INCH) + margin.x));
    h2 = Math.trunc(SCALE * (cround((height / 2.0) * POINTS_PER_INCH) + margin.y));
  } else {
    w2 = cround(margin.x * SCALE2 * width * POINTS_PER_INCH);
    h2 = cround(margin.y * SCALE2 * height * POINTS_PER_INCH);
  }
  return {
    val: 0,
    pos: { x, y },
    np: n,
    cnode: undefined,
    bb: { llx: x - w2, lly: y - h2, urx: x + w2, ury: y + h2 },
  };
}

/** One cAdjust mode: which axis goes first, the first pass's test, and ortho. */
interface Plan {
  xFirst: boolean;
  firstTest: IntersectFn;
  ortho: boolean;
}

/** @see lib/neatogen/constraint.c:cAdjust (switch) */
const PLANS: ReadonlyMap<number, Plan> = new Map([
  [AM_ORTHOXY, { xFirst: true, firstTest: intersectY, ortho: true }],
  [AM_ORTHOYX, { xFirst: false, firstTest: intersectX, ortho: true }],
  [AM_ORTHO, { xFirst: true, firstTest: intersectY0, ortho: true }],
  [AM_ORTHO_YX, { xFirst: false, firstTest: intersectX0, ortho: true }],
  [AM_PORTHOXY, { xFirst: true, firstTest: intersectY, ortho: false }],
  [AM_PORTHOYX, { xFirst: false, firstTest: intersectX, ortho: false }],
  [AM_PORTHO_YX, { xFirst: false, firstTest: intersectX0, ortho: false }],
  [AM_PORTHO, { xFirst: true, firstTest: intersectY0, ortho: false }],
]);

function runPlan(g: Graph, nlist: Nitem[], plan: Plan): void {
  if (plan.xFirst) {
    constrainX(g, nlist, plan.firstTest, plan.ortho);
    constrainY(g, nlist, intersectX, plan.ortho);
  } else {
    constrainY(g, nlist, plan.firstTest, plan.ortho);
    constrainX(g, nlist, intersectY, plan.ortho);
  }
}

/**
 * Remove node overlaps with orthogonal-ordering constraints. mode is one of
 * the eight AM_ORTHO and AM_PORTHO values (else AM_PORTHO). Returns 1
 * if nodes were moved, 0 if no boxes overlapped.
 *
 * ND_pos is in inches; positions are rounded to integer points (x SCALE) while
 * solving, then written back.
 * @see lib/neatogen/constraint.c:cAdjust
 */
export function cAdjust(g: Graph, mode: number): number {
  const margin = sepFactor(g);
  const nlist = nodesInSeq(g).map((n) => initItem(n, margin));
  if (!overlaps(nlist)) return 0;
  runPlan(g, nlist, PLANS.get(mode) ?? PLANS.get(AM_PORTHO)!);
  for (const p of nlist) {
    const x = p.pos.x / POINTS_PER_INCH / SCALE;
    const y = p.pos.y / POINTS_PER_INCH / SCALE;
    if (p.np.info.pos) {
      p.np.info.pos[0] = x;
      p.np.info.pos[1] = y;
    } else {
      p.np.info.pos = [x, y];
    }
  }
  return 1;
}
