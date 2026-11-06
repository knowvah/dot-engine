// SPDX-License-Identifier: EPL-2.0
// scratch trace (never committed)
import { libmHypot } from '../../common/libm-hypot.js';
const buf = new DataView(new ArrayBuffer(8));
export function hex(v: number): string {
  if (Number.isNaN(v)) return 'nan';
  if (v === 0) return Object.is(v, -0) ? '-0x0p+0' : '0x0p+0';
  if (!Number.isFinite(v)) return v < 0 ? '-inf' : 'inf';
  buf.setFloat64(0, v);
  const hi = buf.getUint32(0), lo = buf.getUint32(4);
  const s = hi >>> 31 ? '-' : '';
  let e = (hi >>> 20) & 0x7ff;
  const frac = ((hi & 0xfffff).toString(16).padStart(5, '0') + lo.toString(16).padStart(8, '0')).replace(/0+$/, '');
  if (e === 0) return s + 'denorm:' + frac;
  e -= 1023;
  return `${s}0x1${frac ? '.' + frac : ''}p${e >= 0 ? '+' : ''}${e}`;
}
const on = !!process.env.GVTS_T6;
const deep = !!process.env.GVTS_T6_DEEP;
const out: string[] = [];
function w(l: string): void { if (out.length > 20000) flush(); out.push(l); }
export function flush(): void { if (out.length) { process.stderr.write(out.join('\n') + '\n'); out.length = 0; } }
process.on('exit', flush);
export function d(tag: string, v: number): void { if (on) w(`${tag} ${hex(v)}`); }
export function terms(tag: string, t: { i: number; j: number; d: number; w: number }[]): void {
  if (!on) return; w(`${tag} n=${t.length}`);
  t.forEach((x, k) => w(`${tag}[${k}] ${x.i} ${x.j} ${hex(x.d)} ${hex(x.w)}`));
}
export function pos(tag: string, it: number, x: ArrayLike<number>, n: number): void {
  if (on) for (let k = 0; k < n; k++) w(`${tag} ${it} ${k} ${hex(x[2 * k]!)} ${hex(x[2 * k + 1]!)}`);
}
export function step(t: number, ij: number, mu: number, dx: number, dy: number, mag: number, r: number): void {
  if (deep) w(`step ${t} ${ij} ${hex(mu)} ${hex(dx)} ${hex(dy)} ${hex(mag)} ${hex(r)}`);
}
/** T6_HYPOT=libm swaps Math.hypot for the macOS libm model. */
export const hyp: (a: number, b: number) => number = process.env.T6_HYPOT === 'libm' ? libmHypot : Math.hypot;
export const state = { t: 0 };
import { readFileSync } from 'node:fs';
function unhex(h: string): number {
  if (h === '0x0p+0') return 0; if (h === '-0x0p+0') return -0;
  const m = /^(-?)0x1(?:\.([0-9a-f]+))?p([+-]\d+)$/.exec(h)!;
  return (m[1] ? -1 : 1) * (1 + Number.parseInt((m[2] ?? '').padEnd(13, '0'), 16) * 2 ** -52) * 2 ** Number(m[3]);
}
const expTab = new Map<string, number>();
if (process.env.T6_EXP) for (const l of readFileSync(process.env.T6_EXP, 'utf8').trim().split('\n')) {
  const [, a, e] = l.split(' '); expTab.set(a!, unhex(e!));
}
export const expMisses = { n: 0 };
/** T6_EXP=<table> replays macOS exp keyed by its argument's bits. */
export function exp(a: number): number {
  const v = expTab.get(hex(a)); if (v === undefined) { if (expTab.size) expMisses.n++; return Math.exp(a); } return v;
}
