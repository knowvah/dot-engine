// SPDX-License-Identifier: EPL-2.0
//
// Guard for the computed class-acceptance shape in the per-engine FORMAT
// registries (accepted-divergences-json.json, accepted-divergences-map.json)
// and for its resolver (accepted-class.ts).
//
// Sibling of accepted-divergences-engines.test.ts, which guards the same class
// shape for the xdot registry. The format registries gained class entries on
// 2026-07-29: their hand-enumerated A1-drift rosters had been copied from the
// then-current xdot roster and went stale on the 2026-07-27 corpus expansion,
// leaving 116 drift-exonerated ids reported as `diverged`. Membership is now
// COMPUTED from attribution-<engine>.json, so it tracks the corpus.

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, it, expect } from 'vitest';
import { classAcceptedIds, type FormatAcceptedRegistry } from './accepted-class.js';

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')) as T;
}

/** The engines the A1-drift class targets — the iterative solvers only. */
const ITERATIVE = new Set(['neato', 'fdp', 'sfdp']);
const VERDICTS = new Set(['drift-exonerated', 'not-cleared', 'harness-error']);
const SURFACES = ['json', 'map'] as const;

describe('format registry class acceptance', () => {
  for (const surface of SURFACES) {
    describe(`accepted-divergences-${surface}.json`, () => {
      const registry = readJson<FormatAcceptedRegistry>(`./accepted-divergences-${surface}.json`);

      it('declares a class entry for exactly the iterative engines', () => {
        const engines = (registry.classes ?? []).map((c) => c.engine);
        expect(new Set(engines)).toEqual(ITERATIVE);
        expect(engines.length, 'no duplicate class entries').toBe(ITERATIVE.size);
      });

      it('every class entry is well-formed', () => {
        for (const c of registry.classes ?? []) {
          expect(c.class, `class flag on ${surface}/${c.engine}`).toBe(true);
          expect(c.attributionFile, `attributionFile on ${surface}/${c.engine}`)
            .toMatch(/^attribution-.+\.json$/);
          expect(c.attributionFile).toBe(`attribution-${c.engine}.json`);
          expect(typeof c.ref, `ref on ${surface}/${c.engine}`).toBe('string');
          expect(c.ref.length, `ref on ${surface}/${c.engine} is non-empty`).toBeGreaterThan(0);
        }
      });

      it('resolves only drift-exonerated ids, for the named engine only', () => {
        const url = new URL(`./accepted-divergences-${surface}.json`, import.meta.url);
        for (const engine of ITERATIVE) {
          const resolved = classAcceptedIds(url, engine);
          const report = readJson<{ results: Array<{ id: string; verdict: string }> }>(
            `./attribution-${engine}.json`,
          );
          const exonerated = new Set(
            report.results.filter((r) => r.verdict === 'drift-exonerated').map((r) => r.id),
          );
          expect(resolved, `${surface}/${engine} class membership`).toEqual(exonerated);
          // Every attribution verdict is one the harness actually emits — a typo
          // would silently shrink the class rather than fail.
          for (const r of report.results) {
            expect(VERDICTS.has(r.verdict), `${engine}/${r.id} verdict=${r.verdict}`).toBe(true);
          }
        }
      });

      it('resolves nothing for an engine with no class entry', () => {
        const url = new URL(`./accepted-divergences-${surface}.json`, import.meta.url);
        expect(classAcceptedIds(url, 'dot').size).toBe(0);
        expect(classAcceptedIds(url, 'circo').size).toBe(0);
      });
    });
  }

  describe('resolver edge cases', () => {
    const scratch = mkdtempSync(join(tmpdir(), 'accepted-class-test-'));

    function registryAt(name: string, body: unknown): URL {
      const p = join(scratch, name);
      writeFileSync(p, JSON.stringify(body));
      return pathToFileURL(p);
    }

    it('exonerates nothing when the attribution file is absent (pending state)', () => {
      const url = registryAt('pending.json', {
        classes: [{ class: true, engine: 'fdp', attributionFile: 'attribution-nonexistent.json', ref: 'x' }],
      });
      expect(classAcceptedIds(url, 'fdp').size).toBe(0);
    });

    it('exonerates nothing when the attribution file is unreadable', () => {
      writeFileSync(join(scratch, 'attribution-broken.json'), '{ not json');
      const url = registryAt('broken.json', {
        classes: [{ class: true, engine: 'fdp', attributionFile: 'attribution-broken.json', ref: 'x' }],
      });
      expect(classAcceptedIds(url, 'fdp').size).toBe(0);
    });

    it('returns an empty set for a registry with no classes key', () => {
      const url = registryAt('noclasses.json', { divergences: [{ id: 'a', engine: 'fdp' }] });
      expect(classAcceptedIds(url, 'fdp').size).toBe(0);
    });

    it('returns an empty set for an unreadable registry', () => {
      const p = join(scratch, 'garbage.json');
      writeFileSync(p, 'not json at all');
      expect(classAcceptedIds(pathToFileURL(p), 'fdp').size).toBe(0);
    });

    it('ignores a class entry whose class flag is not true', () => {
      writeFileSync(
        join(scratch, 'attribution-real.json'),
        JSON.stringify({ results: [{ id: 'zz', verdict: 'drift-exonerated' }] }),
      );
      const url = registryAt('notflag.json', {
        classes: [{ class: 'A1', engine: 'fdp', attributionFile: 'attribution-real.json', ref: 'x' }],
      });
      expect(classAcceptedIds(url, 'fdp').size).toBe(0);
    });

    it('admits only drift-exonerated rows from a present attribution file', () => {
      writeFileSync(
        join(scratch, 'attribution-mixed.json'),
        JSON.stringify({
          results: [
            { id: 'ok', verdict: 'drift-exonerated' },
            { id: 'nope', verdict: 'not-cleared' },
            { id: 'broken', verdict: 'harness-error' },
          ],
        }),
      );
      const url = registryAt('mixed.json', {
        classes: [{ class: true, engine: 'fdp', attributionFile: 'attribution-mixed.json', ref: 'x' }],
      });
      expect(classAcceptedIds(url, 'fdp')).toEqual(new Set(['ok']));
    });
  });
});
