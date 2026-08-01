// SPDX-License-Identifier: EPL-2.0
//
// Guard for the per-(graph, engine) exclusion registry.
//
// An exclusion removes an id from one engine's walk entirely, so it produces NO
// verdict. That is more dangerous than an acceptance: a bad acceptance forgives a
// real divergence, but a bad exclusion means nobody ever looks. These tests exist
// to keep every entry justified — a stated mechanism, an audited cost, and an
// alternative coverage story — and to keep the registry small enough to read.

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, it, expect } from 'vitest';
import { excludedFor, loadExclusions, type EngineExclusion } from './engine-exclusions.js';

const REGISTRY = new URL('./engine-exclusions.json', import.meta.url);
const ENGINES = new Set(['neato', 'fdp', 'sfdp', 'circo', 'twopi', 'osage', 'patchwork']);
const scratch = mkdtempSync(join(tmpdir(), 'engine-exclusions-'));

describe('engine-exclusions.json', () => {
  const entries = loadExclusions(REGISTRY);

  it('every entry names real engines and a real corpus id', () => {
    const manifestIds = new Set(
      (JSON.parse(
        readFileSync(fileURLToPath(new URL('./corpus-manifest.json', import.meta.url)), 'utf8'),
      ) as Array<{ id: string }>).map((e) => e.id),
    );
    for (const e of entries) {
      expect(manifestIds.has(e.id), `${e.id} is a corpus id`).toBe(true);
      expect(e.engines.length, `${e.id} names at least one engine`).toBeGreaterThan(0);
      for (const eng of e.engines) expect(ENGINES.has(eng), `${e.id}/${eng} is an engine`).toBe(true);
      // `dot` is never excludable here: these registries govern the NON-dot
      // engine tracks, and dot coverage is what usually justifies an exclusion.
      expect(e.engines).not.toContain('dot');
    }
  });

  it('every entry justifies itself — mechanism, cost, alternative coverage, ref', () => {
    for (const e of entries) {
      // Length floors, not mere presence: "slow" is not a mechanism. Each of
      // these fields is what a future reader needs to decide if it still holds.
      expect(e.mechanism.length, `${e.id} mechanism`).toBeGreaterThan(80);
      expect(e.cost.length, `${e.id} cost`).toBeGreaterThan(30);
      expect(e.coveredBy.length, `${e.id} coveredBy`).toBeGreaterThan(30);
      expect(e.ref.length, `${e.id} ref`).toBeGreaterThan(0);
    }
  });

  it('stays small — an exclusion list is a coverage hole, not a backlog', () => {
    // If this trips, the question is whether the RULE is being applied (degenerate
    // AND expensive AND covered elsewhere), not whether to raise the number.
    expect(entries.length).toBeLessThanOrEqual(10);
  });

  it('resolves per engine', () => {
    const twopi = excludedFor(REGISTRY, 'twopi');
    expect(twopi.has('2222'), '2222 excluded from twopi').toBe(true);
    // Not excluded where it is cheap and genuinely exercised.
    expect(excludedFor(REGISTRY, 'osage').has('2222')).toBe(false);
  });
});

describe('resolver edge cases', () => {
  function registryAt(name: string, body: unknown): URL {
    const p = join(scratch, name);
    writeFileSync(p, JSON.stringify(body));
    return pathToFileURL(p);
  }

  it('excludes nothing when the registry is absent', () => {
    expect(loadExclusions(pathToFileURL(join(scratch, 'nope.json')))).toEqual([]);
  });

  it('excludes nothing when the registry is malformed — fails toward MORE coverage', () => {
    const p = join(scratch, 'bad.json');
    writeFileSync(p, '{ not json');
    expect(loadExclusions(pathToFileURL(p))).toEqual([]);
    expect(excludedFor(pathToFileURL(p), 'twopi').size).toBe(0);
  });

  it('matches only the named engines', () => {
    const url = registryAt('one.json', {
      exclusions: [{ id: 'x', engines: ['circo'], mechanism: 'm', cost: 'c', coveredBy: 'b', ref: 'r' }],
    } satisfies { exclusions: EngineExclusion[] });
    expect(excludedFor(url, 'circo').has('x')).toBe(true);
    expect(excludedFor(url, 'twopi').has('x')).toBe(false);
  });
});

