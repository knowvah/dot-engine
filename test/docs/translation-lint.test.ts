// SPDX-License-Identifier: EPL-2.0
// Mechanical half of translation review (translation-spec.md "Hard rules"):
// what can still be verified without reading the language. Runs against the
// real docs-site for every registered locale, and against fixtures that plant
// one defect per check.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  LOCALES,
  TRANSLATABLE_EXCLUDES,
} from '../../docs-site/.vitepress/i18n.js';
import {
  EN_COMPONENTS,
  type ComponentStrings,
} from '../../docs-site/.vitepress/theme/strings.js';
import {
  CHECKS,
  checkComponents,
  englishOnlyMatcher,
  extractInternalLinks,
  lintPage,
  listTranslatedPages,
  loadPage,
  parsePage,
  scanFences,
  staticAssetsOf,
  type LinkContext,
  type Violation,
} from '../helpers/docs.js';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const FIXTURE = fileURLToPath(new URL('./fixtures/lint/', import.meta.url));

function contextFor(root: string, prefix: string): LinkContext {
  return {
    prefix,
    isEnglishOnly: englishOnlyMatcher(TRANSLATABLE_EXCLUDES),
    staticAssets: staticAssetsOf(root),
  };
}

describe('translated pages of registered locales', () => {
  const prefixes = Object.keys(LOCALES).sort();
  it(`lints ${prefixes.length} locales`, () => {
    const dir = `${REPO}docs-site/.vitepress/locales`;
    const modules = existsSync(dir)
      ? readdirSync(dir).filter((f) => f.endsWith('.ts')).map((f) => f.slice(0, -3)).sort()
      : [];
    expect(prefixes).toEqual(modules);
  });

  for (const prefix of prefixes) {
    const locale = LOCALES[prefix];
    if (!locale) continue;
    const ctx = contextFor(REPO, prefix);
    const strings = { en: EN_COMPONENTS, locale: locale.components };
    describe(prefix, () => {
      for (const rel of listTranslatedPages(REPO, prefix)) {
        const found = lintPage(REPO, rel, ctx, strings);
        it.each(CHECKS)(`${rel}: %s`, (check) => {
          expect(found.filter((x) => x.check === check).map((x) => x.message)).toEqual([]);
        });
      }
    });
  }
});

describe('lint against planted defects (fixture locale xx)', () => {
  const ctx = contextFor(FIXTURE, 'xx');
  const XX: ComponentStrings = { ...EN_COMPONENTS, exportSvg: 'Xport SVG' };
  const lint = (rel: string): Violation[] =>
    lintPage(FIXTURE, rel, ctx, { en: EN_COMPONENTS, locale: XX });

  it('lists fixture pages without the generated showcase', () => {
    expect(listTranslatedPages(FIXTURE, 'xx')).toEqual([
      'guide/clean.md',
      'guide/comp.md',
      'guide/fence.md',
      'guide/hash.md',
      'guide/hero.md',
      'guide/include.md',
      'guide/link.md',
      'guide/tag.md',
    ]);
  });

  it('passes the clean page on every check', () => {
    expect(lint('guide/clean.md')).toEqual([]);
  });

  it('fails a changed character in a dot fence, naming file and fence number', () => {
    expect(lint('guide/fence.md')).toEqual([
      {
        check: 'fences',
        file: 'docs-site/xx/guide/fence.md',
        message: 'fence #1 (dot): body differs from English',
      },
    ]);
  });

  it('fails an unprefixed link but allows /parity, /reference, /img and static files', () => {
    expect(lint('guide/link.md')).toEqual([
      {
        check: 'links',
        file: 'docs-site/xx/guide/link.md',
        message: 'link /guide/clean must be prefixed /xx/ (or be English-only/static)',
      },
    ]);
  });

  it('counts front-matter link: values as links', () => {
    expect(lint('guide/hero.md').map((x) => x.message)).toEqual([
      'link /guide/clean must be prefixed /xx/ (or be English-only/static)',
    ]);
  });

  it('fails a component string left in English', () => {
    expect(lint('guide/comp.md').map((x) => x.message)).toEqual([
      'exportSvg: missing "Xport SVG"',
      'exportSvg: English "Export SVG" remains',
    ]);
  });

  it('leaves control words alone on a page that embeds no component', () => {
    const en = parsePage('# Guide\n\nClick Export SVG, or pass the DOT source.\n');
    const tr = parsePage('# Gyde\n\nKlick Export SVG, or pass the DOT source.\n');
    const strings = { en: EN_COMPONENTS, locale: XX };
    expect(checkComponents(en, tr, strings, 'xx/guide/prose.md')).toEqual([]);
  });

  it('fails a missing sourceHash', () => {
    expect(lint('guide/hash.md').map((x) => x.message)).toEqual([
      'front matter has no sourceHash',
    ]);
  });

  it('fails a dropped <Playground tag', () => {
    expect(lint('guide/tag.md').map((x) => x.message)).toEqual([
      '<Playground> count 0, English has 1',
    ]);
  });

  it('fails a leftover @include directive', () => {
    expect(lint('guide/include.md').map((x) => x.message)).toEqual([
      'contains an <!--@include: directive; translate the included content',
    ]);
  });
});

describe('helpers', () => {
  it('keeps a ```` fence containing ``` as one block and supports ~~~', () => {
    const { fences } = scanFences('````md\n```x\ny\n```\n````\n\n~~~ts\nlet a;\n~~~\n');
    expect(fences).toEqual([
      { info: 'md', body: '```x\ny\n```' },
      { info: 'ts', body: 'let a;' },
    ]);
  });

  it('extracts markdown and html links, skipping code and external URLs', () => {
    const page = parsePage(
      '[a](/x/y#z) <a href="/p?q=1">b</a> `[c](/code)` [d](https://e.com) [e](//cdn/x)\n```\n[f](/fence)\n```\n',
    );
    expect(extractInternalLinks(page.prose)).toEqual(['/x/y#z', '/p?q=1']);
  });

  it('derives English-only URLs from the excludes, not showcase', () => {
    const only = englishOnlyMatcher(TRANSLATABLE_EXCLUDES);
    expect(['/parity', '/parity-dot-plain', '/engines', '/perf', '/reference/types'].filter(only)).toEqual([
      '/parity',
      '/parity-dot-plain',
      '/engines',
      '/perf',
      '/reference/types',
    ]);
    expect(['/showcase/dot', '/guide/api', '/engines/x'].filter(only)).toEqual([]);
  });

  it('parses front matter keys and link values', () => {
    const page = loadPage(`${FIXTURE}docs-site/xx/guide/hero.md`);
    expect(page.frontMatter['title']).toBe('Home');
    expect(page.frontMatterLinks).toEqual(['/guide/clean']);
  });
});
