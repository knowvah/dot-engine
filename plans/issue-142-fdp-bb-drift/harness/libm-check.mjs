// SPDX-License-Identifier: EPL-2.0
// Issue #142: V8's Math.atan2/cos/sin on hex-float inputs, printed as C's %a.
// usage: node libm-check.mjs atan2 <dy> <dx> | cos <x> | sin <x>
const view = new DataView(new ArrayBuffer(8));

/** Parses a C hex float (0x1.8p+1, -0x0p+0). */
function parseHex(s) {
  const m = /^(-?)0x([01])(?:\.([0-9a-f]*))?p([-+]\d+)$/.exec(s);
  if (!m) throw new Error(`not a hex float: ${s}`);
  const mant = Number(BigInt(`0x${m[2]}${(m[3] ?? '').padEnd(13, '0')}`));
  return (m[1] ? -1 : 1) * mant * 2 ** (Number(m[4]) - 52);
}

/** C printf("%a") for a finite double. */
function hex(x) {
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

const [fn, a, b] = process.argv.slice(2);
const x = parseHex(a);
const r = fn === 'atan2' ? Math.atan2(x, parseHex(b)) : fn === 'cos' ? Math.cos(x) : Math.sin(x);
console.log(hex(r));
