// SPDX-License-Identifier: EPL-2.0
/**
 * Gaussian elimination with partial pivoting for the small Newton systems of
 * Kamada-Kawai (`move_node`).
 *
 * @see lib/neatogen/solve.c
 */

/** Pivots below this make the system ill-conditioned. @see solve.c:solve */
const MIN_PIVOT = 1.0e-10;

/** @see lib/neatogen/solve.c:SWAP */
function swap(x: Float64Array, i: number, j: number): void {
  const t = x[i]!;
  x[i] = x[j]!;
  x[j] = t;
}

/** Returns false on an unusable pivot. Eliminates unknown `i`. */
function eliminate(a: Float64Array, c: Float64Array, n: number, i: number): boolean {
  let amax = 0.0;
  let istar = 0;
  for (let ii = i; ii < n; ii++) {
    const dum = Math.abs(a[ii * n + i]!);
    if (dum < amax) continue;
    istar = ii;
    amax = dum;
  }
  if (amax < MIN_PIVOT) return false;
  for (let j = i; j < n; j++) swap(a, istar * n + j, i * n + j);
  swap(c, istar, i);
  for (let ii = i + 1; ii < n; ii++) {
    const pivot = a[ii * n + i]! / a[i * n + i]!;
    c[ii]! -= pivot * c[i]!;
    for (let j = 0; j < n; j++) a[ii * n + j] = a[ii * n + j]! - pivot * a[i * n + j]!;
  }
  return true;
}

/**
 * Solve a*b = c (a is n*n row-major). On success `a` and `c` are restored and
 * `b` holds the solution; when ill-conditioned `b` is untouched. C prints
 * "ill-conditioned" to stdout; a library has no stdout, so it is a warning.
 * @see lib/neatogen/solve.c:solve
 */
export function solve(a: Float64Array, b: Float64Array, c: Float64Array, n: number): void {
  const asave = Float64Array.from(a);
  const csave = Float64Array.from(c);
  let ok = true;
  for (let i = 0; i < n - 1 && ok; i++) ok = eliminate(a, c, n, i);
  if (!ok || Math.abs(a[n * n - 1]!) < MIN_PIVOT) {
    console.warn('ill-conditioned');
    return;
  }
  b[n - 1] = c[n - 1]! / a[n * n - 1]!;
  for (let k = 0; k < n - 1; k++) {
    const m = n - k - 2;
    b[m] = c[m]!;
    for (let j = m + 1; j < n; j++) b[m]! -= a[m * n + j]! * b[j]!;
    b[m]! /= a[m * n + m]!;
  }
  c.set(csave);
  a.set(asave);
}
