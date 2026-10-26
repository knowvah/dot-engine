// SPDX-License-Identifier: EPL-2.0
// Structured fuzz of HTML labels: native dot vs the port, stderr bytes and SVG.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { normalizeStderrLines } from '../lib/stderr.js';
// FUZZ_REPO = repo or worktree under test (default: this checkout).
const REPO = process.env.FUZZ_REPO ?? new URL('../../..', import.meta.url).pathname.replace(/\/$/, '');
const { renderSvg } = (await import(`${REPO}/src/index.ts`)) as { renderSvg(src: string, engine: string): string };
const { compareSvg } = (await import(`${REPO}/test/golden/compare.ts`)) as {
  compareSvg(a: string, b: string, mode: string): { pass: boolean };
};
const ARGV_OUT = 4;
let seed = Number(process.argv[2] ?? 1);
const N = Number(process.argv[3] ?? 300);
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)]!;
const NOISE = ['', '', ' ', 'x', '\n', '\t', '<!-- c -->', 'y z', '&amp;', '&#9;', '<![CDATA[q]]>'];
const TEXT = ['a', 'b c', ' ', '&lt;', '&#9;', 'd\te', '<![CDATA[k<>m]]>', '<![CDATA[&amp;]]>', 'x]', '<!-- n -->'];
const STYLES = ['b', 'i', 'u', 'o', 's', 'sub', 'sup', 'font color="red"'];
function text(d: number): string {
  const n = 1 + Math.floor(rnd() * 3); let out = '';
  for (let i = 0; i < n; i++) {
    const r = rnd();
    if (r < 0.5 || d > 2) out += pick(TEXT);
    else if (r < 0.65) out += '<br/>';
    else { const st = pick(STYLES); const tag = st.split(' ')[0]; out += rnd() < 0.08 ? `<${st}/>` : `<${st}>${rnd() < 0.08 ? '' : text(d + 1)}</${tag}>`; }
  }
  return out;
}
function cell(d: number): string { const inner = rnd() < 0.15 && d < 2 ? table(d + 1) : (rnd() < 0.08 ? '' : text(d)); return rnd() < 0.04 ? '<td/>' : `<td>${inner}</td>`; }
function row(d: number): string { let c = ''; const n = 1 + Math.floor(rnd() * 2); for (let i = 0; i < n; i++) c += pick(NOISE) + cell(d); return `<tr>${c}${pick(NOISE)}</tr>`; }
function table(d: number): string { let r = ''; const n = 1 + Math.floor(rnd() * 2); for (let i = 0; i < n; i++) r += pick(NOISE) + row(d); return `<table>${r}${pick(NOISE)}</table>`; }
function label(): string {
  if (rnd() < 0.4) return text(0);
  const t = pick(NOISE) + table(0) + pick(NOISE);
  return rnd() < 0.2 ? `<b>${t}</b>` : t;
}
const NATIVE = `${process.env.HOME}/git/graphviz/build/cmd/dot/dot`;
const origErr = console.error, origWarn = console.warn;
let ok = 0; const bad: string[] = [];
for (let k = 0; k < N; k++) {
  const lbl = label();
  const dot = `digraph{a[label=<${lbl}>]}`;
  const n = spawnSync(NATIVE, ['-Tsvg'], { input: dot, env: { ...process.env, GVBINDIR: process.env.GV_PLUGINS_DOT ?? '/tmp/ghl' } });
  const nErr = normalizeStderrLines(n.stderr.toString('latin1')).filter((l) => !l.includes('hard-coded metrics'));
  const pLines: string[] = [];
  console.error = console.warn = (...a: unknown[]) => { pLines.push(a.map(String).join(' ')); };
  let pSvg = '';
  try { pSvg = renderSvg(dot, 'dot'); } catch { pSvg = ''; }
  console.error = origErr; console.warn = origWarn;
  const pErr = pLines.join('\n').split('\n').filter((l) => l && !l.includes('hard-coded metrics'));
  const nSvg = n.stdout.toString('utf8');
  let svgOk: boolean;
  try { svgOk = nSvg.includes('</svg>') && pSvg !== '' ? compareSvg(pSvg, nSvg, 'deterministic').pass : nSvg.includes('</svg>') === (pSvg !== ''); } catch (e) { svgOk = false; pErr.push(`COMPARE THREW ${(e as Error).message.slice(0, 80)}`); }
  const errOk = JSON.stringify(nErr) === JSON.stringify(pErr);
  if (svgOk && errOk) ok++; else bad.push(JSON.stringify({ lbl, svgOk, nErr, pErr, nSvg }));
}
writeFileSync(`${process.argv[ARGV_OUT] ?? '/dev/stdout'}`, bad.join('\n') + '\n');
origErr(`seed ${process.argv[2]} n=${N} ok=${ok} bad=${bad.length}`);
