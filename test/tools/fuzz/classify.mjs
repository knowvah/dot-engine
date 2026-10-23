// SPDX-License-Identifier: EPL-2.0
// Failure classes of a fuzz run: node classify.mjs <outdir>
import fs from 'node:fs';
const dir = process.argv[2];
const STYLE_BR = /<(b|i|u|o|s|sub|sup|font)\b[^>]*>(?:(?!<\/\1>)[\s\S])*<br/i;
function classes(r) {
  const c = new Set();
  const rest = [...r.pErr];
  const missing = [];
  for (const l of r.nErr) { const i = rest.indexOf(l); if (i >= 0) rest.splice(i, 1); else missing.push(l); }
  const extra = rest;
  for (const l of [...missing, ...extra]) {
    if (/COMPARE THREW/.test(l)) c.add('compare-throw');
    else if (/is not a known color/.test(l)) c.add('37-unknown-color');
    else if (/no value for width/.test(l)) c.add('41-width');
    else if (/invalid token|not well-formed|undefined entity/.test(l)) c.add('40-invalid-token');
    else if (/[^\x00-\x7f]/.test(l) && /sides/.test(l)) c.add('A5-sides-nonascii');
    else c.add(`stderr:${l.slice(0, 50)}`);
  }
  if (!r.svgOk) c.add(STYLE_BR.test(r.lbl) ? 'svg(35-br-in-style?)' : 'svg-other');
  return [...c];
}
const out = {};
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort()) {
  const rows = fs.readFileSync(`${dir}/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const tally = {};
  for (const r of rows) for (const k of classes(r)) tally[k] = (tally[k] ?? 0) + 1;
  out[f] = { bad: rows.length, classes: tally };
}
console.log(JSON.stringify(out, null, 1));
