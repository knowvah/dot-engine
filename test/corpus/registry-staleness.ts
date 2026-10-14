// SPDX-License-Identifier: EPL-2.0
//
// Staleness rule for the per-engine accepted-divergence registries
// (engines, json, map, plain, dot-format, xdot) against their committed walk
// artifacts (registry-faults-staleness AD-4/AD-5).
//
// An accepted entry is a claim about a walk row: "this (engine, id) differs
// from the oracle in the documented way". When the port changes, the row can
// stop matching the claim — it conforms, fails differently, or drops out of
// the walk — and nothing else notices: the 16.1 sync found 136 stale json
// entries this way. Only the dot-track registry had a guard
// (accepted-divergences.test.ts). This module normalizes every walker's row
// shape to one RawOutcome and decides, per entry, whether the row still
// backs it. The registry table that applies it lives in
// registry-staleness.test.ts.

import { readFileSync } from 'node:fs';
import { acceptsOutcome, declaredVerdict, type FaultAcceptance, type RawOutcome } from './accepted-class.js';

/**
 * Walker verdict spellings → RawOutcome. The xdot/json/map/engine walkers use
 * kebab-case and `conformant`; the plain/dot-format walkers use camelCase and
 * `pass`.
 */
const OUTCOMES: Readonly<Record<string, RawOutcome['outcome']>> = {
  pass: 'pass',
  conformant: 'pass',
  diverged: 'diverged',
  accepted: 'accepted',
  'port-error': 'port-error',
  portError: 'port-error',
  timeout: 'timeout',
  'oracle-error': 'oracle-error',
  oracleError: 'oracle-error',
};

/** Normalize a walker verdict string; throws on a spelling no walker emits. */
export function normalizeVerdict(verdict: string): RawOutcome['outcome'] {
  const outcome = OUTCOMES[verdict];
  if (outcome === undefined) throw new Error(`unknown walk verdict ${JSON.stringify(verdict)}`);
  return outcome;
}

const present = (s: string | undefined): s is string => s !== undefined;

/** Engine-track row (parity-<engine>.jsonl): `status` + optional `err`. */
export function engineRowOutcome(r: { status: string; err?: string }): RawOutcome {
  return { outcome: normalizeVerdict(r.status), errs: [r.err].filter(present) };
}

/** json / xdot row: `verdict` + optional `errMsg`. */
export function flatRowOutcome(r: { verdict: string; errMsg?: string }): RawOutcome {
  return { outcome: normalizeVerdict(r.verdict), errs: [r.errMsg].filter(present) };
}

/** map row: `verdict`; one error text per format (cmapx, imap) — AD-7. */
export function mapRowOutcome(r: {
  verdict: string;
  cmapx?: { errMsg?: string };
  imap?: { errMsg?: string };
}): RawOutcome {
  return { outcome: normalizeVerdict(r.verdict), errs: [r.cmapx?.errMsg, r.imap?.errMsg].filter(present) };
}

/** plain / dot-format row: `verdict`; one error text per `formats` entry. */
export function formatsRowOutcome(r: { verdict: string; formats?: Record<string, { errMsg?: string }> }): RawOutcome {
  return {
    outcome: normalizeVerdict(r.verdict),
    errs: Object.values(r.formats ?? {}).map((f) => f.errMsg).filter(present),
  };
}

/**
 * Why `entry` is stale against its walk row, or null when the row still backs
 * it (AD-4). An absent row is stale; an oracle-error row is exempt (there is
 * no reference to verify against); an `accepted` row backs any entry, except
 * that a port-error entry still needs every error text to carry
 * `errIncludes`; any other row must be one `acceptsOutcome` accepts.
 */
export function staleReason(entry: FaultAcceptance, row: RawOutcome | undefined): string | null {
  const declared = declaredVerdict(entry);
  if (row === undefined) return `declares '${declared}' but the walk has no row`;
  if (row.outcome === 'oracle-error') return null;
  if (row.outcome === 'accepted') {
    if (declared !== 'port-error') return null;
    return acceptsOutcome(entry, { outcome: 'port-error', errs: row.errs })
      ? null
      : `declares 'port-error' (errIncludes ${JSON.stringify(entry.errIncludes)}) but the accepted row's errors are ${JSON.stringify(row.errs)}`;
  }
  if (acceptsOutcome(entry, row)) return null;
  const errs = row.errs.length > 0 ? ` (errors ${JSON.stringify(row.errs)})` : '';
  return `declares '${declared}' but the walk row is '${row.outcome}'${errs}`;
}

/** Full failure line for one stale entry. */
export function staleMessage(registry: string, engine: string, id: string, reason: string): string {
  return `${registry} ${engine}/${id}: ${reason} — retire the entry and its docs/known-divergences.md prose`;
}

/** Read a walk JSONL into id → normalized outcome (the last row per id wins). */
export function loadOutcomes<R extends { id: string }>(
  path: string,
  normalize: (row: R) => RawOutcome,
): Map<string, RawOutcome> {
  const rows = new Map<string, RawOutcome>();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    const row = JSON.parse(line) as R;
    rows.set(row.id, normalize(row));
  }
  return rows;
}
