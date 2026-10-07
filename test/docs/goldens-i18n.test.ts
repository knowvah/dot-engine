// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EN_COMPONENTS, pickStrings } from '../../docs-site/.vitepress/theme/strings.js';

interface Entry {
  id: string;
  engine: string;
  toleranceClass: string;
  input: string;
  description: string;
}
type Showcase = Record<string, unknown>;
interface CopyGoldens {
  EN_SHOWCASE: { blurbs: Record<string, string> } & Record<string, unknown>;
  fillTemplate(t: string, vars: Record<string, string | number>): string;
  resolveShowcase(o: Showcase | undefined): { blurbs: Record<string, string> } & Record<string, string>;
  localizeGoldens(
    entries: Entry[],
    translations: Record<string, unknown>,
  ): { entries: Entry[]; missingIds: string[] };
  renderShowcaseIndex(
    prefix: string,
    order: string[],
    counts: Record<string, number>,
    strings: Showcase | undefined,
  ): string;
  renderEnginePage(engine: string, count: number, strings: Showcase | undefined): string;
  yamlScalar(value: string): string;
  listLocalePrefixes(dir: string): string[];
}

const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));
const mod = (await import(
  pathToFileURL(here('../../docs-site/copy-goldens.mjs')).href
)) as CopyGoldens;

const FIX = 'fixtures/goldens/';
const MANIFEST = JSON.parse(readFileSync(here(`${FIX}manifest.json`), 'utf8')) as Entry[];
const XX = JSON.parse(readFileSync(here(`${FIX}locales/goldens/xx.json`), 'utf8')) as Record<
  string,
  unknown
>;
const ORDER = ['dot', 'neato'];
const COUNTS = { dot: 2, neato: 1 };

describe('localizeGoldens', () => {
  it('translates covered ids, keeps English for the rest and names it', () => {
    const { entries, missingIds } = mod.localizeGoldens(MANIFEST, XX);
    expect(entries.map((e) => e.description)).toEqual([
      'Ferst gulden',
      'Second golden',
      'Therd gulden',
    ]);
    expect(missingIds).toEqual(['g-two']);
  });

  it('never treats $-keys as ids and does not mutate the manifest', () => {
    const { entries, missingIds } = mod.localizeGoldens(MANIFEST, { $showcase: {} });
    expect(missingIds).toEqual(['g-one', 'g-two', 'g-three']);
    expect(entries).toEqual(MANIFEST);
    expect(MANIFEST[0]?.description).toBe('First golden');
  });
});

describe('showcase rendering', () => {
  it('fills placeholders and leaves unknown ones intact', () => {
    expect(mod.fillTemplate('{a}-{b}-{c}', { a: 1, b: 'x' })).toBe('1-x-{c}');
  });

  it('merges overrides over English per key and per engine blurb', () => {
    const s = mod.resolveShowcase({ indexTitle: 'T', blurbs: { dot: 'D' } });
    expect(s.indexTitle).toBe('T');
    expect(s.indexHeading).toBe('Showcase — the golden corpus');
    expect(s.blurbs.dot).toBe('D');
    expect(s.blurbs.neato).toBe(mod.EN_SHOWCASE.blurbs.neato);
  });

  it('renders English index with unprefixed links', () => {
    const md = mod.renderShowcaseIndex('', ORDER, COUNTS, undefined);
    expect(md).toContain('- [**dot**](/showcase/dot) — Hierarchical, layered layout for directed graphs. _(2 goldens)_');
    expect(md).toContain('one of **3 golden test cases**');
    expect(md).toContain('(see [Conformance](/conformance)).');
  });

  it('prefixes every internal link and translates prose for xx', () => {
    const md = mod.renderShowcaseIndex('xx', ORDER, COUNTS, XX.$showcase as Showcase);
    expect(md).toContain('title: Shoecase\n');
    expect(md).toContain('# Shoecase - the gulden corpus');
    expect(md).toContain('- [**dot**](/xx/showcase/dot) — Layerd layout. _(2 goldens)_');
    expect(md).toContain('- [**neato**](/xx/showcase/neato) — Spring-model');
    expect(md).toContain('(see [Conformens](/xx/conformance)).');
    expect(md).not.toContain('](/conformance)');
    expect(md).not.toContain('](/showcase/');
  });

  it('quotes a translated title that YAML cannot read as a plain scalar', () => {
    const md = mod.renderEnginePage('dot', 2, { engineTitle: '{engine}: golden' } as Showcase);
    expect(md.startsWith('---\ntitle: "dot: golden"\n---\n')).toBe(true);
    expect(mod.yamlScalar('dot goldens')).toBe('dot goldens');
    expect(mod.yamlScalar('#1 "x"')).toBe('"#1 \\"x\\""');
  });

  it('renders an engine page with translated heading and the gallery tag', () => {
    const md = mod.renderEnginePage('dot', 2, XX.$showcase as Showcase);
    expect(md).toBe(`---
title: dot goldens
---

# dot - 2 guldens

Layerd layout. Each graph below is rendered live in your browser by the library.

<GoldenGallery engine="dot" />
`);
  });
});

describe('listLocalePrefixes', () => {
  it('lists only *.ts modules, not subdirectories or other files', () => {
    expect(mod.listLocalePrefixes(here(`${FIX}locales`))).toEqual(['xx']);
  });

  it('returns no locales for a missing directory', () => {
    expect(mod.listLocalePrefixes(here(`${FIX}nope`))).toEqual([]);
  });
});

describe('GoldenGallery strings', () => {
  const SRC = readFileSync(
    here('../../docs-site/.vitepress/theme/GoldenGallery.vue'),
    'utf8',
  );
  const XX_STRINGS = { ...EN_COMPONENTS, close: 'Clos', rendering: 'rendrin…' };

  it('resolves the active locale and falls back to English at the root', () => {
    expect(pickStrings('xx-XX', { 'xx-XX': XX_STRINGS }).close).toBe('Clos');
    expect(pickStrings('en-US', { 'xx-XX': XX_STRINGS }).rendering).toBe('rendering…');
  });

  it('uses component strings and no Node built-ins or i18n.ts', () => {
    expect(SRC).toContain("pickStrings(lang.value, theme.value.componentsByLang)");
    expect(SRC).not.toMatch(/from 'node:/);
    expect(SRC).not.toMatch(/from '\.\.\/i18n/);
    for (const usage of [
      't.value.renderFailed',
      't.clickToEnlarge',
      't.rendering',
      't.dotSource',
      't.close',
    ]) {
      expect(SRC).toContain(usage);
    }
  });
});
