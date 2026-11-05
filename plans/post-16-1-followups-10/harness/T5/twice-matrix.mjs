// usage: node twice-matrix.mjs <bundle> <ids-file> <out.json>
// Part 10 T5: ids in EXCLUDE are skipped. graphs-b56 labels read freed memory in native's write_plain
// (lib/common/output.c:canon -> lib/cgraph/write.c:_agstrcanon returns its argument, then agstrfree frees it),
// so native's second render varies per process and is not a repeatability measurement.
const EXCLUDE = new Set(['graphs-b56']);
// Per id, engine and format: does a second layout+render equal the first, native vs port?
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const [bundle, idsFile, out] = process.argv.slice(2);
const here = path.dirname(new URL(import.meta.url).pathname);
const NATIVE = process.env.TWICE_NATIVE ?? path.join(here, 'twice-native');
const FULL = '/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all';
const ENGINES = ['dot', 'neato', 'fdp', 'sfdp', 'circo', 'twopi', 'osage', 'patchwork'];
const FORMATS = ['plain', 'xdot'];
const manifest = JSON.parse(fs.readFileSync('/Users/scottseely/git/knowvah/dot-engine/test/corpus/corpus-manifest.json', 'utf8'));
const byId = new Map(manifest.map((e) => [e.id, e]));
const root = path.join(os.homedir(), 'git/graphviz/tests');
const JOB = `
import fs from 'node:fs';
const [bundle,file,engine,fmt]=process.argv.slice(2);
const DE=await import(bundle);console.warn=()=>{};console.error=()=>{};
const g=DE.parse(fs.readFileSync(file,'latin1'));
const a=DE.render(g,fmt,{engine});
try{const b=DE.render(g,fmt,{engine});process.stdout.write(a===b?'SAME':'DIFF')}catch(e){process.stdout.write('THROW2 '+String(e.message).slice(0,70))}
process.exit(0)`;
const jobFile = path.join(os.tmpdir(), `twice-job-${process.pid}.mjs`);
fs.writeFileSync(jobFile, JOB);
const run = (cmd, args, env) => new Promise((res) => {
  const c = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, ...env } });
  let o = '';
  const t = setTimeout(() => c.kill('SIGKILL'), 30000);
  c.stdout.on('data', (d) => { o += d; });
  c.on('close', (rc) => { clearTimeout(t); res(o.trim() || `ERR rc=${rc}`); });
});
const jobs = [];
for (const line of fs.readFileSync(idsFile, 'utf8').split('\n')) {
  const id = line.trim().split(/\s+/)[0];
  if (!id || EXCLUDE.has(id)) continue;
  const file = path.resolve(root, byId.get(id).path);
  if (fs.statSync(file).size > 20000) continue;
  for (const engine of ENGINES) for (const fmt of FORMATS) jobs.push({ id, engine, fmt, file });
}
const results = [];
let next = 0;
await Promise.all(Array.from({ length: 2 }, async () => {
  while (next < jobs.length) {
    const j = jobs[next++];
    const n = await run(NATIVE, [j.file, j.engine, j.fmt], { GVBINDIR: FULL });
    const p = await run(process.execPath, [jobFile, bundle, j.file, j.engine, j.fmt], {});
    results.push({ id: j.id, engine: j.engine, fmt: j.fmt, native: n, port: p });
  }
}));
fs.writeFileSync(out, `${JSON.stringify(results, null, 0)}\n`);
const tab = {};
for (const r of results) {
  const k = `${r.engine}/${r.fmt}`;
  tab[k] ??= { nSAME: 0, nDIFF: 0, nOther: 0, pSAME: 0, pDIFF: 0, pThrow: 0, pOther: 0, nSameButPortNot: 0 };
  const t = tab[k];
  if (r.native === 'SAME') t.nSAME++; else if (r.native === 'DIFF') t.nDIFF++; else t.nOther++;
  if (r.port === 'SAME') t.pSAME++; else if (r.port === 'DIFF') t.pDIFF++; else if (r.port.startsWith('THROW2')) t.pThrow++; else t.pOther++;
  if (r.native === 'SAME' && r.port !== 'SAME') t.nSameButPortNot++;
}
console.table(tab);

console.log('native SAME total', results.filter((r) => r.native === 'SAME').length, 'of', results.length);
