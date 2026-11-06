// SPDX-License-Identifier: EPL-2.0
// scratch sweep: run the port in each pow mode against the native oracle over a list of ids
import { readFileSync, appendFileSync, existsSync, statSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { compareXdot } from './test/golden/compare-xdot.js';
const WT = process.env.T2_WT!;
const SC = process.env.T2_SC!;
const [, , mode, listFile, outFile, parStr, capStr] = process.argv;
const par = Number(parStr ?? 6), cap = Number(capStr ?? 120000);
const CORPUS = join(homedir(), 'git/graphviz/tests');
const DOT = join(homedir(), 'git/graphviz/build/cmd/dot/dot');
const GV = process.env.T2_ORACLE_GVBINDIR!;
const parity = JSON.parse(readFileSync(join(WT, 'test/corpus/parity.json'), 'utf8')) as { results: { id: string; path: string }[] };
const pathOf = new Map(parity.results.map((r) => [r.id, r.path]));
const ids = readFileSync(listFile!, 'utf8').split('\n').filter(Boolean);
const done = new Set<string>();
if (existsSync(outFile!)) for (const l of readFileSync(outFile!, 'utf8').split('\n')) if (l) done.add((JSON.parse(l) as { id: string }).id);
const queue = ids.filter((i) => !done.has(i));
function oracle(p: string): string {
  const r = spawnSync(DOT, ['-Ksfdp', '-Txdot', p], { env: { ...process.env, GVBINDIR: GV }, encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 30 });
  return r.stdout;
}
function port(p: string): Promise<{ stdout: string; stderr: string; status: number | null; ms: number; to: boolean }> {
  const t0 = Date.now();
  return new Promise((res) => {
    const c = spawn(process.execPath, ['--import', 'tsx', join(SC, 'port/test/corpus/render-one-xdot.ts'), p, 'sfdp'], {
      cwd: join(SC, 'port'), env: { ...process.env, T2_POW: mode, T2_ADDON: join(SC, 'addon/libmpow.node') }, detached: true,
    });
    let stdout = '', stderr = '', to = false;
    const timer = setTimeout(() => { to = true; try { process.kill(-c.pid!, 'SIGKILL'); } catch { /* gone */ } }, cap);
    c.stdout.on('data', (d: Buffer) => (stdout += d));
    c.stderr.on('data', (d: Buffer) => (stderr += d));
    c.on('close', (status) => { clearTimeout(timer); res({ stdout, stderr, status, ms: Date.now() - t0, to }); });
  });
}
async function worker(): Promise<void> {
  for (;;) {
    const id = queue.shift();
    if (id === undefined) return;
    const p = join(CORPUS, pathOf.get(id)!);
    const o = oracle(p);
    const r = await port(p);
    let row: Record<string, unknown> = { id, ms: r.ms, size: statSync(p).size };
    if (r.to) row.status = 'timeout';
    else if (r.status !== 0) { row.status = 'port-error'; row.err = r.stderr.slice(0, 200); }
    else {
      const c = compareXdot(r.stdout, o, 0.5);
      row.status = c.pass ? 'pass' : 'diverged';
      row.nDiffs = c.diffs.length;
      row.bytes = r.stdout === o;
      row.bytesNoWrap = r.stdout.replace(/\\\n/g, '') === o.replace(/\\\n/g, '');
      if (!c.pass && c.diffs[0]) row.first = `${c.diffs[0].object} ${c.diffs[0].path}: ${c.diffs[0].actual} vs ${c.diffs[0].expected}`;
    }
    appendFileSync(outFile!, JSON.stringify(row) + '\n');
  }
}
await Promise.all(Array.from({ length: par }, worker));
