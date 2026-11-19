// SPDX-License-Identifier: EPL-2.0
//
// Carried-oracle self-check (ADR-0003, stop condition 5). With an empty patch
// series the carried build must be byte-identical to the pristine 16.1.1
// build. Renders every entry of carried-selfcheck-sample.json with both and
// compares stdout, stderr and exit status. Two normalizations, both build
// artifacts the port never emits: the build date token in the version string,
// `16.1.1 (YYYYMMDD.HHMM)` (the builds were compiled at different times), and
// each checkout's absolute source root in stderr (C `__FILE__` in messages such
// as `lib/pathplan/<root>/lib/pathplan/shortest.c:338: triangulation failed`).
//
//   npx tsx test/corpus/carried-selfcheck.ts
//
// Exit 0: all equal. Exit 1: a difference (the first is printed). Exit 2: harness fault.
// Node-only dev/test infra.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  ORACLE_CORPUS_ROOT,
  ORACLE_DOT_BIN,
  ORACLE_GRAPHVIZ_BUILD,
  ORACLE_GVBINDIR,
  ORACLE_GVBINDIR_ALL,
  ORACLE_PRISTINE_DOT_BIN,
  ORACLE_PRISTINE_GRAPHVIZ_BUILD,
  ORACLE_PRISTINE_GVBINDIR,
  ORACLE_PRISTINE_GVBINDIR_ALL,
  ORACLE_VERSION,
} from './oracle-paths.mjs';

const RENDER_TIMEOUT_MS = 60_000;
const EXIT_DIFF = 1;
const EXIT_FAULT = 2;
const DATE_TOKEN_RE = new RegExp(`(${ORACLE_VERSION.replace(/\./g, '\\.')}) \\(\\d{8}\\.\\d{4}\\)`, 'g');
const DATE_PLACEHOLDER = '(BUILD-DATE)';
const CONTEXT_BYTES = 60;

interface Sample {
  readonly id: string;
  readonly engine: string;
  readonly format: string;
}

interface Capture {
  readonly stdout: string;
  readonly stderr: string;
  readonly status: string;
}

interface Oracle {
  readonly dotBin: string;
  readonly gvbindirDot: string;
  readonly gvbindirAll: string;
}

const PRISTINE: Oracle = {
  dotBin: ORACLE_PRISTINE_DOT_BIN,
  gvbindirDot: ORACLE_PRISTINE_GVBINDIR,
  gvbindirAll: ORACLE_PRISTINE_GVBINDIR_ALL,
};
const PRISTINE_SRC = dirname(ORACLE_PRISTINE_GRAPHVIZ_BUILD);
const CARRIED_SRC = dirname(ORACLE_GRAPHVIZ_BUILD);
const SOURCE_ROOT_PLACEHOLDER = '<graphviz-src>';
const CARRIED: Oracle = { dotBin: ORACLE_DOT_BIN, gvbindirDot: ORACLE_GVBINDIR, gvbindirAll: ORACLE_GVBINDIR_ALL };

/** The only normalization: blank the build date after the pinned version. Returns the text and how many tokens it replaced. */
export function normalizeVersionDate(text: string): { text: string; fired: number } {
  let fired = 0;
  const out = text.replace(DATE_TOKEN_RE, (_m, v: string) => {
    fired++;
    return `${v} ${DATE_PLACEHOLDER}`;
  });
  return { text: out, fired };
}

/** Replace one checkout's absolute source root with a placeholder (C `__FILE__` in stderr). */
export function normalizeSourceRoot(text: string, root: string): string {
  return text.split(`${root}/`).join(`${SOURCE_ROOT_PLACEHOLDER}/`);
}

/** Offset of the first differing char (latin1, so one char = one byte), or -1 when equal. */
export function firstDifference(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a.charCodeAt(i) !== b.charCodeAt(i)) return i;
  return a.length === b.length ? -1 : n;
}

function render(o: Oracle, s: Sample, inputPath: string): Capture {
  const gvbindir = s.engine === 'dot' ? o.gvbindirDot : o.gvbindirAll;
  const r = spawnSync(o.dotBin, [`-K${s.engine}`, `-T${s.format}`, inputPath], {
    env: { ...process.env, GVBINDIR: gvbindir },
    encoding: 'latin1',
    timeout: RENDER_TIMEOUT_MS,
    maxBuffer: 1 << 28,
  });
  if (r.error) throw new Error(`cannot run ${o.dotBin} for ${s.id} ${s.engine} ${s.format}: ${r.error.message}`);
  return { stdout: r.stdout, stderr: r.stderr, status: String(r.status ?? r.signal) };
}

function context(text: string, at: number): string {
  return JSON.stringify(text.slice(Math.max(0, at - CONTEXT_BYTES), at + CONTEXT_BYTES));
}

/** Compare one stream after normalization; the message of the first difference, else null. */
function compareStream(label: string, p: string, c: string, firedByFormat: Map<string, number>, format: string): string | null {
  const isErr = label === 'stderr';
  // Both roots on both sides: the corpus inputs live under the pristine root.
  const roots = (t: string): string => normalizeSourceRoot(normalizeSourceRoot(t, PRISTINE_SRC), CARRIED_SRC);
  const np = normalizeVersionDate(isErr ? roots(p) : p);
  const nc = normalizeVersionDate(isErr ? roots(c) : c);
  if (np.fired > 0) firedByFormat.set(format, (firedByFormat.get(format) ?? 0) + np.fired);
  const at = firstDifference(np.text, nc.text);
  if (at < 0) return null;
  return `${label} differs at byte ${at}\n  pristine: ${context(np.text, at)}\n  carried:  ${context(nc.text, at)}`;
}

function compareOne(s: Sample, input: string, fired: Map<string, number>): string | null {
  const p = render(PRISTINE, s, input);
  const c = render(CARRIED, s, input);
  if (p.status !== c.status) return `exit status differs: pristine ${p.status}, carried ${c.status}`;
  return (
    compareStream('stdout', p.stdout, c.stdout, fired, s.format) ??
    compareStream('stderr', p.stderr, c.stderr, fired, s.format)
  );
}

function loadSamples(): { samples: Sample[]; paths: Map<string, string> } {
  const dir = new URL('.', import.meta.url).pathname;
  const sample = JSON.parse(readFileSync(join(dir, 'carried-selfcheck-sample.json'), 'utf8')) as { samples: Sample[] };
  const manifest = JSON.parse(readFileSync(join(dir, 'corpus-manifest.json'), 'utf8')) as { id: string; path: string }[];
  return { samples: sample.samples, paths: new Map(manifest.map((e) => [e.id, join(ORACLE_CORPUS_ROOT, e.path)])) };
}

function tally(samples: readonly Sample[], key: 'engine' | 'format'): string {
  const n = new Map<string, number>();
  for (const s of samples) n.set(s[key], (n.get(s[key]) ?? 0) + 1);
  return [...n].map(([k, v]) => `${k}=${v}`).join(' ');
}

function main(): void {
  const start = Date.now();
  const { samples, paths } = loadSamples();
  const fired = new Map<string, number>();
  let diffs = 0;
  for (const s of samples) {
    const input = paths.get(s.id);
    if (input === undefined) throw new Error(`sample id not in corpus-manifest.json: ${s.id}`);
    const msg = compareOne(s, input, fired);
    if (msg === null) continue;
    diffs++;
    if (diffs === 1) console.log(`FIRST DIFFERENCE: ${s.id} -K${s.engine} -T${s.format}\n${msg}`);
  }
  console.log(`samples=${samples.length} differences=${diffs} wall=${((Date.now() - start) / 1000).toFixed(1)}s`);
  console.log(`engines: ${tally(samples, 'engine')}`);
  console.log(`formats: ${tally(samples, 'format')}`);
  console.log(`version-date normalization fired (tokens by format): ${JSON.stringify(Object.fromEntries(fired))}`);
  process.exit(diffs === 0 ? 0 : EXIT_DIFF);
}

try {
  main();
} catch (err) {
  console.error(`harness fault: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(EXIT_FAULT);
}
