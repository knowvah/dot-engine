// SPDX-License-Identifier: EPL-2.0

/**
 * `cos`/`sin` as the native build host's libm computes them, at the only
 * inputs Graphviz feeds with constant arguments: the corner angles
 * 2π·(i ∓ 0.5)/8 of neatosplines.c's circumscribed ellipse 8-gon.
 *
 * V8's Math.sin/Math.cos (fdlibm) are not correctly rounded everywhere;
 * at 9π/8 Math.sin returns -0.3826834323650896 where the reference libm
 * (macOS arm64 libSystem) returns the correctly rounded -0.38268343236508967.
 * The ulp moves an obstacle corner off its node's centre line, which flips
 * knife-edge triangulations in the multispline router. The table holds the
 * host values for those nine angles (printed with `%a` by a clang -O2
 * harness of the same expression, which also reproduces the oracle's
 * makeObstacle vertices); any other input falls back to Math.cos/Math.sin.
 *
 * @see lib/neatogen/neatosplines.c:circumscribed_polygon_corner_about_ellipse
 * @see docs/known-divergences.md (host libm)
 */

/** angle → [cos, sin] from the host libm, angles 2π·(k + 0.5)/8, k = -1..7. */
const OCTAGON_TRIG: ReadonlyMap<number, readonly [number, number]> = new Map([
  [-0.39269908169872414, [0.9238795325112867, -0.3826834323650898]],
  [0.39269908169872414, [0.9238795325112867, 0.3826834323650898]],
  [1.1780972450961724, [0.38268343236508984, 0.9238795325112867]],
  [1.9634954084936207, [-0.3826834323650897, 0.9238795325112867]],
  [2.748893571891069, [-0.9238795325112867, 0.3826834323650899]],
  [3.5342917352885173, [-0.9238795325112868, -0.38268343236508967]],
  [4.319689898685965, [-0.38268343236509034, -0.9238795325112865]],
  [5.105088062083414, [0.38268343236509, -0.9238795325112866]],
  [5.890486225480862, [0.9238795325112865, -0.3826834323650904]],
] as const);

/** libm `cos(x)` of the native build host (table above, else Math.cos). */
export function libmCos(x: number): number {
  return OCTAGON_TRIG.get(x)?.[0] ?? Math.cos(x);
}

/** libm `sin(x)` of the native build host (table above, else Math.sin). */
export function libmSin(x: number): number {
  return OCTAGON_TRIG.get(x)?.[1] ?? Math.sin(x);
}
