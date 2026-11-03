import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
const [harness, input, outDir, nStr] = process.argv.slice(2);
const n = Number(nStr);
const script = fs.readFileSync(input, 'utf8');
fs.mkdirSync(outDir, { recursive: true });
const seen = new Map();
for (let i = 0; i < n; i++) {
  const add = {};
  if (i % 2 === 1) add.MallocNanoZone = '0';
  if (i % 5 === 2) add.MallocNanoZone = '1';
  add.PAD = 'x'.repeat((i * 37) % 9000);
  const r = spawnSync(harness, { input: script, env: { ...process.env, ...add }, encoding: 'utf8', maxBuffer: 1 << 26 });
  const h = createHash('sha256').update(r.stdout).digest('hex').slice(0, 12);
  const key = `${r.status}:${h}`;
  if (!seen.has(key)) { seen.set(key, { count: 0, first: { i, nano: add.MallocNanoZone ?? null, pad: add.PAD.length } }); fs.writeFileSync(`${outDir}/${h}.out`, r.stdout); }
  seen.get(key).count++;
}
console.log(JSON.stringify([...seen], null, 0));
