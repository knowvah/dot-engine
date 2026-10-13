// SPDX-License-Identifier: EPL-2.0

/**
 * Arithmetic primitives shared with the C reference build.
 *
 * @see lib/common/arith.h
 */

/**
 * C rounding: round half **away from zero**.
 *
 * This is the single shared implementation of the one rounding deviation that
 * separates this port from C. Both C spellings agree on it:
 *
 * - libm `round()` — "rounding halfway cases away from zero" (C99 7.12.9.6),
 *   used directly across `lib/` (e.g. `lib/dotgen/compound.c:41`,
 *   `lib/pack/pack.c:435`, `lib/dotgen/position.c:966`).
 * - the `ROUND` macro — `((f>=0)?(int)(f + .5):(int)(f - .5))`
 *   (`lib/common/arith.h:48`), whose truncating casts also break ties away
 *   from zero. `POINTS(a_inches)` (`lib/common/geom.h:62`) is `ROUND` too.
 *
 * JavaScript's `Math.round` breaks ties toward +∞ (`Math.round(-4.5) === -4`,
 * C `round(-4.5) === -5`), so it diverges by 1 on **every exact negative
 * half-integer**. Layout coordinates are routinely negative (center-origin
 * engines, cluster walls left of an endpoint, port offsets from a node centre)
 * and are often exact integers or halves, so such ties are ordinary, not
 * exotic.
 *
 * Use this for every site that mirrors a C `round()`/`ROUND()`/`POINTS()`,
 * including sites whose argument happens to be non-negative today — it costs
 * nothing and states the intent. Do **not** use it where C rounds by some
 * other rule (`(int)` truncation, `floor`, printf `%.0f` banker's rounding).
 *
 * @see lib/common/arith.h:48 (ROUND)
 * @see C99 7.12.9.6 (round)
 */
export function cround(v: number): number {
  return v >= 0 ? Math.floor(v + 0.5) : Math.ceil(v - 0.5);
}

const INT64_MAX = 2n ** 63n - 1n;
const INT64_MIN = -(2n ** 63n);
const TWO_POW_63 = 2 ** 63;

/**
 * `ROUND(f)` as the native arm64 build computes it where clang vectorises the
 * conversion: `fcvtzs.2d` (double → int64, saturating, NaN → 0) followed by
 * `xtn.2s` / `uzp1.4s`, which keep the LOW 32 bits. The `(int)` cast of an
 * out-of-range double is undefined in C; this is the oracle binary's
 * behaviour (objdump of libgvc `_gvRenderJobs`, the inlined
 * init_job_pagination: job->width/height and pageBoundingBox). Identical to
 * {@link cround} whenever the result fits in an int; only these vectorised
 * sites use it — scalar ROUND sites compile to `fcvtzs w` (saturate at int32).
 * @see lib/common/emit.c:init_job_pagination (job->width, pageBoundingBox)
 */
export function croundNarrow32(v: number): number {
  const r = cround(v);
  let i64: bigint;
  if (Number.isNaN(r)) i64 = 0n;
  else if (r >= TWO_POW_63) i64 = INT64_MAX;
  else if (r < -TWO_POW_63) i64 = INT64_MIN;
  else i64 = BigInt(r);
  return Number(BigInt.asIntN(32, i64));
}

/**
 * Degrees to radians in C's operation order, `(deg)/180.0 * M_PI`.
 * `deg * Math.PI / 180` rounds differently for some angles (e.g. 33°).
 * @see lib/common/arith.h:49 (RADIANS)
 */
export function RADIANS(deg: number): number {
  return (deg / 180.0) * Math.PI;
}
