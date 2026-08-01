// SPDX-License-Identifier: EPL-2.0
//
// Per-(graph, engine) exclusions for the non-dot engine tracks.
//
// An excluded id is not walked on that engine at all, so it receives NO verdict —
// which is the point. Contrast the two neighbouring mechanisms:
//
//   corpus-manifest.json `status: quarantined`  — GLOBAL: drops the id everywhere.
//   accepted-divergences-*.json                 — the id IS walked; a real
//                                                 divergence is recorded and
//                                                 forgiven with a documented cause.
//   engine-exclusions.json (this)               — the id is not walked on ONE
//                                                 engine, because that engine
//                                                 cannot meaningfully exercise it.
//
// The distinction matters: an acceptance says "we compared and chose to live with
// the difference"; an exclusion says "comparing here would measure nothing". Using
// the wrong one either hides a real divergence or wastes hours re-deriving that a
// degenerate input is still degenerate.
//
// Node-only dev/test infra.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** One exclusion entry. Every field is required — an exclusion without a stated
 *  mechanism and an alternative coverage story is indistinguishable from a gap. */
export interface EngineExclusion {
  id: string;
  engines: string[];
  /** WHY the engine cannot meaningfully exercise this graph — a mechanism, not an
   *  observation. "0 edges so every engine collapses to lib/pack", not "slow". */
  mechanism: string;
  /** What skipping it saves, so the trade is auditable. */
  cost: string;
  /** Where the same behaviour IS verified, so the exclusion is not a coverage hole. */
  coveredBy: string;
  ref: string;
}

interface Registry { comment?: string; exclusions?: EngineExclusion[] }

/** Read the registry. Never throws: a missing or malformed file excludes nothing,
 *  which fails toward MORE coverage rather than silently skipping graphs. */
export function loadExclusions(url: URL): EngineExclusion[] {
  if (!existsSync(url)) return [];
  try {
    return (JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as Registry).exclusions ?? [];
  } catch {
    return [];
  }
}

/** id -> entry, for the ids excluded from `engine`. */
export function excludedFor(url: URL, engine: string): Map<string, EngineExclusion> {
  const out = new Map<string, EngineExclusion>();
  for (const e of loadExclusions(url)) {
    if (e.engines.includes(engine)) out.set(e.id, e);
  }
  return out;
}
