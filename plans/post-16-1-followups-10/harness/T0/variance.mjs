// SPDX-License-Identifier: EPL-2.0
// Part-10 T0: runs every fixture case 8 times (xdot and dot) and reports any case native
// does not repeat. usage: GVBINDIR=<full plugin dir> node variance.mjs <repo root> <out.json>
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [ROOT, OUT] = process.argv.slice(2);
const DOT = path.join(os.homedir(), 'git/graphviz/build/cmd/dot/dot');
const DIRS = [
  ['src/layout/neato/__fixtures__/dim', () => 'neato'],
  ['src/layout/sfdp/__fixtures__/dim', () => 'sfdp'],
  ['src/layout/pack/__fixtures__/cc-reuse', (c) => c],
];
const RUNS = 8;
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);
const report = {};
for (const [rel, engineOf] of DIRS) {
  const dir = path.join(ROOT, rel);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.gv')).sort()) {
    const c = f.slice(0, -3);
    const engine = engineOf(c);
    for (const fmt of ['xdot', 'dot']) {
      const seen = {};
      const rcs = new Set();
      for (let i = 0; i < RUNS; i++) {
        // Vary the environment size: VPSC and hash orders can follow heap layout.
        const env = { ...process.env, PAD: 'x'.repeat(i * 257) };
        const r = spawnSync(DOT, [`-K${engine}`, `-T${fmt}`, path.join(dir, f)], { encoding: 'latin1', env, maxBuffer: 1 << 26 });
        rcs.add(r.status);
        const h = hash(`${r.stdout}\n--stderr--\n${r.stderr}`);
        seen[h] = (seen[h] ?? 0) + 1;
      }
      const fix = hash(`${fs.readFileSync(path.join(dir, `${c}.${fmt}`), 'latin1')}\n--stderr--\n${fs.readFileSync(path.join(dir, `${c}.stderr`), 'latin1')}`);
      report[`${rel.split('/')[2]}/${c}/${fmt}`] = { distinct: Object.keys(seen).length, rcs: [...rcs], fixtureSeen: seen[fix] ?? 0, seen };
    }
  }
}
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
const bad = Object.entries(report).filter(([, v]) => v.distinct !== 1 || v.fixtureSeen !== RUNS || v.rcs.some((x) => x !== 0));
console.log('cases', Object.keys(report).length, 'variant-or-nonzero', bad.length);
for (const [k, v] of bad) console.log(k, JSON.stringify(v));
