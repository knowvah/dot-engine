// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  ALL_LOCALE_PREFIXES,
  TRANSLATABLE_EXCLUDES,
} from '../../docs-site/.vitepress/i18n.js';

interface Status {
  prefix: string;
  missing: string[];
  stale: string[];
  noHash: string[];
  orphaned: string[];
}
interface HashMod {
  LOCALE_PREFIX_PATTERN: RegExp;
  englishSourceFor(p: string, root?: string): string;
  hashSource(p: string, root?: string): string;
  parseSourceHash(md: string): string | undefined;
}
interface StatusMod {
  TRANSLATABLE_EXCLUDES: string[];
  detectLocales(root: string): string[];
  englishPages(root: string, localeDirs: string[]): string[];
  englishUrl(rel: string): string;
  localeStatus(root: string, prefix: string, localeDirs: string[]): Status;
  missingGoldenIds(manifest: unknown[], translations: unknown): string[];
  staleHashes(statuses: Status[]): Record<string, string>;
  formatLocale(s: Status, goldenIds: string[]): string;
  writeHashes(root: string, statuses: Status[]): Record<string, string>;
}

const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));
const load = async <T>(rel: string): Promise<T> =>
  (await import(pathToFileURL(here(rel)).href)) as T;
const hashMod = await load<HashMod>('../../scripts/i18n-hash.mjs');
const status = await load<StatusMod>('../../scripts/docs-i18n-status.mjs');

const ROOT = here('fixtures/status/');
const sha = (s: string): string => createHash('sha256').update(s).digest('hex');
const LOCALES = ['xx', 'yy'];

describe('englishSourceFor / hashSource', () => {
  it('maps the include wrappers to the docs/ sources', () => {
    expect(hashMod.englishSourceFor('docs-site/xx/divergences.md')).toBe(
      'docs/known-divergences.md',
    );
    expect(hashMod.englishSourceFor('docs-site/pt-br/conformance.md')).toBe(
      'docs/conformance.md',
    );
  });

  it('maps every other page to its English twin, absolute paths included', () => {
    expect(hashMod.englishSourceFor('docs-site/xx/guide/api.md')).toBe('docs-site/guide/api.md');
    expect(hashMod.englishSourceFor(`${ROOT}docs-site/xx/guide/api.md`, ROOT)).toBe(
      'docs-site/guide/api.md',
    );
  });

  it('rejects paths that are not locale pages', () => {
    expect(() => hashMod.englishSourceFor('docs-site/guide/api.md')).toThrow(/not a locale page/);
  });

  it('hashes file bytes as 64 lowercase hex chars', () => {
    expect(hashMod.hashSource('docs-site/guide/api.md', ROOT)).toBe(sha('# API\n'));
  });

  it('prints the hash from the CLI', () => {
    const r = spawnSync('node', [here('../../scripts/i18n-hash.mjs'), `${ROOT}docs-site/guide/api.md`], {
      encoding: 'utf8',
    });
    expect(r.stdout).toBe(`${sha('# API\n')}\n`);
    expect(r.status).toBe(0);
  });

  it('reads sourceHash from front matter only', () => {
    const h = sha('x');
    expect(hashMod.parseSourceHash(`---\ntitle: t\nsourceHash: ${h}\n---\nbody`)).toBe(h);
    expect(hashMod.parseSourceHash(`# no front matter\nsourceHash: ${h}`)).toBeUndefined();
    expect(hashMod.parseSourceHash('---\ntitle: t\n---\n')).toBeUndefined();
  });
});

describe('localeStatus', () => {
  it('finds locales from modules and directories', () => {
    expect(status.detectLocales(ROOT)).toEqual(LOCALES);
  });

  it('classifies pages by hash and lists missing ones', () => {
    expect(status.localeStatus(ROOT, 'xx', LOCALES)).toEqual({
      prefix: 'xx',
      missing: [],
      stale: ['guide/api.md'],
      noHash: ['divergences.md'],
      orphaned: ['guide/gone.md'],
    });
    expect(status.localeStatus(ROOT, 'yy', LOCALES).missing).toEqual([
      'conformance.md',
      'divergences.md',
      'guide/api.md',
      'guide/overview.md',
    ]);
  });

  it('is not stale until the English source changes', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'i18n-status-'));
    try {
      cpSync(ROOT, tmp, { recursive: true });
      expect(status.localeStatus(tmp, 'xx', LOCALES).stale).toEqual(['guide/api.md']);
      writeFileSync(join(tmp, 'docs-site/guide/overview.md'), '# Overview, edited\n');
      writeFileSync(join(tmp, 'docs/conformance.md'), '# Conformance, edited\n');
      expect(status.localeStatus(tmp, 'xx', LOCALES).stale).toEqual([
        'conformance.md',
        'guide/api.md',
        'guide/overview.md',
      ]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('banner data', () => {
  it('maps stale locale pages to English URLs', () => {
    const s = status.localeStatus(ROOT, 'xx', LOCALES);
    expect(status.staleHashes([s, { ...s, prefix: 'de', stale: ['conformance.md', 'index.md'] }])).toEqual({
      'xx/guide/api.md': '/guide/api',
      'de/conformance.md': '/conformance',
      'de/index.md': '/',
    });
  });

  it('writes the hashes file the banner imports', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'i18n-hashes-'));
    try {
      const s = status.localeStatus(ROOT, 'xx', LOCALES);
      status.writeHashes(tmp, [s]);
      expect(JSON.parse(readFileSync(join(tmp, 'docs-site/.vitepress/i18n-hashes.json'), 'utf8'))).toEqual({
        'xx/guide/api.md': '/guide/api',
      });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('maps nested index pages to a directory URL', () => {
    expect(status.englishUrl('guide/index.md')).toBe('/guide/');
  });
});

describe('report', () => {
  it('lists golden ids without a translation', () => {
    const manifest = [{ id: 'g-one', description: 'a' }, { id: 'g-two', description: 'b' }];
    expect(status.missingGoldenIds(manifest, { 'g-one': 'A' })).toEqual(['g-two']);
    expect(status.missingGoldenIds(manifest, undefined)).toEqual(['g-one', 'g-two']);
  });

  it('formats counts and items per category', () => {
    const out = status.formatLocale(status.localeStatus(ROOT, 'xx', LOCALES), ['g-two']);
    expect(out).toBe(
      [
        'xx:',
        '  missing pages: 0',
        '  stale pages: 1',
        '    - guide/api.md',
        '  pages without sourceHash: 1',
        '    - divergences.md',
        '  pages whose English source is gone: 1',
        '    - guide/gone.md',
        '  golden descriptions still English: 1',
        '    - g-two',
      ].join('\n'),
    );
  });

  it('exits 0 with stale pages present', () => {
    const r = spawnSync('node', [here('../../scripts/docs-i18n-status.mjs')], { encoding: 'utf8' });
    expect(r.status).toBe(0);
  });
});

describe('agreement with i18n.ts', () => {
  it('uses the same excludes', () => {
    expect(status.TRANSLATABLE_EXCLUDES).toEqual([...TRANSLATABLE_EXCLUDES]);
  });

  it('recognizes every registered prefix', () => {
    expect(ALL_LOCALE_PREFIXES.filter((p) => !hashMod.LOCALE_PREFIX_PATTERN.test(p))).toEqual([]);
  });

  it('computes the English page set the completeness check uses', () => {
    expect(status.englishPages(ROOT, LOCALES)).toEqual([
      'conformance.md',
      'divergences.md',
      'guide/api.md',
      'guide/overview.md',
      'index.md',
    ]);
  });
});
