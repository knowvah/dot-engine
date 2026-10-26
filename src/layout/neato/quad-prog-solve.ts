// SPDX-License-Identifier: EPL-2.0

/**
 * Constrained majorization with level gaps (DiG-CoLa, `mode=hier`) — a
 * float32-faithful port of `lib/neatogen/quad_prog_solve.c`. The C works on
 * `float`; every float operation is rounded with `Math.fround` and arrays are
 * `Float32Array`, as `stress-kernel.ts` does.
 *
 * `deleteCMajEnv` is not ported: it only `free`s the environment's arrays, which
 * the garbage collector does here, so it has no observable effect.
 *
 * The C `constrained_majorization_new_with_gaps` is one 270-line function; it is
 * split here at its own phase boundaries (block growth, desired places, level
 * ordering, prefix/suffix stats, best split, move) to satisfy the complexity
 * limits. Statement order and float rounding points are kept.
 *
 * @see lib/neatogen/quad_prog_solve.c
 * @see lib/neatogen/quad_prog_solver.h
 */

import { quicksortPlacef } from './kkutils.js';
import { orthog1f } from './matrix-ops.js';

const fr = Math.fround;

/** `equals` tolerance, a C `const float`. @see lib/neatogen/quad_prog_solve.c:equals */
const TOLERANCE = fr(1e-2);
/** "No lower bound / upper bound" sentinel. @see lib/neatogen/quad_prog_solve.c */
const BOUND = 1e9;
/** Block-membership slack in `constrained_majorization_new_with_gaps`. */
const BLOCK_EPSILON = 1e-9;
/** C `SIZE_MAX` sentinel for `best_i`. */
const NO_SPLIT = -1;

/**
 * Constrained-majorization environment.
 * @see lib/neatogen/quad_prog_solver.h:CMajEnv
 */
export interface CMajEnv {
  /** Unpacked symmetric matrix, `A[i][j]`. */
  A: Float32Array[];
  n: number;
  fArray1: Float32Array;
  fArray2: Float32Array;
  fArray3: Float32Array;
  fArray4: Float32Array;
  ordering: Int32Array;
  levels: Int32Array;
  numLevels: number;
}

/** Mutable state shared by the phase helpers of one solve. */
interface SolveCtx {
  e: CMajEnv;
  place: Float32Array;
  b: Float32Array;
  /** Level at position `i` (C indexes it by position in the block tests). */
  lev: Int32Array;
  levelsGap: number;
  /** Current block (nodes connected by active constraints). */
  block: number[];
  lowerBound: number;
  converged: boolean;
}

/** Big-endian view used to step a double by one ulp (high word at 0, low at 4). */
const BITS = new DataView(new ArrayBuffer(8));

/** The double adjacent to `s`, one ulp away from or toward zero (`s`'s low bit is 0). */
function oddNeighbour(s: number, awayFromZero: boolean): number {
  BITS.setFloat64(0, s);
  const hi = BITS.getUint32(0);
  const lo = BITS.getUint32(4);
  if (awayFromZero) {
    BITS.setUint32(4, lo + 1);
  } else if (lo === 0) {
    BITS.setUint32(0, hi - 1);
    BITS.setUint32(4, 0xffffffff);
  } else {
    BITS.setUint32(4, lo - 1);
  }
  return BITS.getFloat64(0);
}

/**
 * Float fused multiply-add, round(a*b + c) with a single rounding to float, as the
 * arm64 `fmadd s` the 16.1 oracle build emits. The product of two floats is exact
 * in a double; the double sum is made round-to-odd so the final rounding to float
 * cannot double-round.
 */
export function fmaf(a: number, b: number, c: number): number {
  const p = a * b;
  const s = p + c;
  const bv = s - p;
  const err = (p - (s - bv)) + (c - bv); /* Knuth two-sum: s + err == p + c */
  if (err === 0 || !Number.isFinite(s)) return fr(s);
  BITS.setFloat64(0, s);
  if ((BITS.getUint32(4) & 1) !== 0) return fr(s);
  /* even: step one ulp toward the exact value to land on the odd neighbour */
  return fr(oddNeighbour(s, (err > 0) === (s > 0)));
}

/**
 * `block_deg*des_place_block + (-lap)*desired + tbc*cur_place`, contracted as the
 * oracle does: fnmul, then two chained float fmadd.
 * @see lib/neatogen/quad_prog_solve.c:constrained_majorization_new_with_gaps
 */
function blockPlaceNumerator(
  blockDeg: number, desPlaceBlock: number, negLapTimesDesired: number,
  toBlockConnectivity: number, curPlace: number,
): number {
  const t = fmaf(blockDeg, desPlaceBlock, negLapTimesDesired);
  return fmaf(toBlockConnectivity, curPlace, t);
}

/** Are two values equal, within a reasonable tolerance? @see lib/neatogen/quad_prog_solve.c:equals */
function equals(a: number, b: number): boolean {
  return Math.abs(fr(a - b)) < TOLERANCE;
}

/** C `fminf`: a NaN operand yields the other operand. */
export function fminf(a: number, b: number): number {
  if (Number.isNaN(a)) return b;
  if (Number.isNaN(b)) return a;
  return a < b ? a : b;
}

/** C `fmaxf`: a NaN operand yields the other operand. */
export function fmaxf(a: number, b: number): number {
  if (Number.isNaN(a)) return b;
  if (Number.isNaN(b)) return a;
  return a > b ? a : b;
}

/**
 * Expand an upper-triangular packed symmetric matrix into rows.
 * @see lib/neatogen/quad_prog_solve.c:unpackMatrix
 */
export function unpackMatrix(packedMat: Float32Array, n: number): Float32Array[] {
  const flat = new Float32Array(n * n);
  const mat: Float32Array[] = new Array<Float32Array>(n);
  for (let i = 0; i < n; i++) mat[i] = flat.subarray(i * n, (i + 1) * n);
  for (let i = 0, k = 0; i < n; i++) {
    for (let j = i; j < n; j++, k++) {
      mat[j]![i] = mat[i]![j] = packedMat[k]!;
    }
  }
  return mat;
}

/**
 * Ensure levels are separated in the initial layout and places are monotonic
 * increasing within a layer.
 * @see lib/neatogen/quad_prog_solve.c:ensureMonotonicOrderingWithGaps
 */
function ensureMonotonicOrderingWithGaps(
  place: Float32Array, n: number, ordering: Int32Array,
  levels: Int32Array, numLevels: number, levelsGap: number,
): void {
  let lowerBound = fr(-1e9);
  let level = -1;
  let maxInLevel = 0;
  for (let i = 0; i < n; i++) {
    if (i >= maxInLevel) {
      /* we are entering a new level */
      level++;
      maxInLevel = level === numLevels ? n : levels[level]!;
      lowerBound = i > 0 ? fr(place[ordering[i - 1]!]! + levelsGap) : fr(-1e9);
      quicksortPlacef(place, ordering, i, maxInLevel - 1);
    }
    const node = ordering[i]!;
    if (place[node]! < lowerBound) place[node] = lowerBound;
  }
}

/** Level of each node (C's `lev` array). @see lib/neatogen/quad_prog_solve.c:constrained_majorization_new_with_gaps */
function computeNodeLevels(e: CMajEnv): Int32Array {
  const lev = new Int32Array(e.n);
  let level = -1;
  let maxInLevel = 0;
  for (let i = 0; i < e.n; i++) {
    if (i >= maxInLevel) {
      /* we are entering a new level */
      level++;
      maxInLevel = level === e.numLevels ? e.n : e.levels[level]!;
    }
    lev[e.ordering[i]!] = level;
  }
  return lev;
}

/**
 * Grow the block `ordering[left]..ordering[right-1]` of nodes connected with
 * active constraints; fills `fArray4` (gap) and returns `right`.
 * @see lib/neatogen/quad_prog_solve.c:constrained_majorization_new_with_gaps
 */
function growBlock(c: SolveCtx, left: number, curPlace: number): number {
  const { place, lev, levelsGap, e } = c;
  const gap = e.fArray4;
  let targetPlace = curPlace;
  gap[e.ordering[left]!] = 0;
  let right: number;
  for (right = left + 1; right < e.n; right++) {
    if (lev[right]! > lev[right - 1]!) {
      /* we are entering a new level; 'levels_gap' may be negative */
      targetPlace = fr(targetPlace + levelsGap);
    }
    const node = e.ordering[right]!;
    if (Math.abs(fr(place[node]! - targetPlace)) > BLOCK_EPSILON) break;
    gap[node] = fr(place[node]! - curPlace);
  }
  return right;
}

/**
 * Desired place of the block's reference point according to each node.
 * @see lib/neatogen/quad_prog_solve.c:constrained_majorization_new_with_gaps
 */
function computeDesiredPlaces(c: SolveCtx, left: number, right: number): void {
  const { e, place, b } = c;
  for (let i = left; i < right; i++) {
    const node = e.ordering[i]!;
    let newPlaceI = -b[node]!;
    const lapNode = e.A[node]!;
    for (let j = 0; j < e.n; j++) {
      if (j === node) continue;
      newPlaceI = fmaf(lapNode[j]!, place[j]!, newPlaceI);
    }
    e.fArray1[node] = fr(fr(newPlaceI / -lapNode[node]!) - e.fArray4[node]!);
  }
}

/** Append the nodes in positions `[from, to)` whose desired place passes `test`. */
function collectWhere(
  c: SolveCtx, from: number, to: number, test: (desired: number) => boolean,
): void {
  for (let j = from; j < to; j++) {
    const node = c.e.ordering[j]!;
    if (test(c.e.fArray1[node]!)) c.block.push(node);
  }
}

/**
 * Reorder the block by levels, and within levels by "relaxed" desired position.
 * @see lib/neatogen/quad_prog_solve.c:constrained_majorization_new_with_gaps
 */
function orderBlockByLevels(
  c: SolveCtx, left: number, right: number, curPlace: number,
): void {
  const { e } = c;
  c.block.length = 0;
  let firstNextLevel = 0;
  for (let i = left; i < right; i = firstNextLevel) {
    const level = c.lev[e.ordering[i]!]!;
    firstNextLevel = level === e.numLevels ? right : Math.min(right, e.levels[level]!);
    /* smaller than, then equal to, then greater than the current place */
    collectWhere(c, i, firstNextLevel, (d) => d < curPlace);
    collectWhere(c, i, firstNextLevel, (d) => d === curPlace);
    collectWhere(c, i, firstNextLevel, (d) => d > curPlace);
  }
}

/**
 * Desired places of the block's prefixes.
 * @see lib/neatogen/quad_prog_solve.c:constrained_majorization_new_with_gaps
 */
function computePrefixDesiredPlaces(c: SolveCtx, curPlace: number): void {
  const { e, block } = c;
  let desPlaceBlock = 0;
  let blockDeg = 0;
  for (let i = 0; i < block.length; i++) {
    const node = block[i]!;
    let toBlockConnectivity = 0;
    const lapNode = e.A[node]!;
    for (let j = 0; j < i; j++) {
      toBlockConnectivity = fr(toBlockConnectivity - lapNode[block[j]!]!);
    }
    toBlockConnectivity = fr(toBlockConnectivity * 2);
    /* update block stats */
    const num = blockPlaceNumerator(
      blockDeg, desPlaceBlock, fr(-lapNode[node]! * e.fArray1[node]!),
      toBlockConnectivity, curPlace,
    );
    desPlaceBlock = fr(num / fr(fr(blockDeg - lapNode[node]!) + toBlockConnectivity));
    e.fArray2[i] = desPlaceBlock;
    blockDeg = fr(blockDeg + fr(toBlockConnectivity - lapNode[node]!));
  }
  if (e.n >= 0 && block.length === e.n) {
    /* fix is needed since denominator was 0 in this case */
    e.fArray2[e.n - 1] = curPlace; /* a "neutral" value */
  }
}

/**
 * Desired places of the block's suffixes.
 * @see lib/neatogen/quad_prog_solve.c:constrained_majorization_new_with_gaps
 */
function computeSuffixDesiredPlaces(c: SolveCtx, curPlace: number): void {
  const { e, block } = c;
  let desPlaceBlock = 0;
  let blockDeg = 0;
  for (let i = block.length - 1; i >= 0; i--) {
    const node = block[i]!;
    let toBlockConnectivity = 0;
    const lapNode = e.A[node]!;
    for (let j = i + 1; j < block.length; j++) {
      toBlockConnectivity = fr(toBlockConnectivity - lapNode[block[j]!]!);
    }
    toBlockConnectivity = fr(toBlockConnectivity * 2);
    /* update block stats */
    const num = blockPlaceNumerator(
      blockDeg, desPlaceBlock, fr(-lapNode[node]! * e.fArray1[node]!),
      toBlockConnectivity, curPlace,
    );
    desPlaceBlock = fr(num / fr(fr(blockDeg - lapNode[node]!) + toBlockConnectivity));
    e.fArray3[i] = desPlaceBlock;
    blockDeg = fr(blockDeg + fr(toBlockConnectivity - lapNode[node]!));
  }
  if (e.n >= 0 && block.length === e.n) {
    /* fix is needed since denominator was 0 in this case */
    e.fArray3[0] = curPlace; /* a "neutral" value? */
  }
}

/**
 * Scratch result of {@link limitMoves}: `[prefix, suffix]`. Module-level to avoid
 * allocating in the hot loop; the solver is synchronous and non-reentrant.
 */
const LIMITED = new Float64Array(2);

/**
 * Limit moves to ensure that the prefix is placed before the suffix.
 * Writes the adjusted `[prefix, suffix]` into {@link LIMITED}.
 * @see lib/neatogen/quad_prog_solve.c:constrained_majorization_new_with_gaps
 */
function limitMoves(prefix: number, suffix: number, curPlace: number): void {
  if (suffix < prefix) {
    if (suffix < curPlace) {
      if (prefix > curPlace) prefix = curPlace;
      suffix = prefix;
    } else if (prefix > curPlace) {
      prefix = suffix;
    }
  }
  LIMITED[0] = prefix;
  LIMITED[1] = suffix;
}

/**
 * Find the best place to split the block; `NO_SPLIT` when nothing moves.
 * @see lib/neatogen/quad_prog_solve.c:constrained_majorization_new_with_gaps
 */
function findBestSplit(c: SolveCtx, curPlace: number): number {
  const { e, block } = c;
  let bestI = NO_SPLIT;
  let maxMovement = 0;
  for (let i = 0; i < block.length; i++) {
    const suffixDesPlace = e.fArray3[i]!;
    const prefixDesPlace = i > 0 ? e.fArray2[i - 1]! : suffixDesPlace;
    limitMoves(prefixDesPlace, suffixDesPlace, curPlace);
    const movement = (block.length - i) * Math.abs(fr(LIMITED[1]! - curPlace))
      + i * Math.abs(fr(LIMITED[0]! - curPlace));
    if (movement > maxMovement) {
      maxMovement = movement;
      bestI = i;
    }
  }
  return bestI;
}

/** Right border of the feasible move, relative to the block's reference point. */
function computeUpperBound(c: SolveCtx, right: number): number {
  const { e, place, lev, levelsGap, block } = c;
  if (right >= e.n) return BOUND; /* no nodes after current block */
  /* deduct 'gap[block[block_len-1]]': all computations are relative to the
   * block's reference point */
  const lastGap = e.fArray4[block[block.length - 1]!]!;
  const nextPlace = place[e.ordering[right]!]!;
  if (lev[e.ordering[right]!]! > lev[e.ordering[right - 1]!]!) {
    return fr(fr(nextPlace - levelsGap) - lastGap);
  }
  return fr(nextPlace - lastGap);
}

/** Lower bound for the next block. */
function nextLowerBound(c: SolveCtx, right: number): number {
  const { e, place, lev, levelsGap, block } = c;
  const last = place[block[block.length - 1]!]!;
  if (right < e.n && lev[e.ordering[right]!]! > lev[e.ordering[right - 1]!]!) {
    return fr(last + levelsGap);
  }
  return last;
}

/**
 * Actually move prefix and suffix of the block, update the bound for the next
 * block and the ordering.
 * @see lib/neatogen/quad_prog_solve.c:constrained_majorization_new_with_gaps
 */
function moveSplitBlock(
  c: SolveCtx, bestI: number, left: number, right: number, curPlace: number,
): void {
  const { e, place, block } = c;
  let suffixDesPlace = e.fArray3[bestI]!;
  let prefixDesPlace = bestI > 0 ? e.fArray2[bestI - 1]! : suffixDesPlace;
  suffixDesPlace = fminf(suffixDesPlace, computeUpperBound(c, right));
  prefixDesPlace = fmaxf(prefixDesPlace, c.lowerBound);
  limitMoves(prefixDesPlace, suffixDesPlace, curPlace);
  prefixDesPlace = LIMITED[0]!;
  suffixDesPlace = LIMITED[1]!;
  for (let i = 0; i < bestI; i++) {
    place[block[i]!] = fr(prefixDesPlace + e.fArray4[block[i]!]!);
  }
  for (let i = bestI; i < block.length; i++) {
    place[block[i]!] = fr(suffixDesPlace + e.fArray4[block[i]!]!);
  }
  c.lowerBound = nextLowerBound(c, right);
  /* reorder 'ordering' to reflect change of places; enough for the split level */
  for (let i = left; i < right; i++) e.ordering[i] = block[i - left]!;
  c.converged = c.converged
    && equals(prefixDesPlace, curPlace) && equals(suffixDesPlace, curPlace);
}

/** One block of one majorization sweep; returns the block's `right` border. */
function processBlock(c: SolveCtx, left: number): number {
  const curPlace = c.place[c.e.ordering[left]!]!;
  const right = growBlock(c, left, curPlace);
  computeDesiredPlaces(c, left, right);
  orderBlockByLevels(c, left, right, curPlace);
  computePrefixDesiredPlaces(c, curPlace);
  computeSuffixDesiredPlaces(c, curPlace);
  const bestI = findBestSplit(c, curPlace);
  if (bestI !== NO_SPLIT) {
    moveSplitBlock(c, bestI, left, right, curPlace);
  } else {
    /* no movement */
    c.lowerBound = nextLowerBound(c, right);
  }
  return right;
}

/**
 * Solve one majorization step along `curAxis` subject to level constraints,
 * mutating `coords[curAxis]` and `e.ordering` in place.
 * @see lib/neatogen/quad_prog_solve.c:constrained_majorization_new_with_gaps
 */
export function constrainedMajorizationNewWithGaps(
  e: CMajEnv, b: Float32Array, coords: Float32Array[],
  curAxis: number, maxIterations: number, levelsGap: number,
): void {
  const place = coords[curAxis]!;
  if (maxIterations <= 0) return;
  const gap = fr(levelsGap);
  ensureMonotonicOrderingWithGaps(place, e.n, e.ordering, e.levels, e.numLevels, gap);
  /* 'ordering' stays sorted by layers, and within a layer by 'place' */
  const c: SolveCtx = {
    e, place, b, lev: computeNodeLevels(e), levelsGap: gap,
    block: [], lowerBound: fr(-BOUND), converged: false,
  };
  for (let counter = 0; counter < maxIterations && !c.converged; counter++) {
    c.converged = true;
    c.lowerBound = fr(-BOUND); /* no lower bound for first level */
    for (let left = 0, right: number; left < e.n; left = right) {
      right = processBlock(c, left);
    }
    orthog1f(e.n, place); /* for numerical stability, keep ||place|| small */
  }
}

/**
 * Build the constrained-majorization environment from a packed matrix.
 * @see lib/neatogen/quad_prog_solve.c:initConstrainedMajorization
 */
export function initConstrainedMajorization(
  packedMat: Float32Array, n: number, ordering: Int32Array,
  levels: Int32Array, numLevels: number,
): CMajEnv {
  return {
    A: unpackMatrix(packedMat, n),
    n,
    fArray1: new Float32Array(n),
    fArray2: new Float32Array(n),
    fArray3: new Float32Array(n),
    fArray4: new Float32Array(n),
    ordering,
    levels,
    numLevels,
  };
}
