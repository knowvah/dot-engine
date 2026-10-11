// SPDX-License-Identifier: EPL-2.0
/**
 * @see lib/pathplan/solvers.c
 *
 * The native oracle's libpathplan is compiled by clang with the default
 * `-ffp-contract=on`, which fuses five multiply-adds in this file into single
 * fmadd/fmsub/fnmsub instructions (solve2 is inlined into solve3). Those sites
 * are mirrored with the software `fma`; every other operation is plain IEEE
 * double, in C's evaluation order. Contraction map:
 * .agent-notes/pathplan-fma-contraction-map.md.
 */

import { fma } from '../common/fma.js';

/** @see lib/pathplan/solvers.c:EPS */
const EPS = 1e-7;

/** @see lib/pathplan/solvers.c:AEQ0 */
function aeq0(x: number): boolean {
  return x < EPS && x > -EPS;
}

/**
 * Solve cubic coeff[3]*x^3 + coeff[2]*x^2 + coeff[1]*x + coeff[0] = 0.
 * Returns the root count; 4 means every x satisfies.
 * @see lib/pathplan/solvers.c:solve3
 */
export function solve3(coeff: number[], roots: number[]): number {
  const a = coeff[3], b = coeff[2], c = coeff[1], d = coeff[0];
  if (aeq0(a)) return solve2(coeff, roots);
  const bOver3a = b / (3 * a), cOverA = c / a, dOverA = d / a;

  let p = bOver3a * bOver3a;
  // clang -ffp-contract=on: fnmul+fmadd at solvers.c:41 (`2*b_over_3a*p` fused,
  // `b_over_3a*c_over_a` rounded; `+ d_over_a` is a separate rounded add)
  const q = dOverA + fma(2 * bOver3a, p, -(bOver3a * cOverA));
  p = cOverA / 3 - p;
  // clang -ffp-contract=on: fmadd at solvers.c:43 (q*q fused, 4*p*p*p rounded)
  const disc = fma(q, q, 4 * p * p * p);

  let rootn: number;
  if (disc < 0) {
    // clang -ffp-contract=on: fnmsub at solvers.c:46 (`-disc + q*q`)
    const r = 0.5 * Math.sqrt(fma(q, q, -disc));
    const theta = Math.atan2(Math.sqrt(-disc), -q);
    const temp = 2 * Math.cbrt(r);
    roots[0] = temp * Math.cos(theta / 3);
    roots[1] = temp * Math.cos((theta + Math.PI + Math.PI) / 3);
    roots[2] = temp * Math.cos((theta - Math.PI - Math.PI) / 3);
    rootn = 3;
  } else {
    const alpha = 0.5 * (Math.sqrt(disc) - q);
    const beta = -q - alpha;
    roots[0] = Math.cbrt(alpha) + Math.cbrt(beta);
    if (disc > 0) rootn = 1;
    else { roots[1] = roots[2] = -0.5 * roots[0]; rootn = 3; }
  }

  for (let i = 0; i < rootn; i++) roots[i] -= bOver3a;
  return rootn;
}

/** @see lib/pathplan/solvers.c:solve2 */
function solve2(coeff: number[], roots: number[]): number {
  const a = coeff[2], b = coeff[1], c = coeff[0];
  if (aeq0(a)) return solve1(coeff, roots);
  const bOver2a = b / (2 * a);
  const cOverA = c / a;

  // clang -ffp-contract=on: fmadd at solvers.c:80 (`b_over_2a*b_over_2a - c_over_a`)
  const disc = fma(bOver2a, bOver2a, -cOverA);
  if (disc < 0) {
    return 0;
  } else if (disc > 0) {
    roots[0] = -bOver2a + Math.sqrt(disc);
    // clang -ffp-contract=on: fnmsub at solvers.c:85 (`-2*b_over_2a - roots[0]`)
    roots[1] = fma(-2, bOver2a, -roots[0]);
    return 2;
  }
  roots[0] = -bOver2a;
  return 1;
}

/** @see lib/pathplan/solvers.c:solve1 (no contraction) */
function solve1(coeff: number[], roots: number[]): number {
  const a = coeff[1], b = coeff[0];
  if (aeq0(a)) {
    if (aeq0(b)) return 4;
    return 0;
  }
  roots[0] = -b / a;
  return 1;
}
