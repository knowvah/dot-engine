// SPDX-License-Identifier: EPL-2.0

/**
 * Software fused multiply-add: fma(a, b, c) = round(a·b + c) with a
 * single rounding, matching the arm64 fmadd/fmsub instructions that
 * clang's default -ffp-contract=on emits for the C reference build
 * (verified by disassembling the Homebrew graphviz 15.0.0 fdp plugin:
 * doRep contracts `x*x + y*y` and `disp += delta*force`).
 *
 * Dekker two-product + Knuth two-sum; exact for the finite,
 * non-overflowing magnitudes the layout engines produce. The final
 * add can double-round only when (err + e) lands exactly on a
 * half-ULP boundary of s — not observed for any supported input
 * (validated against a full-precision C oracle).
 *
 * A non-finite product or addend short-circuits to `a * b + c` (or the
 * non-finite `c` when a and b are finite) before the split: the split's `a·b - p` terms turn an
 * infinite operand into Inf - Inf = NaN where hardware fmadd gives ±Inf.
 *
 * Per Boldo & Muller, "Some functions computable with a fused-mac"
 * (IEEE Trans. Computers, 2011) — the exact emulation needs
 * round-to-odd; this is the standard approximation without it.
 */

/** Dekker splitter: 2^27 + 1. */
const SPLIT = 134217729;

/**
 * round(a·b + c) with one rounding (fmadd).
 */
export function fma(a: number, b: number, c: number): number {
  const p = a * b;
  /* Non-finite product or addend: the IEEE fmadd result is p + c, except
   * that a finite a·b which merely overflowed p yields the non-finite c. */
  if (!Number.isFinite(p) || !Number.isFinite(c)) {
    return Number.isFinite(a) && Number.isFinite(b) && !Number.isFinite(c) ? c : p + c;
  }

  /* Dekker two-product: p + err == a·b exactly */
  const at = SPLIT * a;
  const ahi = at - (at - a);
  const alo = a - ahi;
  const bt = SPLIT * b;
  const bhi = bt - (bt - b);
  const blo = b - bhi;
  const e = ((ahi * bhi - p) + ahi * blo + alo * bhi) + alo * blo;

  /* Knuth two-sum: s + err == p + c exactly */
  const s = p + c;
  const bv = s - p;
  const err = (p - (s - bv)) + (c - bv);

  return s + (err + e);
}

/**
 * round(c − a·b) with one rounding (fmsub with negated product,
 * i.e. the arm64 `fmsub d, a, b, c` semantics).
 */
export function fms(a: number, b: number, c: number): number {
  return fma(-a, b, c);
}
