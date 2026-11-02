// SPDX-License-Identifier: EPL-2.0

/**
 * Non-overlap constraints, static overlap removal and DiG-CoLa level helpers
 * of `lib/neatogen/quad_prog_vpsc.c`. The C file is split across this file
 * and `quad-prog-vpsc.ts` only because of the file-length limit.
 *
 * `generateNonoverlapConstraints` is one 200-line C function; it is split here
 * at its own phase boundaries (node boxes, per-cluster constraints, top-level
 * constraints and their remap, removal of the previous pass, merge with the
 * global constraints), keeping statement order. Its six C parameters travel as
 * {@link NonoverlapArgs} (five-parameter limit). The bounding-box arithmetic
 * is plain double (no fused operations in the 16.1 build).
 *
 * `remapInConstraints` / `remapOutConstraints` (`csolve_VPSC.cpp`) have no
 * port under `src/vpsc/`; their only caller is here, so they are ported here.
 *
 * @see lib/neatogen/quad_prog_vpsc.c
 */

import type { Box } from '../../model/geom.js';
import {
  Rectangle,
  newVariable,
  newIncVPSC,
  deleteVPSC,
  deleteConstraint,
  deleteVariable,
  solveVPSC,
  getVariablePos,
  genXConstraints,
  genYConstraints,
  type Constraint,
  type Variable,
} from '../../vpsc/index.js';
import { fmaxf, fminf } from './quad-prog-solve.js';
import {
  deleteCMajEnvVPSC,
  initCMajVPSC,
  type CMajEnvVPSC,
  type DigColaLevel,
  type IpsepOptions,
} from './quad-prog-vpsc.js';

const fr = Math.fround;

/** Grow nodes in x so a horizontally resolved overlap is not also vertical (a C `float`). */
const X_GROWTH = fr(1.0001);
/** Width of a cluster's boundary-variable box. */
const BOUNDARY_WIDTH = 0.0001;
/** First id of the temporary top-level cluster variables. */
const TMP_CLUSTER_VAR_ID = 123;

/** `generateNonoverlapConstraints`' parameters after `e`, in C order. */
export interface NonoverlapArgs {
  nsizeScale: number;
  coords: Float32Array[];
  /** 0 = x, 1 = y. */
  k: 0 | 1;
  transitiveClosure: boolean;
  opt: IpsepOptions;
}

/** C struct copy of a `boxf` (`B2BF`). @see lib/common/geom.h:B2BF */
function copyBox(b: Box): Box {
  return { ll: { x: b.ll.x, y: b.ll.y }, ur: { x: b.ur.x, y: b.ur.y } };
}

/** @see lib/common/geomprocs.h:expandbbf */
function expandBox(b0: Box, b1: Box): void {
  b0.ll.x = fminf(b0.ll.x, b1.ll.x);
  b0.ll.y = fminf(b0.ll.y, b1.ll.y);
  b0.ur.x = fmaxf(b0.ur.x, b1.ur.x);
  b0.ur.y = fmaxf(b0.ur.y, b1.ur.y);
}

/** @see lib/vpsc/csolve_VPSC.cpp:genXConstraints */
function genX(n: number, bb: Box[], vs: Variable[], transitiveClosure: boolean): Constraint[] {
  const rs: Rectangle[] = [];
  for (let i = 0; i < n; i++) {
    rs.push(new Rectangle(bb[i]!.ll.x, bb[i]!.ur.x, bb[i]!.ll.y, bb[i]!.ur.y));
  }
  return genXConstraints(rs, vs, transitiveClosure);
}

/** @see lib/vpsc/csolve_VPSC.cpp:genYConstraints */
function genY(n: number, bb: Box[], vs: Variable[]): Constraint[] {
  const rs: Rectangle[] = [];
  for (let i = 0; i < n; i++) {
    rs.push(new Rectangle(bb[i]!.ll.x, bb[i]!.ur.x, bb[i]!.ll.y, bb[i]!.ur.y));
  }
  return genYConstraints(rs, vs);
}

/** @see lib/vpsc/csolve_VPSC.cpp:remapInConstraints */
function remapInConstraints(u: Variable, v: Variable, dgap: number): void {
  for (const c of u.in) {
    c.right = v;
    c.gap += dgap;
    v.in.push(c);
  }
  u.in.length = 0;
}

/** @see lib/vpsc/csolve_VPSC.cpp:remapOutConstraints */
function remapOutConstraints(u: Variable, v: Variable, dgap: number): void {
  for (const c of u.out) {
    c.left = v;
    c.gap += dgap;
    v.out.push(c);
  }
  u.out.length = 0;
}

/**
 * Each real node's box: its size scaled by `nsizeScale`, plus half the gap.
 * @see lib/neatogen/quad_prog_vpsc.c:generateNonoverlapConstraints (382-398)
 */
function nodeBoxes(n: number, nsizeScale: number, a: NonoverlapArgs): Box[] {
  const { coords, opt } = a;
  const bb: Box[] = [];
  for (let i = 0; i < n; i++) {
    const s = opt.nsize[i]!;
    bb.push({
      ll: {
        x: coords[0]![i]! - nsizeScale * s.x / 2.0 - opt.gap.x / 2.0,
        y: coords[1]![i]! - nsizeScale * s.y / 2.0 - opt.gap.y / 2.0,
      },
      ur: {
        x: coords[0]![i]! + nsizeScale * s.x / 2.0 + opt.gap.x / 2.0,
        y: coords[1]![i]! + nsizeScale * s.y / 2.0 + opt.gap.y / 2.0,
      },
    });
  }
  return bb;
}

/**
 * Non-overlap constraints inside cluster `i`, including its two boundary
 * variables; records the cluster's bounding box in `opt.clusters.bb[i]`.
 * @see lib/neatogen/quad_prog_vpsc.c:generateNonoverlapConstraints (402-433)
 */
function clusterConstraints(e: CMajEnvVPSC, n: number, bb: Box[], a: NonoverlapArgs, i: number): Constraint[] {
  const cl = a.opt.clusters;
  const cn = cl.clustersizes[i]!;
  const cvs: Variable[] = [];
  const cbb: Box[] = [];
  /* compute cluster bounding bb */
  const container: Box = {
    ll: { x: Number.MAX_VALUE, y: Number.MAX_VALUE }, ur: { x: -Number.MAX_VALUE, y: -Number.MAX_VALUE },
  };
  for (let j = 0; j < cn; j++) {
    const iv = cl.clusters[i]![j]!;
    cvs[j] = e.vs[iv]!;
    cbb[j] = copyBox(bb[iv]!);
    expandBox(container, bb[iv]!);
  }
  cl.bb[i] = copyBox(container);
  cvs[cn] = e.vs[n + 2 * i]!;
  cvs[cn + 1] = e.vs[n + 2 * i + 1]!;
  cbb[cn] = copyBox(container);
  cbb[cn + 1] = copyBox(container);
  if (a.k === 0) {
    cbb[cn]!.ur.x = container.ll.x + BOUNDARY_WIDTH;
    cbb[cn + 1]!.ll.x = container.ur.x - BOUNDARY_WIDTH;
    return genX(cn + 2, cbb, cvs, a.transitiveClosure);
  }
  cbb[cn]!.ur.y = container.ll.y + BOUNDARY_WIDTH;
  cbb[cn + 1]!.ll.y = container.ur.y - BOUNDARY_WIDTH;
  return genY(cn + 2, cbb, cvs);
}

/**
 * Remap the constraints of each temporary cluster variable to the cluster's
 * left (in-constraints) and right (out-constraints) boundary variables.
 * @see lib/neatogen/quad_prog_vpsc.c:generateNonoverlapConstraints (458-497)
 */
function remapClusterVars(e: CMajEnvVPSC, n: number, cvs: Variable[], cbb: Box[], a: NonoverlapArgs): void {
  const ntop = a.opt.clusters.ntoplevel;
  for (let i = ntop; i < cvs.length; i++) {
    const j = i - ntop;
    /* dgap is the change in required constraint gap.
     * since we are going from a source rectangle the size
     * of the cluster bounding box to a zero width (in x dim,
     * zero height in y dim) rectangle, the change will be
     * half the bb width.
     */
    const dgap = a.k === 0
      ? -(cbb[i]!.ur.x - cbb[i]!.ll.x) / 2.0
      : -(cbb[i]!.ur.y - cbb[i]!.ll.y) / 2.0;
    remapInConstraints(cvs[i]!, e.vs[n + 2 * j]!, dgap);
    remapOutConstraints(cvs[i]!, e.vs[n + 2 * j + 1]!, dgap);
    deleteVariable(cvs[i]!);
  }
}

/**
 * Top-level non-overlap constraints between nodes in no cluster and the
 * clusters as rectangles, mapped back to the boundary variables.
 * @see lib/neatogen/quad_prog_vpsc.c:generateNonoverlapConstraints (435-500)
 */
function topLevelConstraints(e: CMajEnvVPSC, n: number, bb: Box[], a: NonoverlapArgs): Constraint[] {
  const cl = a.opt.clusters;
  const cn = cl.ntoplevel + cl.nclusters;
  const cvs: Variable[] = [];
  const cbb: Box[] = [];
  for (let i = 0; i < cl.ntoplevel; i++) {
    const iv = cl.toplevel[i]!;
    cvs[i] = e.vs[iv]!;
    cbb[i] = copyBox(bb[iv]!);
  }
  /* make dummy variables for clusters */
  for (let i = cl.ntoplevel; i < cn; i++) {
    cvs[i] = newVariable(TMP_CLUSTER_VAR_ID + i, 1, 1);
    const j = i - cl.ntoplevel;
    cbb[i] = copyBox(cl.bb[j]!);
  }
  const cs = a.k === 0 ? genX(cn, cbb, cvs, a.transitiveClosure) : genY(cn, cbb, cvs);
  /* remap constraints from tmp dummy vars to cluster l and r vars */
  remapClusterVars(e, n, cvs, cbb, a);
  return cs;
}

/**
 * Constraints of every cluster, then the top-level ones, as one array.
 * @see lib/neatogen/quad_prog_vpsc.c:generateNonoverlapConstraints (399-511)
 */
function clusteredConstraints(e: CMajEnvVPSC, n: number, bb: Box[], a: NonoverlapArgs): Constraint[] {
  const cscl: Constraint[][] = [];
  for (let i = 0; i < a.opt.clusters.nclusters; i++) {
    cscl[i] = clusterConstraints(e, n, bb, a, i);
  }
  /* generate top level constraints */
  cscl[a.opt.clusters.nclusters] = topLevelConstraints(e, n, bb, a);
  const csol: Constraint[] = [];
  for (const cs of cscl) {
    /* copy constraints into csol */
    for (const c of cs) csol.push(c);
  }
  return csol;
}

/**
 * Remove the overlap constraints of the previous pass (global ones stay).
 * @see lib/neatogen/quad_prog_vpsc.c:generateNonoverlapConstraints (518-529)
 */
function removePrevious(e: CMajEnvVPSC): void {
  if (e.m > 0) {
    /* can't reuse instance of VPSC when constraints change! */
    deleteVPSC(e.vpsc!);
    for (let i = e.gm; i < e.m; i++) {
      /* delete previous overlap constraints */
      deleteConstraint(e.cs![i]!);
    }
    /* just delete the array, not the elements (C deleteConstraints(0, e->cs)) */
  }
}

/**
 * Generate non-overlap constraints for the nodes (and, with clusters, inside
 * each cluster including its boundary variables, then between top-level
 * nodes and clusters treated as rectangles), replacing the previous pass's
 * and keeping the global constraints first.
 * @see lib/neatogen/quad_prog_vpsc.c:generateNonoverlapConstraints
 */
export function generateNonoverlapConstraints(e: CMajEnvVPSC, a: NonoverlapArgs): void {
  let n = e.nv + e.nldv;
  let nsizeScale = a.nsizeScale;
  const genclusters = a.opt.clusters.nclusters > 0;
  if (genclusters) {
    /* n is the number of real variables, not dummy cluster vars */
    n -= 2 * a.opt.clusters.nclusters;
  }
  if (a.k === 0) {
    /* grow a bit in the x dimension, so that if overlap is resolved
     * horizontally then it won't be considered overlapping vertically
     */
    nsizeScale = fr(nsizeScale * X_GROWTH);
  }
  const bb = nodeBoxes(n, nsizeScale, a);
  let csol: Constraint[];
  if (genclusters) {
    csol = clusteredConstraints(e, n, bb, a);
  } else if (a.k === 0) {
    csol = genX(n, bb, e.vs, a.transitiveClosure);
  } else {
    csol = genY(n, bb, e.vs);
  }
  removePrevious(e);
  /* if we have no global constraints then the overlap constraints
   * are all we have to worry about.
   * Otherwise, we have to copy the global and overlap constraints
   * into the one array
   */
  if (e.gm === 0) {
    e.m = csol.length;
    e.cs = csol;
  } else {
    e.m = csol.length + e.gm;
    e.cs = [];
    for (let i = 0; i < e.m; i++) {
      e.cs[i] = i < e.gm ? e.gcs![i]! : csol[i - e.gm]!;
    }
  }
  e.vpsc = newIncVPSC(e.vs, e.cs);
}

/**
 * Statically remove overlaps: move each node as little as possible.
 * @see lib/neatogen/quad_prog_vpsc.c:removeoverlaps
 */
export function removeoverlaps(n: number, coords: Float32Array[], opt: IpsepOptions): void {
  // diredges 0 never reaches compute_hierarchy, so this is never null.
  const e = initCMajVPSC(n, null, null, opt, 0)!;
  generateNonoverlapConstraints(e, { nsizeScale: 1.0, coords, k: 0, transitiveClosure: true, opt });
  solveVPSC(e.vpsc!);
  for (let i = 0; i < n; i++) {
    coords[0]![i] = getVariablePos(e.vs[i]!);
  }
  generateNonoverlapConstraints(e, { nsizeScale: 1.0, coords, k: 1, transitiveClosure: false, opt });
  solveVPSC(e.vpsc!);
  for (let i = 0; i < n; i++) {
    coords[1]![i] = getVariablePos(e.vs[i]!);
  }
  deleteCMajEnvVPSC(e);
}

/**
 * Unpack `ordering` into one level per division (plus the last).
 * @see lib/neatogen/quad_prog_vpsc.c:assign_digcola_levels
 */
export function assignDigcolaLevels(
  ordering: Int32Array, n: number, levelInds: Int32Array, numDivisions: number,
): DigColaLevel[] {
  const level = (numNodes: number, from: number): DigColaLevel => {
    const nodes = new Int32Array(numNodes);
    for (let j = 0; j < numNodes; j++) nodes[j] = ordering[from + j]!;
    return { nodes, numNodes };
  };
  /* first level */
  const l: DigColaLevel[] = [level(levelInds[0]!, 0)];
  /* second through second last level */
  for (let i = 1; i < numDivisions; i++) {
    l[i] = level(levelInds[i]! - levelInds[i - 1]!, levelInds[i - 1]!);
  }
  /* last level */
  if (numDivisions > 0) {
    l[numDivisions] = level(n - levelInds[numDivisions - 1]!, levelInds[numDivisions - 1]!);
  }
  return l;
}

/**
 * Number of separation constraints from the level sizes:
 * `Σ_{i=1}^{num_levels-1} (|L[i]| + |L[i-1]|) + |L[0]| + |L[num_levels-1]|`.
 * @see lib/neatogen/quad_prog_vpsc.c:get_num_digcola_constraints
 */
export function getNumDigcolaConstraints(levels: DigColaLevel[], numLevels: number): number {
  let nc = 0;
  for (let i = 1; i < numLevels; i++) {
    nc += levels[i]!.numNodes + levels[i - 1]!.numNodes;
  }
  nc += levels[0]!.numNodes + levels[numLevels - 1]!.numNodes;
  return nc;
}
