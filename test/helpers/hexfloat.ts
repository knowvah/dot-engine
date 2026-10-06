// SPDX-License-Identifier: EPL-2.0
/** Parse a C `%a` hex-float string ("0x1.8p+1", "-0x0p+0", "inf", "nan"). */
export function parseHexFloat(s: string): number {
  const t = s.trim().toLowerCase();
  if (t === 'inf' || t === '+inf') return Infinity;
  if (t === '-inf') return -Infinity;
  if (t === 'nan' || t === '-nan') return NaN;
  const m = /^([+-]?)0x([0-9a-f]+)(?:\.([0-9a-f]*))?p([+-]?\d+)$/.exec(t);
  if (m === null) throw new Error(`not a hex float: ${s}`);
  const frac = m[3] ?? '';
  let mant = 0n;
  for (const ch of m[2]! + frac) mant = mant * 16n + BigInt(parseInt(ch, 16));
  const exp = parseInt(m[4]!, 10) - 4 * frac.length;
  // mant fits in 53 bits for every %a output, so Number(mant) is exact; scale
  // in two steps so subnormal exponents (< -1022) don't underflow early.
  let v = Number(mant);
  const half = Math.trunc(exp / 2);
  v = v * 2 ** half * 2 ** (exp - half);
  return m[1] === '-' ? -v : v;
}
