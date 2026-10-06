// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import {
  assertLocaleComplete,
  EN,
  LOCALES,
  navFor,
  sidebarFor,
  stringsForLang,
  TRANSLATABLE_EXCLUDES,
  type NavLabels,
  type SidebarGroup,
} from '../../docs-site/.vitepress/i18n.js';
import {
  EN_COMPONENTS,
  pickStrings,
  type ComponentStrings,
} from '../../docs-site/.vitepress/theme/strings.js';

const FIXTURE_ROOT = fileURLToPath(new URL('./fixtures/site/', import.meta.url));
const FIXTURE_LOCALES = ['xx', 'yy'];
const XX_UI: NavLabels = { ...EN, guide: 'Gyde', englishOnly: '(Inglish)' };

describe('assertLocaleComplete', () => {
  it('names the missing translatable page', () => {
    expect(() =>
      assertLocaleComplete(FIXTURE_ROOT, 'xx', TRANSLATABLE_EXCLUDES, FIXTURE_LOCALES),
    ).toThrow(/missing 1 of 3 pages:\n {2}docs-site\/xx\/guide\/api\.md\n/);
  });

  it('ignores excluded pages, dot-dirs, public/ and other locales', () => {
    // yy lacks parity*.md, engines.md, perf.md, showcase/ and reference/,
    // all excluded; .vitepress/ and public/ pages are not English pages; and
    // xx's own tree must not count as English pages for yy.
    expect(() =>
      assertLocaleComplete(FIXTURE_ROOT, 'yy', TRANSLATABLE_EXCLUDES, FIXTURE_LOCALES),
    ).not.toThrow();
  });

  it('counts a page as missing once its exclusion is lifted', () => {
    expect(() =>
      assertLocaleComplete(FIXTURE_ROOT, 'yy', ['engines.md'], FIXTURE_LOCALES),
    ).toThrow(/docs-site\/yy\/parity\.md/);
  });
});

describe('navFor / sidebarFor', () => {
  const nav = navFor('/xx', XX_UI);

  it('prefixes translated pages and keeps English-only ones unprefixed', () => {
    expect(nav.find((i) => i.link === '/xx/guide/getting-started')?.text).toBe('Gyde');
    const parity = nav.find((i) => i.link === '/engines');
    expect(parity?.text).toBe('Parity (Inglish)');
    expect(nav.some((i) => i.link.startsWith('/xx/engines'))).toBe(false);
  });

  it('marks every unprefixed sidebar link English-only', () => {
    const links = sidebarFor('/xx', XX_UI).flatMap((g) => g.items);
    const unprefixed = links.filter((i) => !i.link.startsWith('/xx/'));
    expect(unprefixed.map((i) => i.link)).toEqual([
      '/reference/', '/parity', '/engines', '/perf',
    ]);
    for (const item of unprefixed) expect(item.text.endsWith('(Inglish)')).toBe(true);
    expect(links.find((i) => i.link === '/xx/conformance')?.text).toBe(
      'Conformance (what "match" means)',
    );
  });

  it('reproduces the English nav exactly for the root', () => {
    expect(navFor('', EN)).toEqual([
      { text: 'Overview', link: '/guide/overview' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Showcase', link: '/showcase/' },
      { text: 'Playground', link: '/playground' },
      { text: 'API', link: '/guide/api' },
      { text: 'Conformance', link: '/conformance' },
      { text: 'Parity', link: '/engines' },
    ]);
  });

  it('reproduces the English sidebar groups and links for the root', () => {
    const groups: SidebarGroup[] = sidebarFor('', EN);
    expect(groups.map((g) => [g.text, g.items.length])).toEqual([
      ['Introduction', 4], ['Guides', 7], ['Showcase', 9],
      ['Recipes', 1], ['Migrating', 2], ['Reference', 10],
    ]);
    const reference = groups[5]!.items;
    expect(reference[3]).toEqual({ text: 'Generated API (TypeDoc)', link: '/reference/' });
    expect(reference[9]).toEqual({ text: 'Performance dashboard', link: '/perf' });
    expect(groups[2]!.items[8]).toEqual({ text: 'patchwork', link: '/showcase/patchwork' });
  });
});

describe('component strings', () => {
  const de: ComponentStrings = { ...EN_COMPONENTS, exportSvg: 'SVG exportieren' };

  it('falls back to English for an unknown lang', () => {
    expect(stringsForLang('zz-ZZ')).toBe(EN_COMPONENTS);
    expect(pickStrings('zz-ZZ', { 'de-DE': de })).toBe(EN_COMPONENTS);
    expect(pickStrings('de-DE', undefined)).toBe(EN_COMPONENTS);
  });

  it('picks the registered lang', () => {
    expect(pickStrings('de-DE', { 'de-DE': de }).exportSvg).toBe('SVG exportieren');
  });

  it('registers exactly the locale modules on disk', () => {
    // Each registered locale must resolve to its own strings.
    for (const loc of Object.values(LOCALES)) {
      expect(stringsForLang(loc.lang)).toBe(loc.components);
    }
  });
});
