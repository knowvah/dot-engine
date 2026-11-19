// SPDX-License-Identifier: EPL-2.0
// Issue #180: exact svg body equality with native, for base and head.
//   [ENGINES=dot,neato,fdp] node bodyeq.mjs <base.mjs> <head.mjs> <harness-dir>
// body = the text from the first '<g id=' on (the port's header comment and
// <svg> attribute wrapping differ from native's and are not this issue's).
// Columns: probe, engine, base EQ/NE, head EQ/NE, then the count of lines in
// native or the output that the other lacks (set difference, so a repeated
// line such as '</g>' counts once). Native: <harness-dir>/native/<probe>.<engine>.svg.
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const [base, head, dir] = process.argv.slice(2);
const RENDER1 = fileURLToPath(new URL('./render1.mjs', import.meta.url));
const body = (s) => s.slice(s.indexOf('<g id='));
const r = (b, e, f) => execFileSync(process.execPath, [RENDER1, b, e, 'svg', f], { maxBuffer: 1 << 26 }).toString();
const cnt = (a, b) => {
  const sa = new Set(a.split('\n')), sb = new Set(b.split('\n'));
  let n = 0;
  for (const l of sa) if (!sb.has(l)) n++;
  for (const l of sb) if (!sa.has(l)) n++;
  return n;
};
console.log('probe\tengine\tbase\thead\tbaseLines\theadLines');
const engines = (process.env.ENGINES ?? 'dot,neato,fdp').split(',');
for (const p of readdirSync(`${dir}/probes`).filter((f) => f.endsWith('.gv')).sort()) {
  for (const e of engines) {
    const nat = body(readFileSync(`${dir}/native/${p}.${e}.svg`, 'utf8'));
    const b = body(r(base, e, `${dir}/probes/${p}`));
    const h = body(r(head, e, `${dir}/probes/${p}`));
    console.log([p, e, b === nat ? 'EQ' : 'NE', h === nat ? 'EQ' : 'NE', cnt(nat, b), cnt(nat, h)].join('\t'));
  }
}
