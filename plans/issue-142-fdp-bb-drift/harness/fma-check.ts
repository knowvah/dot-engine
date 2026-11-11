// SPDX-License-Identifier: EPL-2.0
// Issue #142: evaluates a contracted site on traced inputs with the port's software fma.
// usage: npx tsx plans/issue-142-fdp-bb-drift/harness/fma-check.ts <a> <b> <c> <d>
//   prints a*b + c*d three ways (hex floats in, %a out): plain, fma(a, b, c*d), fma(c, d, a*b).
//   For `a*b + c` pass d = 0x1p+0.
import { fma } from '../../../src/common/fma.js';

const view = new DataView(new ArrayBuffer(8));
function parseHex(s: string): number {
  const m = /^(-?)0x([01])(?:\.([0-9a-f]*))?p([-+]\d+)$/.exec(s);
  if (!m) throw new Error(`not a hex float: ${s}`);
  const mant = Number(BigInt(`0x${m[2]}${(m[3] ?? '').padEnd(13, '0')}`));
  return (m[1] ? -1 : 1) * mant * 2 ** (Number(m[4]) - 52);
}
function hex(x: number): string {
  view.setFloat64(0, x);
  const hi = view.getUint32(0);
  const exp = (hi >>> 20) & 0x7ff;
  const mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(view.getUint32(4));
  const sign = hi >>> 31 ? '-' : '';
  if (exp === 0 && mant === 0n) return `${sign}0x0p+0`;
  const frac = mant.toString(16).padStart(13, '0').replace(/0+$/, '');
  const e = exp === 0 ? -1022 : exp - 1023;
  return `${sign}0x${exp === 0 ? 0 : 1}${frac ? `.${frac}` : ''}p${e < 0 ? '-' : '+'}${Math.abs(e)}`;
}

const [a, b, c, d] = process.argv.slice(2).map(parseHex) as [number, number, number, number];
console.log(`plain            ${hex(a * b + c * d)}`);
console.log(`fma(a, b, c*d)   ${hex(fma(a, b, c * d))}`);
console.log(`fma(c, d, a*b)   ${hex(fma(c, d, a * b))}`);
