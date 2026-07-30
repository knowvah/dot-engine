// SPDX-License-Identifier: EPL-2.0
//
// Computed class-acceptance resolution for the per-engine format registries
// (accepted-divergences-json.json, accepted-divergences-map.json).
//
// Two acceptance shapes live in those registries:
//   - per-id:  { id, engine?, opClass, delta, rationale } — one hand-root-caused
//              divergence, enumerated by hand.
//   - class:   { class: true, engine, attributionFile, ref } — membership is
//              COMPUTED from the injection-attribution harness's
//              drift-exonerated verdicts, never hand-enumerated.
//
// The class shape exists because a hand-enumerated roster of an *inherently
// growing* set goes stale silently: the json/map rosters were populated by
// copying the then-current xdot A1-drift roster, and the 2026-07-27 corpus
// expansion (+150 `tree-*` inputs) left them 116 ids behind — the xdot track,
// which already resolved this class by computation (parity-report.ts), picked
// the new ids up automatically while json/map reported them as `diverged`.
//
// An id is a class member iff `attribution-<engine>.json` verdicts it
// `drift-exonerated`: injecting the native oracle's pre-routing node positions
// into the port makes the port's output match the oracle with ZERO diffs, so
// everything downstream of the iterative solver is faithful and the residual is
// the solver's FP-chaotic positions alone (accepted class A1).
//
// A missing attribution file exonerates nothing (the "attribution pending"
// state), mirroring parity-report.ts's loadAttribution — a class entry is
// allowed to precede the data it will be computed from.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** A class-acceptance entry in a per-engine format registry. */
export interface FormatAcceptedClassEntry {
  class: true;
  engine: string;
  attributionFile: string;
  ref: string;
}

/** Registry file shape shared by the json/map format registries. */
export interface FormatAcceptedRegistry {
  comment?: string;
  classes?: FormatAcceptedClassEntry[];
  divergences?: Array<{ id: string; engine?: string }>;
}

interface AttributionRow {
  id: string;
  verdict: 'drift-exonerated' | 'not-cleared' | 'harness-error';
}

/**
 * Ids the injection-attribution harness exonerated as A1 drift for `engine`,
 * per the registry's class entries. Never throws: an unreadable or absent
 * attribution file contributes no members.
 */
export function classAcceptedIds(registryUrl: URL, engine: string): Set<string> {
  const ids = new Set<string>();
  let registry: FormatAcceptedRegistry;
  try {
    registry = JSON.parse(readFileSync(fileURLToPath(registryUrl), 'utf8')) as FormatAcceptedRegistry;
  } catch {
    return ids;
  }
  for (const entry of registry.classes ?? []) {
    if (entry.class !== true || entry.engine !== engine) continue;
    const url = new URL(`./${entry.attributionFile}`, registryUrl);
    if (!existsSync(url)) continue;
    try {
      const report = JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as { results?: AttributionRow[] };
      for (const r of report.results ?? []) {
        if (r.verdict === 'drift-exonerated') ids.add(r.id);
      }
    } catch {
      // Unreadable attribution data exonerates nothing — same as absent.
    }
  }
  return ids;
}
