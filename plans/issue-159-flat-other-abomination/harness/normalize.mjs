// SPDX-License-Identifier: EPL-2.0
// normalize.mjs <fmt> <file>: rewrites <file> in place so port and native
// outputs compare on content, not on known formatting differences.
//   svg:  drops everything before `<g id="graph0"` (generator comment, the
//         <svg> tag's line breaks).
//   json: parses and re-prints with object keys sorted, every number at 3
//         decimals, 2-space indent.
// Other formats are left as they are.
import fs from 'node:fs';
const [fmt, file] = process.argv.slice(2);
let s = fs.readFileSync(file, 'utf8');
if (fmt === 'svg') {
  const i = s.indexOf('<g id="graph0"');
  if (i >= 0) s = s.slice(i);
} else if (fmt === 'json') {
  try {
    const canon = (v) => {
      if (typeof v === 'number') return Number(v.toFixed(3));
      if (Array.isArray(v)) return v.map(canon);
      if (v && typeof v === 'object') {
        return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]));
      }
      return v;
    };
    s = JSON.stringify(canon(JSON.parse(s)), null, 2) + '\n';
  } catch {
    // not JSON (an error message): compare raw
  }
}
fs.writeFileSync(file, s);
