// SPDX-License-Identifier: EPL-2.0
// scratch trace (never committed)
import { createRequire } from 'node:module';
export const MODE: string = process.env.T2_POW ?? 'arm';
export const libm: (x: number, y: number) => number = MODE === 'libm'
  ? (createRequire(import.meta.url)(process.env.T2_ADDON!) as { pow: (x: number, y: number) => number }).pow
  : () => NaN;
const buf = new DataView(new ArrayBuffer(8));
export function hex(v: number): string {
  if (Number.isNaN(v)) return 'nan';
  if (v === 0) return Object.is(v, -0) ? '-0x0p+0' : '0x0p+0';
  if (!Number.isFinite(v)) return v < 0 ? '-inf' : 'inf';
  buf.setFloat64(0, v);
  const hi = buf.getUint32(0), lo = buf.getUint32(4);
  const s = hi >>> 31 ? '-' : '';
  let e = (hi >>> 20) & 0x7ff;
  let frac = ((hi & 0xfffff).toString(16).padStart(5, '0') + lo.toString(16).padStart(8, '0')).replace(/0+$/, '');
  if (e === 0) return s + 'denorm:' + frac;
  e -= 1023;
  return `${s}0x1${frac ? '.' + frac : ''}p${e >= 0 ? '+' : ''}${e}`;
}
const on = !!process.env.GVTS_T2;
const out: string[] = [];
function w(l: string): void { if (out.length > 20000) flush(); out.push(l); }
export function flush(): void { if (out.length) { process.stderr.write(out.join('\n') + '\n'); out.length = 0; } }
process.on('exit', flush);
export function d(tag: string, v: number): void { if (on) w(`${tag} ${hex(v)}`); }
export function i(tag: string, v: number): void { if (on) w(`${tag} ${v}`); }
export function x(tag: string, a: ArrayLike<number>, n: number): void { if (on) for (let k = 0; k < n; k++) w(`${tag}[${k}] ${hex(a[k]!)}`); }
export function m(tag: string, A: { m: number; n: number; nz: number; ia: ArrayLike<number>; ja: ArrayLike<number>; a?: ArrayLike<number> | null; type: number }): void {
  if (!on) return;
  w(`${tag} m=${A.m} n=${A.n} nz=${A.nz}`);
  for (let k = 0; k <= A.m; k++) w(`${tag}.ia[${k}] ${A.ia[k]}`);
  for (let k = 0; k < A.nz; k++) w(`${tag}.ja[${k}] ${A.ja[k]}`);
  if (A.a) for (let k = 0; k < A.nz; k++) w(`${tag}.a[${k}] ${hex(A.a[k]!)}`);
}

const deep = !!process.env.GVTS_T2_DEEP;
export const st = { iter: 0 };
export function dd(tag: string, a: number, b: number, v: number): void { if (deep) w(`${tag} ${a} ${b} ${hex(v)}`); }
export function pw(x: number, y: number, r: number): void { if (deep) w(`pow ${hex(x)} ${hex(y)} ${hex(r)}`); }

import { readFileSync } from 'node:fs';
function unhex(h: string): number {
  const m = /^(-?)0x1(?:\.([0-9a-f]+))?p([+-]\d+)$/.exec(h)!;
  const frac = (m[2] ?? '').padEnd(13, '0');
  return (m[1] ? -1 : 1) * (1 + Number.parseInt(frac, 16) * 2 ** -52) * 2 ** Number(m[3]);
}
const ov = new Map<string, number>();
if (process.env.T2_OVERRIDES) for (const l of readFileSync(process.env.T2_OVERRIDES, 'utf8').split('\n')) {
  const f = l.trim().split(/\s+/);
  if (f.length === 3) ov.set(f[0]! + ' ' + f[1]!, unhex(f[2]!));
}
export function override(x: number, y: number): number | undefined {
  if (ov.size === 0) return undefined;
  return ov.get(hex(x) + ' ' + hex(y));
}
