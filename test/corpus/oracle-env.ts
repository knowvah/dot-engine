// SPDX-License-Identifier: EPL-2.0
// Shared oracle environment for the corpus scripts: where oracle caches live
// and a preflight that proves the native oracle can render before a sweep
// starts. Node-only dev/test infra.
//
// Caches used to live under tmpdir(); an OS /tmp clean deleted the plugin
// config (`config8`) and the caches together, and sweeps then recorded a whole
// corpus of "oracle-error" verdicts. @see docs/adr/0001-graphviz-16.1-oracle.md

import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/** The oracle version every sweep is pinned to (ADR-0001). */
export const ORACLE_VERSION = '16.1.0';

const PREFLIGHT_TIMEOUT_MS = 10_000;
const PREFLIGHT_INPUT = 'digraph{a->b}';
const VERSION_RE = /version (\d+\.\d+\.\d+)/;
const FAILURE_STDERR_RE = /not recognized|no layout engine support/;

/** `$XDG_CACHE_HOME/dot-engine/oracle/<kind>/<sig>` (default `~/.cache`).
 * `env` / `home` are injectable for tests; callers normally pass two args. */
export function oracleCacheRoot(
  kind: string,
  sig: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
  home: string = homedir(),
): string {
  const xdg = env['XDG_CACHE_HOME'];
  const base = xdg !== undefined && xdg !== '' ? xdg : join(home, '.cache');
  return join(base, 'dot-engine', 'oracle', kind, sig);
}

/** One native render: output format and engine as passed to `dot`, corpus id. */
export interface OracleFailureKey {
  readonly engine: string;
  readonly format: string;
  readonly id: string;
}

/** How a failed native render ended. `signal` is the child's terminating signal. */
export interface OracleRun {
  readonly timedOut: boolean;
  readonly signal: string | null;
  readonly stderr: string;
}

/** A recorded native failure: the message and ms the caller reported, whether
 * it was the harness's own timeout, and the cap it ran under. */
export interface OracleFailure {
  readonly err: string;
  readonly ms: number;
  readonly timedOut: boolean;
  readonly capMs: number;
}

/** Signals that come from outside the harness (OOM killer, Ctrl-C, hangup):
 * they say nothing about the input, so such a failure is not recorded. */
const EXTERNAL_KILL_SIGNALS: ReadonlySet<string> = new Set(['SIGKILL', 'SIGTERM', 'SIGINT', 'SIGHUP']);

/** Where a native failure is recorded. Keyed by ORACLE_VERSION, not by the
 * binary's path, mtime or GVBINDIR as the output caches are: a rebuild of the
 * same release fails the same way, and only a new graphviz release re-renders
 * it. Before this, every survey re-ran its 9 native timeouts to the cap (~2 h).
 * Delete `<cache>/dot-engine/oracle/failures` to force a re-render. */
export function oracleFailureFile(
  key: OracleFailureKey,
  env: Readonly<Record<string, string | undefined>> = process.env,
  home: string = homedir(),
): string {
  const dir = oracleCacheRoot('failures', join(ORACLE_VERSION, key.engine, key.format), env, home);
  return join(dir, `${key.id}.json`);
}

/** True when a failure says something about the input and can be reused: a
 * timeout (re-checked against the cap on read), an error exit or a native
 * crash. A harness fault (plugin config gone mid-sweep) or a kill from outside
 * the harness is not reused. */
export function isStickyOracleFailure(run: OracleRun): boolean {
  if (FAILURE_STDERR_RE.test(run.stderr)) return false;
  if (run.timedOut) return true;
  return run.signal === null || !EXTERNAL_KILL_SIGNALS.has(run.signal);
}

/** The recorded failure for `key`, or null when there is none, it is
 * unreadable, or it is a timeout under a smaller cap than `capMs` (a longer
 * cap might let the render finish). */
export function readOracleFailure(
  key: OracleFailureKey,
  capMs: number,
  env: Readonly<Record<string, string | undefined>> = process.env,
  home: string = homedir(),
): OracleFailure | null {
  let rec: OracleFailure;
  try {
    rec = JSON.parse(readFileSync(oracleFailureFile(key, env, home), 'utf8')) as OracleFailure;
  } catch {
    return null; // absent, or truncated by a killed writer
  }
  if (rec.timedOut && capMs > rec.capMs) return null;
  return rec;
}

/** Record a failed native render for reuse, unless it is not sticky
 * (`isStickyOracleFailure`). */
export function recordOracleFailure(
  key: OracleFailureKey,
  run: OracleRun,
  failure: { readonly err: string; readonly ms: number; readonly capMs: number },
  env: Readonly<Record<string, string | undefined>> = process.env,
  home: string = homedir(),
): void {
  if (!isStickyOracleFailure(run)) return;
  const file = oracleFailureFile(key, env, home);
  mkdirSync(dirname(file), { recursive: true });
  const rec: OracleFailure = { ...failure, timedOut: run.timedOut };
  writeFileSync(file, JSON.stringify(rec) + '\n');
}

/** Fail fast (throw) unless `dotBin` reports 16.1.0 and renders a trivial graph
 * with `-K<engine> -Tsvg` under `GVBINDIR=<gvbindir>`. */
export function oraclePreflight(dotBin: string, gvbindir: string, engine: string): void {
  const env = { ...process.env, GVBINDIR: gvbindir };
  const recover = `GVBINDIR=${gvbindir} ${dotBin} -c`;

  const v = spawnSync(dotBin, ['-V'], { env, encoding: 'utf8', timeout: PREFLIGHT_TIMEOUT_MS });
  if (v.error) throw new Error(`oracle preflight: cannot run ${dotBin} -V: ${v.error.message}`);
  const reported = `${v.stderr}${v.stdout}`;
  const found = VERSION_RE.exec(reported)?.[1];
  if (found !== ORACLE_VERSION) {
    throw new Error(
      `oracle preflight: ${dotBin} must report graphviz ${ORACLE_VERSION}; it reported ` +
        `${JSON.stringify(reported.trim())}`,
    );
  }

  const r = spawnSync(dotBin, [`-K${engine}`, '-Tsvg'], {
    env, input: PREFLIGHT_INPUT, encoding: 'utf8', timeout: PREFLIGHT_TIMEOUT_MS,
  });
  const reason = renderFailure(r);
  if (reason !== null) {
    throw new Error(
      `oracle preflight failed for engine ${engine} (${reason}). If the plugin config ` +
        `is missing, regenerate it with: ${recover}`,
    );
  }
}

function renderFailure(r: SpawnSyncReturns<string>): string | null {
  if (r.error) return r.error.message;
  if (r.status !== 0) return `exit ${String(r.status ?? r.signal)}: ${r.stderr.trim()}`;
  if (FAILURE_STDERR_RE.test(r.stderr)) return r.stderr.trim();
  if (!r.stdout.includes('<svg')) return 'stdout has no <svg';
  return null;
}

/** Script entry guard: preflight every engine in `engines`; on failure print
 * the message (it carries the `GVBINDIR=<dir> <dot> -c` recovery command) and
 * exit 2 (harness fault) before any render. */
export function preflightOrExit(dotBin: string, gvbindir: string, engines: readonly string[]): void {
  try {
    for (const engine of engines) oraclePreflight(dotBin, gvbindir, engine);
  } catch (err) {
    process.stderr.write(`harness fault: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(2);
  }
}
