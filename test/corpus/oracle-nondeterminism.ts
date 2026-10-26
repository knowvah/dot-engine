// SPDX-License-Identifier: EPL-2.0
// Oracle nondeterminism probe for the corpus walks (item 69, AD-13).
//
// Native 16.1.0 returns 2-3 distinct outputs in 5-6 runs on some
// fdp/sfdp/neato/twopi ids, and the walks cache ONE oracle draw, so a verdict
// can flip with no port change. When an id diverges, the walk draws the oracle
// EXTRA_ORACLE_DRAWS more times uncached; if any two of the draws differ the
// row is `oracle-nondeterministic`. The outcome is recorded (oracle-env.ts) so
// later walks skip the re-runs. Node-only dev/test infra.

import { readOracleDraws, recordOracleDraws, type OracleFailureKey } from './oracle-env.js';

/** Uncached oracle renders added to the cached one on a divergence. */
export const EXTRA_ORACLE_DRAWS = 3;

/** Walk status for an id whose oracle output varies between runs. */
export const ORACLE_NONDETERMINISTIC = 'oracle-nondeterministic';

/** One uncached oracle render; `undefined` when it failed or was incomplete. */
export type OracleDraw = () => string | undefined;

/** Count of distinct outputs among `first` plus the draws that succeeded. */
export function distinctDraws(first: string, extra: readonly (string | undefined)[]): number {
  const seen = new Set<string>([first]);
  for (const d of extra) if (d !== undefined) seen.add(d);
  return seen.size;
}

/**
 * Number of distinct oracle outputs for `key`: the recorded value when a prior
 * walk probed this id, else `first` against EXTRA_ORACLE_DRAWS fresh draws
 * (recorded before returning). >= 2 means the oracle is nondeterministic.
 */
export function probeOracleDraws(
  key: OracleFailureKey,
  first: string,
  draw: OracleDraw,
  env: Readonly<Record<string, string | undefined>> = process.env,
): number {
  const recorded = readOracleDraws(key, env);
  if (recorded !== null) return recorded.nDraws;
  const extra: (string | undefined)[] = [];
  for (let i = 0; i < EXTRA_ORACLE_DRAWS; i++) extra.push(draw());
  const nDraws = distinctDraws(first, extra);
  recordOracleDraws(key, nDraws, env);
  return nDraws;
}

/** Statuses a regression comparison treats as a failure of the port. */
const FAILING_STATUSES: ReadonlySet<string> = new Set(['diverged', 'port-error', 'timeout']);

/** True when `current` is a regression against `baseline`: a pass that now
 * fails. `oracle-nondeterministic` is neither pass nor failure, so a row
 * moving to it is never a regression. */
export function isWalkRegression(baseline: string, current: string): boolean {
  return baseline === 'pass' && FAILING_STATUSES.has(current);
}

/** A walk row as far as the probe is concerned (engine-walk / json-walk rows
 * name the field `status` / `verdict`; callers adapt via `applyOracleDraws`). */
export interface DrawOutcome {
  readonly nondeterministic: boolean;
  readonly nDraws: number;
}

/** Probe a diverged row: `nondeterministic` when the oracle's own output
 * varies, with `nDraws` the distinct count seen. */
export function classifyDivergence(
  key: OracleFailureKey,
  first: string,
  draw: OracleDraw,
  env: Readonly<Record<string, string | undefined>> = process.env,
): DrawOutcome {
  const nDraws = probeOracleDraws(key, first, draw, env);
  return { nondeterministic: nDraws >= 2, nDraws };
}
