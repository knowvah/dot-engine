import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
const [bin, input, n] = process.argv.slice(2);
const script = fs.readFileSync(input, 'utf8');
const by = {};
for (let i = 0; i < +n; i++) {
  const add = { PAD: 'x'.repeat((i * 37) % 9000) };
  if (i % 2 === 1) add.MallocNanoZone = '0';
  if (i % 5 === 2) add.MallocNanoZone = '1';
  const r = spawnSync(bin, { input: script, env: { ...process.env, ...add }, encoding: 'utf8', maxBuffer: 1 << 26 });
  const h = createHash('sha256').update(r.stdout).digest('hex').slice(0, 12);
  (by[h] ??= []).push([add.MallocNanoZone ?? '-', add.PAD.length].join(':'));
  if (by[h].length === 1 && r.stderr) fs.writeFileSync(`trace-${h}.err`, r.stderr);
}
for (const [h, l] of Object.entries(by)) console.log(h, l.length, l.slice(0, 30).join(' '));
