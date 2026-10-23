// SPDX-License-Identifier: EPL-2.0
// Warm render timings: node --import tsx timing.ts <bundle> <engine> <ids-file> <out.json>
// Same method as test/corpus/bench.mjs (bundle loaded once, JIT-primed, best of N warm
// renderSvg calls), but takes an engine: bench.mjs is dot-only. Output: { id: ms }.
// Each id: one untimed warm-up, then best of TIMING_RUNS (default 3).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [bundle = '', engine = '', idsFile = '', outFile = ''] = process.argv.slice(2);
const RUNS = Number(process.env.TIMING_RUNS ?? 3);
const ROOT = path.join(os.homedir(), 'git/graphviz/tests');
const REPO = process.env.BD_REPO ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
interface ManifestEntry {
  id: string;
  path: string;
}
const manifest = new Map((JSON.parse(fs.readFileSync(path.join(REPO, 'test/corpus/corpus-manifest.json'), 'utf8')) as ManifestEntry[]).map((m) => [m.id, m]));
function decode(buf: Buffer): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { return buf.toString('latin1'); }
}
const { renderSvg } = (await import(pathToFileURL(bundle).href)) as { renderSvg(src: string, engine: string): string };
for (const k of ['log', 'warn', 'error', 'info'] as const) console[k] = (): void => {};
let prime = 'digraph{rankdir=LR;';
for (let i = 0; i < 60; i++) prime += `n${i}->n${(i + 7) % 60};n${i}->n${(i + 13) % 60};`;
prime += '}';
for (let i = 0; i < 3; i++) renderSvg(prime, engine);
const out: Record<string, number> = {};
for (const id of fs.readFileSync(idsFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean)) {
  const src = decode(fs.readFileSync(path.resolve(ROOT, manifest.get(id)!.path)));
  renderSvg(src, engine);
  let best = Infinity;
  for (let r = 0; r < RUNS; r++) {
    const t = performance.now();
    renderSvg(src, engine);
    best = Math.min(best, performance.now() - t);
  }
  out[id] = Math.round(best * 10) / 10;
  process.stderr.write(`${id} ${out[id]}\n`);
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
