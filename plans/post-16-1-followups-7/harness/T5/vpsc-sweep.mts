// Renders corpus graphs with overlap=vpsc injected, per engine; writes JSON {key: svg|THROW}.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const WT = '/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/9d351319-b84e-43c1-b16b-bf038d507e30/scratchpad/wt/T5';
const { renderSvg } = await import(WT + '/src/index.ts');
const manifest = JSON.parse(fs.readFileSync(WT + '/test/corpus/corpus-manifest.json', 'utf8')) as { id: string; path: string; status: string }[];
const ROOT = path.join(os.homedir(), 'git/graphviz/tests');
const files = manifest.filter((m) => m.status === 'applicable')
  .map((m) => ({ id: m.id, file: path.resolve(ROOT, m.path) }))
  .filter((m) => fs.statSync(m.file).size < Number(process.env.MAXB ?? 6000))
  .slice(0, Number(process.env.LIMIT ?? 120));
const out: Record<string, string> = {};
const KEYS = process.env.KEYS ? new Set(fs.readFileSync(process.env.KEYS, 'utf8').trim().split('\n')) : null;
for (const k of ['log', 'warn', 'error', 'info', 'debug'] as const) console[k] = () => {};
for (const f of files) {
  const src0 = fs.readFileSync(f.file, 'latin1');
  const i = src0.indexOf('{');
  if (i < 0) continue;
  const src = src0.slice(0, i + 1) + ' overlap=vpsc; ' + src0.slice(i + 1);
  for (const eng of ['neato', 'fdp', 'sfdp', 'twopi', 'circo']) {
    if (KEYS && !KEYS.has(`${f.id} ${eng}`)) continue;
    try { out[`${f.id} ${eng}`] = renderSvg(src, eng as never); } catch (e) { out[`${f.id} ${eng}`] = 'THROW ' + (e instanceof Error ? e.message : String(e)); }
  }
}
fs.writeFileSync(process.argv[2]!, JSON.stringify(out));
process.stdout.write(`${Object.keys(out).length} renders\n`);
