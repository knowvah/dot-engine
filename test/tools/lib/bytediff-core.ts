// SPDX-License-Identifier: EPL-2.0
// Pure parts of the bytediff driver: id-file parsing, job expansion, child-exit and
// result classification, report assembly.

export interface IdLine {
  readonly id: string;
  readonly engines: readonly string[] | null;
}

export interface Target {
  readonly id: string;
  readonly file: string;
  readonly engines: readonly string[];
}

export interface Job extends Target {
  readonly key: string;
  readonly engine: string;
  readonly format: string;
}

export interface Capped {
  readonly key: string;
  readonly a: string;
  readonly b: string;
}

export interface Report {
  readonly bundleA: string;
  readonly bundleB: string;
  readonly jobs: number;
  readonly identical: number;
  readonly diffs: readonly string[];
  readonly capped: readonly Capped[];
}

export const DEFAULT_ENGINES = 'dot,neato,fdp,sfdp,twopi,circo,osage,patchwork';
export const DEFAULT_FORMATS = 'svg,xdot,json,plain,cmapx';
const OOM_RE = /heap out of memory|Allocation failed|Fatal JavaScript invalid size|Reached heap limit/i;
const CRASH_MAX = 200;

/** `id [engine,...]` lines; blank lines and `#` comments skipped. */
export function parseIdLines(text: string): IdLine[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const [id = '', eng] = l.split(/\s+/);
      return { id, engines: eng ? eng.split(',') : null };
    });
}

export function buildJobs(targets: readonly Target[], formats: readonly string[]): Job[] {
  const jobs: Job[] = [];
  for (const t of targets) {
    for (const engine of t.engines) {
      for (const format of formats) jobs.push({ key: `${t.id}|${engine}|${format}`, ...t, engine, format });
    }
  }
  return jobs;
}

/** Cap reason for a finished child (null = ok): TIMEOUT / OOM / CRASH. */
export function capReason(timedOut: boolean, code: number | null, signal: string | null, stderr: string): string | null {
  if (timedOut) return 'TIMEOUT';
  if (OOM_RE.test(stderr)) return 'OOM';
  if (code === 0) return null;
  const line = stderr.split('\n').find((l) => /fatal|error|heap/i.test(l)) ?? '';
  return `CRASH ${code ?? signal} ${line}`.slice(0, CRASH_MAX);
}

export type Outcome = 'identical' | 'diff' | 'capped';

export interface RunResult {
  readonly cap?: string;
  readonly out?: Buffer;
}

export function outcomeOf(a: RunResult, b: RunResult): Outcome {
  if (a.cap !== undefined || b.cap !== undefined) return 'capped';
  return a.out !== undefined && b.out !== undefined && a.out.equals(b.out) ? 'identical' : 'diff';
}

export function buildReport(
  bundleA: string,
  bundleB: string,
  jobs: number,
  identical: number,
  diffs: readonly string[],
  capped: readonly Capped[],
): Report {
  return {
    bundleA,
    bundleB,
    jobs,
    identical,
    diffs: [...diffs].sort(),
    capped: [...capped].sort((x, y) => x.key.localeCompare(y.key)),
  };
}

export function summaryLine(r: Report): string {
  return `jobs ${r.jobs}: identical ${r.identical}, diffs ${r.diffs.length}, capped ${r.capped.length}`;
}
