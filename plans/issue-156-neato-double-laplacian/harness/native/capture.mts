// SPDX-License-Identifier: EPL-2.0
/**
 * Run every case of the port's hier-imds.ts and hier-majorization.ts fixtures
 * through the native harness and compare with the stored vectors.
 * Usage: npx tsx capture.mts <harness binary> [out dir]
 *
 * With an out dir, writes imds.json and hier.json (the native results, keyed
 * by case name). Each case runs in a fresh process: libc rand() starts at its
 * seed, as the earlier harnesses ran them.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { HIER_GRAPHS, toVtx } from '../../../../test/helpers/hier-graphs.js';
import { IMDS_CASES, buildGraph, type ImdsCaseName } from '../../../../src/layout/neato/__fixtures__/hier-imds.js';
import { G40_ROWS, MAJORIZATION_CASES, type MajorizationCase } from '../../../../src/layout/neato/__fixtures__/hier-majorization.js';

const BIN = process.argv[2]!;
const OUT = process.argv[3];
const MODEL_SHORTPATH = 0;

interface Row { nedges: number; edges: number[]; ewgts: number[]; edists?: ArrayLike<number> }

const g = (v: number): string => v.toPrecision(17);

function rows(graph: Row[]): string {
  const hasW = graph[0]!.ewgts.length > 0;
  const hasD = graph[0]!.edists !== undefined;
  const lines = [`${hasW ? 1 : 0} ${hasD ? 1 : 0}`];
  for (const r of graph) {
    const parts = [String(r.nedges), ...r.edges.map(String)];
    if (hasW) parts.push(...r.ewgts.map(g));
    if (hasD) parts.push(...Array.from(r.edists!).map(String));
    lines.push(parts.join(' '));
  }
  return lines.join('\n');
}

/** Native stdout by case, kept verbatim: JSON.stringify would turn -0 into 0. */
const raw: Record<'imds' | 'hier', string[]> = { imds: [], hier: [] };

function run<T>(mode: 'imds' | 'hier', name: string, input: string): T {
  const text = execFileSync(BIN, [mode], { input, maxBuffer: 1 << 26 }).toString().trim();
  raw[mode].push(`${JSON.stringify(name)}:${text}`);
  return JSON.parse(text) as T;
}

const same = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

interface ImdsNative { n: number; D: number[]; rv: number; x: number[]; y: number[] }
const imds: Record<string, ImdsNative> = {};
const imdsDiffer: string[] = [];
for (const name of Object.keys(IMDS_CASES) as ImdsCaseName[]) {
  const c = IMDS_CASES[name];
  const graph = buildGraph(c.n, c.edges, c.haveLen, c.haveDir);
  const nat = run<ImdsNative>('imds', name, `${c.n} ${g(c.tol)}\n${rows(graph)}\n${c.input.map(g).join(' ')}\n`);
  imds[name] = nat;
  // the stored D is the matrix for n <= 7 and its row sums above
  const D = c.n > 7
    ? Array.from({ length: c.n }, (_, i) => nat.D.slice(i * c.n, (i + 1) * c.n).reduce((s, v) => s + v, 0))
    : nat.D;
  if (!same(D, c.D)) throw new Error(`${name}: compute_apsp differs from the stored D (input built wrongly)`);
  if (nat.rv !== c.rv || !same(nat.x, c.x) || !same(nat.y, c.y)) imdsDiffer.push(name);
}

function graphOf(c: MajorizationCase): Row[] {
  if (c.graph === 'g40') {
    return G40_ROWS.map((r) => ({ nedges: r.edges.length, edges: r.edges, ewgts: r.ewgts, edists: r.edists }));
  }
  return toVtx(HIER_GRAPHS[c.graph]);
}

interface HierNative { n: number; rv: number; coords: number[][] }
const hier: Record<string, HierNative> = {};
const hierDiffer: string[] = [];
for (const c of MAJORIZATION_CASES) {
  const graph = graphOf(c);
  const head = [graph.length, c.dim, c.opts, MODEL_SHORTPATH, c.maxi, g(c.levelsGap), g(c.epsilon), c.seed].join(' ');
  const nat = run<HierNative>('hier', c.name, `${head}\n${rows(graph)}\n`);
  hier[c.name] = nat;
  if (nat.rv !== c.rv || nat.coords.length !== c.coords.length || !nat.coords.every((a, d) => same(a, c.coords[d]!))) {
    hierDiffer.push(c.name);
  }
}

console.log(JSON.stringify({
  imdsCases: Object.keys(imds).length, imdsDiffer,
  hierCases: Object.keys(hier).length, hierDiffer,
}, null, 2));
if (OUT) {
  writeFileSync(`${OUT}/imds.json`, `{${raw.imds.join(',\n')}}\n`);
  writeFileSync(`${OUT}/hier.json`, `{${raw.hier.join(',\n')}}\n`);
}
