// SPDX-License-Identifier: EPL-2.0
//
// Staleness guard for the six per-engine accepted-divergence registries
// (registry-faults-staleness AD-4/AD-5): every per-id entry must still be
// backed by its committed walk row. Sibling of accepted-divergences.test.ts,
// which guards the dot-track registry against parity.json the same way.
//
// Class entries ({ class: true, attributionFile }) are skipped (AD-6): their
// membership is recomputed from attribution data, never enumerated.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import type { FaultAcceptance, RawOutcome } from './accepted-class.js';
import {
  engineRowOutcome,
  flatRowOutcome,
  formatsRowOutcome,
  loadOutcomes,
  mapRowOutcome,
  normalizeVerdict,
  staleMessage,
  staleReason,
} from './registry-staleness.js';

const MAP_MAX = 'Map maximum size exceeded';
const row = (outcome: RawOutcome['outcome'], errs: string[] = []): RawOutcome => ({ outcome, errs });

describe('staleReason', () => {
  const portError: FaultAcceptance = { verdict: 'port-error', errIncludes: MAP_MAX };

  it('flags an absent row', () => {
    expect(staleReason({}, undefined)).toMatch(/'diverged'.*no row/);
  });

  it('flags a row that now passes', () => {
    expect(staleReason({}, row('pass'))).toMatch(/'diverged'.*'pass'/);
    expect(staleReason(portError, row('pass'))).toMatch(/'port-error'.*'pass'/);
  });

  it('exempts an oracle-error row', () => {
    expect(staleReason({}, row('oracle-error'))).toBeNull();
    expect(staleReason(portError, row('oracle-error', ['oracle exit null']))).toBeNull();
  });

  it('exempts an oracle-nondeterministic row (no single native reference)', () => {
    expect(staleReason({}, row('oracle-nondeterministic'))).toBeNull();
    expect(staleReason(portError, row('oracle-nondeterministic'))).toBeNull();
  });

  it('backs a diverged entry with a diverged or accepted row', () => {
    expect(staleReason({}, row('diverged'))).toBeNull();
    expect(staleReason({}, row('accepted'))).toBeNull();
  });

  it('flags a diverged entry whose row is now a port error', () => {
    expect(staleReason({}, row('port-error', ['splines=compound']))).toMatch(/'port-error'.*splines=compound/);
  });

  it('backs a port-error entry only while every error carries errIncludes', () => {
    expect(staleReason(portError, row('port-error', [MAP_MAX]))).toBeNull();
    expect(staleReason(portError, row('accepted', [MAP_MAX, MAP_MAX]))).toBeNull();
    expect(staleReason(portError, row('port-error', ['other failure']))).toMatch(/other failure/);
    expect(staleReason(portError, row('accepted', [MAP_MAX, 'other failure']))).toMatch(/accepted row/);
    expect(staleReason(portError, row('accepted'))).toMatch(/accepted row/);
    expect(staleReason(portError, row('diverged'))).toMatch(/'diverged'/);
  });

  it('backs a timeout entry with a timeout or accepted row', () => {
    expect(staleReason({ verdict: 'timeout' }, row('timeout'))).toBeNull();
    expect(staleReason({ verdict: 'timeout' }, row('accepted'))).toBeNull();
    expect(staleReason({ verdict: 'timeout' }, row('diverged'))).toMatch(/'timeout'.*'diverged'/);
  });

  it('names registry, engine, id and the retirement in the failure line', () => {
    const msg = staleMessage('json', 'fdp', '1879', staleReason({}, row('pass'))!);
    expect(msg).toContain('json fdp/1879');
    expect(msg).toContain("'pass'");
    expect(msg).toContain('retire the entry and its docs/known-divergences.md prose');
  });
});

describe('row normalizers', () => {
  it('maps every walker spelling and rejects unknown ones', () => {
    expect(normalizeVerdict('conformant')).toBe('pass');
    expect(normalizeVerdict('pass')).toBe('pass');
    expect(normalizeVerdict('oracleError')).toBe('oracle-error');
    expect(normalizeVerdict('portError')).toBe('port-error');
    expect(normalizeVerdict('timeout')).toBe('timeout');
    expect(normalizeVerdict('oracle-nondeterministic')).toBe('oracle-nondeterministic');
    expect(() => normalizeVerdict('crashed')).toThrow(/crashed/);
  });

  it('collects every error text on a row', () => {
    expect(engineRowOutcome({ status: 'port-error', err: MAP_MAX })).toEqual(row('port-error', [MAP_MAX]));
    expect(engineRowOutcome({ status: 'pass' })).toEqual(row('pass'));
    expect(flatRowOutcome({ verdict: 'oracle-error', errMsg: 'x' })).toEqual(row('oracle-error', ['x']));
    expect(
      mapRowOutcome({ verdict: 'port-error', cmapx: { errMsg: MAP_MAX }, imap: { errMsg: MAP_MAX } }),
    ).toEqual(row('port-error', [MAP_MAX, MAP_MAX]));
    expect(mapRowOutcome({ verdict: 'conformant', cmapx: {}, imap: {} })).toEqual(row('pass'));
    expect(
      formatsRowOutcome({ verdict: 'oracleError', formats: { plain: { errMsg: 'a' }, 'plain-ext': { errMsg: 'b' } } }),
    ).toEqual(row('oracle-error', ['a', 'b']));
    expect(formatsRowOutcome({ verdict: 'pass' })).toEqual(row('pass'));
  });
});

// ---------------------------------------------------------------------------
// The registry table: every per-id entry against its committed walk artifact.

/** Every engine a walker runs; an engine-less entry applies to all of them. */
const ENGINES = ['dot', 'circo', 'twopi', 'osage', 'patchwork', 'neato', 'fdp', 'sfdp'] as const;

interface Site {
  engine: string;
  id: string;
  entry: FaultAcceptance;
}

interface RegistryCase {
  name: string;
  file: string;
  /** Per-id entries, expanded to one site per engine they apply to. */
  sites: (registry: unknown) => Site[];
  artifact: (engine: string) => string;
  normalize: (row: never) => RawOutcome;
}

const corpusPath = (rel: string): string => fileURLToPath(new URL(`./${rel}`, import.meta.url));
const readJson = (rel: string): unknown => JSON.parse(readFileSync(corpusPath(rel), 'utf8'));

type ListEntry = FaultAcceptance & { id: string; engine?: string };

/** `divergences: [{ id, engine? }]` — an engine-less entry spans every engine. */
function listSites(registry: unknown): Site[] {
  const entries = (registry as { divergences?: ListEntry[] }).divergences ?? [];
  return entries.flatMap((entry) =>
    (entry.engine === undefined ? [...ENGINES] : [entry.engine]).map((engine) => ({ engine, id: entry.id, entry })),
  );
}

/** `engine → id → entry` — `{ class: true }` entries are computed, skipped. */
function engineMapSites(registry: unknown): Site[] {
  const sites: Site[] = [];
  for (const [engine, ids] of Object.entries(registry as Record<string, unknown>)) {
    if (engine === 'comment' || typeof ids !== 'object' || ids === null) continue;
    for (const [id, entry] of Object.entries(ids as Record<string, FaultAcceptance & { class?: unknown }>)) {
      if (entry.class === true) continue;
      sites.push({ engine, id, entry });
    }
  }
  return sites;
}

/** The dot engine's json/map artifacts carry no engine suffix. */
const suffixed = (stem: string) => (engine: string): string =>
  engine === 'dot' ? `${stem}.jsonl` : `${stem}-${engine}.jsonl`;

const REGISTRIES: RegistryCase[] = [
  {
    name: 'engines',
    file: 'accepted-divergences-engines.json',
    sites: engineMapSites,
    artifact: (e) => `parity-${e}.jsonl`,
    normalize: engineRowOutcome,
  },
  { name: 'json', file: 'accepted-divergences-json.json', sites: listSites, artifact: suffixed('json-parity'), normalize: flatRowOutcome },
  { name: 'map', file: 'accepted-divergences-map.json', sites: listSites, artifact: suffixed('map-parity'), normalize: mapRowOutcome },
  {
    name: 'plain',
    file: 'accepted-divergences-plain.json',
    sites: listSites,
    artifact: (e) => `plain-parity-${e}.jsonl`,
    normalize: formatsRowOutcome,
  },
  {
    name: 'dot-format',
    file: 'accepted-divergences-dot.json',
    sites: listSites,
    artifact: (e) => `dot-parity-${e}.jsonl`,
    normalize: formatsRowOutcome,
  },
  {
    name: 'xdot',
    file: 'accepted-divergences-xdot.json',
    sites: (r) => listSites(r).filter((s) => s.engine === 'dot'),
    artifact: () => 'xdot-parity.jsonl',
    normalize: flatRowOutcome,
  },
];

describe('accepted registries are backed by their committed walks', () => {
  for (const reg of REGISTRIES) {
    it(`${reg.name}: no stale per-id entries`, () => {
      const sites = reg.sites(readJson(reg.file));
      const artifacts = new Map<string, Map<string, RawOutcome>>();
      const stale: string[] = [];
      for (const { engine, id, entry } of sites) {
        const rel = reg.artifact(engine);
        let rows = artifacts.get(rel);
        if (rows === undefined) {
          expect(existsSync(corpusPath(rel)), `${reg.name}: artifact ${rel} for ${engine}/${id} is missing`).toBe(true);
          rows = loadOutcomes(corpusPath(rel), reg.normalize as (r: { id: string }) => RawOutcome);
          artifacts.set(rel, rows);
        }
        const reason = staleReason(entry, rows.get(id));
        if (reason !== null) stale.push(staleMessage(reg.name, engine, id, reason));
      }
      expect(stale, `stale ${reg.name} registry entries`).toEqual([]);
    });
  }
});
