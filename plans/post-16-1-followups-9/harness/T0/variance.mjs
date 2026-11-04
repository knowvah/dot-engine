// SPDX-License-Identifier: EPL-2.0
// Part-9 T0: runs every fixture case 8 times and reports any case native does not repeat.
// usage: GVBINDIR=<full plugin dir> node variance.mjs <repo root> <out.json>
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [ROOT, OUT] = process.argv.slice(2);
const DOT = path.join(os.homedir(), 'git/graphviz/build/cmd/dot/dot');
const DIRS = [
  ['src/layout/neato/__fixtures__/multi-component-attrs', 'neato'],
  ['src/layout/circo/__fixtures__/root', 'circo'],
  ['src/layout/sfdp/__fixtures__/start-warning', 'sfdp'],
];
const RUNS = 8;
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);
const report = {};
for (const [rel, engine] of DIRS) {
  const dir = path.join(ROOT, rel);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.gv')).sort()) {
    const c = f.slice(0, -3);
    const seen = {};
    let rcs = new Set();
    for (let i = 0; i < RUNS; i++) {
      // Vary the environment size: VPSC and hash orders can follow heap layout.
      const env = { ...process.env, PAD: 'x'.repeat(i * 257) };
      const r = spawnSync(DOT, [`-K${engine}`, '-Txdot', path.join(dir, f)], { encoding: 'latin1', env, maxBuffer: 1 << 26 });
      rcs.add(r.status);
      const h = hash(`${r.stdout}\n--stderr--\n${r.stderr}`);
      seen[h] = (seen[h] ?? 0) + 1;
    }
    const fix = hash(`${fs.readFileSync(path.join(dir, `${c}.xdot`), 'latin1')}\n--stderr--\n${fs.readFileSync(path.join(dir, `${c}.xdot.stderr`), 'latin1')}`);
    report[`${engine}/${c}`] = { distinct: Object.keys(seen).length, rcs: [...rcs], fixtureSeen: seen[fix] ?? 0, seen };
  }
}
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
const bad = Object.entries(report).filter(([, v]) => v.distinct !== 1 || v.rcs.some((x) => x !== 0));
console.log('cases', Object.keys(report).length, 'variant-or-nonzero', bad.length);
for (const [k, v] of bad) console.log(k, JSON.stringify(v));
