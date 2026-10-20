// SPDX-License-Identifier: EPL-2.0
// Shared oracle environment for the corpus scripts: where oracle caches live
// and a preflight that proves the native oracle can render before a sweep
// starts. Node-only dev/test infra.
//
// Caches used to live under tmpdir(); an OS /tmp clean deleted the plugin
// config (`config8`) and the caches together, and sweeps then recorded a whole
// corpus of "oracle-error" verdicts. @see docs/adr/0001-graphviz-16.1-oracle.md

import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

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
