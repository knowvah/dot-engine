// SPDX-License-Identifier: EPL-2.0
//
// Regenerate the native SVG golden references under test/golden/refs/ (and the
// non-manifest xdot refs gen-xdot-refs.ts does not cover).
//
// Mirrors gen-xdot-refs.ts: each ref is the native oracle's `dot -K<engine> -T<fmt>`
// output, committed so the golden suites run without a live oracle. Oracle paths
// come only from ../corpus/oracle-paths.mjs (DOT_BIN / GVBINDIR override them).
//
// What is regenerated:
//   - every manifest.json entry's `reference` (engine from the entry), except
//     entries whose reference lives under refs-port/ (port pins, not native);
//   - every other refs/<id>.svg that has inputs/<id>.dot (plantuml-ts pt-issue-*,
//     draw-replay-*, concentrate-2559, pack-*, optmacroname): engine `dot`;
//   - every refs-xdot/<id>.xdot that is not a manifest id (draw-replay-*): the
//     xdot of inputs/<id>.dot with engine `dot`.
// It only refreshes refs that already exist; adding a ref is a manual act.
//
// Native dot exits 1 on routing warnings yet still writes a complete document
// (pt-issue-31), so complete output is accepted regardless of exit status.
//
// Usage:  npx tsx test/golden/gen-svg-refs.ts
// Node-only dev/test infra — never imported by src/index.ts.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORACLE_DOT_BIN, ORACLE_GVBINDIR, ORACLE_GVBINDIR_ALL } from '../corpus/oracle-paths.mjs';

export interface ManifestEntry {
  id: string;
  engine: string;
  input: string;
  reference: string;
}

export type RefFormat = 'svg' | 'xdot';

export interface RefJob {
  id: string;
  engine: string;
  format: RefFormat;
  /** Repo-relative input path. */
  input: string;
  /** Repo-relative ref path to write. */
  output: string;
}

export interface GenOptions {
  rootDir: string;
  dotBin: string;
  env: NodeJS.ProcessEnv;
}

export interface GenResult {
  written: number;
  skipped: string[];
}

const GOLDEN = 'test/golden';
const REFS_DIR = `${GOLDEN}/refs`;
const REFS_XDOT_DIR = `${GOLDEN}/refs-xdot`;
const REFS_PORT_DIR = `${GOLDEN}/refs-port/`;
const EXTRA_ENGINE = 'dot';
const ORACLE_TIMEOUT_MS = 60_000;
const ORACLE_MAX_BUFFER = 256 * 1024 * 1024;
const COMPLETE_TAIL: Record<RefFormat, string> = { svg: '</svg>', xdot: '}' };

/** The plugin dir for `engine`: GVBINDIR when set, else dot-only for dot, all-engines otherwise. */
export function gvbindirFor(engine: string, env: NodeJS.ProcessEnv): string {
  return env.GVBINDIR ?? (engine === 'dot' ? ORACLE_GVBINDIR : ORACLE_GVBINDIR_ALL);
}

const baseName = (file: string, ext: string): string => file.slice(0, -ext.length);

/**
 * Pure: the ordered list of refs to regenerate.
 * @param refSvgFiles file names present in refs/
 * @param refXdotFiles file names present in refs-xdot/
 */
export function planJobs(
  manifest: readonly ManifestEntry[],
  refSvgFiles: readonly string[],
  refXdotFiles: readonly string[],
): RefJob[] {
  const jobs: RefJob[] = [];
  const manifestSvg = new Set<string>();
  for (const e of manifest) {
    manifestSvg.add(e.reference.slice(e.reference.lastIndexOf('/') + 1));
    if (e.reference.startsWith(REFS_PORT_DIR)) continue;
    jobs.push({ id: e.id, engine: e.engine, format: 'svg', input: e.input, output: e.reference });
  }
  const manifestIds = new Set(manifest.map((e) => e.id));
  for (const f of refSvgFiles) {
    if (!f.endsWith('.svg') || manifestSvg.has(f)) continue;
    const id = baseName(f, '.svg');
    jobs.push({
      id,
      engine: EXTRA_ENGINE,
      format: 'svg',
      input: `${GOLDEN}/inputs/${id}.dot`,
      output: `${REFS_DIR}/${f}`,
    });
  }
  for (const f of refXdotFiles) {
    const id = baseName(f, '.xdot');
    if (!f.endsWith('.xdot') || manifestIds.has(id)) continue;
    jobs.push({
      id,
      engine: EXTRA_ENGINE,
      format: 'xdot',
      input: `${GOLDEN}/inputs/${id}.dot`,
      output: `${REFS_XDOT_DIR}/${f}`,
    });
  }
  return jobs;
}

/** Run the oracle for each job; write only complete output. */
export function generateRefs(jobs: readonly RefJob[], opts: GenOptions): GenResult {
  let written = 0;
  const skipped: string[] = [];
  for (const job of jobs) {
    const run = spawnSync(
      opts.dotBin,
      [`-K${job.engine}`, `-T${job.format}`, join(opts.rootDir, job.input)],
      {
        env: { ...opts.env, GVBINDIR: gvbindirFor(job.engine, opts.env) },
        encoding: 'utf8',
        timeout: ORACLE_TIMEOUT_MS,
        maxBuffer: ORACLE_MAX_BUFFER,
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
    const out = run.stdout ?? '';
    if (!out.trimEnd().endsWith(COMPLETE_TAIL[job.format])) {
      skipped.push(`${job.id}: incomplete oracle output`);
      continue;
    }
    const dest = join(opts.rootDir, job.output);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, out);
    written++;
  }
  return { written, skipped };
}

function main(): void {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const manifest = JSON.parse(readFileSync(join(root, GOLDEN, 'manifest.json'), 'utf8')) as ManifestEntry[];
  const jobs = planJobs(manifest, readdirSync(join(root, REFS_DIR)), readdirSync(join(root, REFS_XDOT_DIR)));
  const { written, skipped } = generateRefs(jobs, {
    rootDir: root,
    dotBin: process.env.DOT_BIN ?? ORACLE_DOT_BIN,
    env: process.env,
  });
  process.stdout.write(`wrote ${written} of ${jobs.length} refs\n`);
  if (skipped.length > 0) {
    process.stdout.write(`skipped ${skipped.length}:\n  ${skipped.join('\n  ')}\n`);
  }
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) main();
