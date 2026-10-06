// SPDX-License-Identifier: EPL-2.0
import { defineConfigWithTheme, type DefaultTheme } from 'vitepress';
import { dotMarkdown } from '@knowvah/vitepress-plugin-dot/markdown-it';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { dotLang } from './dot.tmLanguage.js';
import type { ComponentStrings } from './theme/strings.js';
import {
  assertLocaleComplete,
  COMPONENTS_BY_LANG,
  EN,
  LOCALES,
  navFor,
  sidebarFor,
  TRANSLATABLE_EXCLUDES,
} from './i18n.js';

/** The default theme's config plus this site's component-strings table. */
export interface SiteThemeConfig extends DefaultTheme.Config {
  componentsByLang?: Readonly<Record<string, ComponentStrings>>;
}

const DOCS_ROOT = path.resolve(import.meta.dirname, '..');
for (const prefix of Object.keys(LOCALES)) {
  assertLocaleComplete(DOCS_ROOT, prefix, TRANSLATABLE_EXCLUDES);
}

/**
 * The `locales:` block — root English plus every registered translation.
 * Only complete languages appear; see `i18n.ts` on why a half-translated
 * locale is worse than an absent one.
 */
function localesConfig() {
  return {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: { nav: navFor('', EN), sidebar: sidebarFor('', EN) },
    },
    ...Object.fromEntries(
      Object.entries(LOCALES).map(([prefix, loc]) => [
        prefix,
        {
          label: loc.label,
          lang: loc.lang,
          themeConfig: {
            nav: navFor(`/${prefix}`, loc.ui),
            sidebar: sidebarFor(`/${prefix}`, loc.ui),
          },
        },
      ]),
    ),
  };
}

// Deployed at https://dot-engine.knowvah.com/ (GitHub Pages custom domain) —
// the site is served from the domain root, so base MUST be '/'. A '/<repo>/'
// base makes every CSS/JS/font asset 404 and the page renders unstyled.

export default defineConfigWithTheme<SiteThemeConfig>({
  base: '/',
  title: '@knowvah/dot-engine',
  description:
    'A faithful, pure-TypeScript port of Graphviz. DOT in, SVG out — no Java, ' +
    'no native binary, no WASM. Runs in the browser.',
  lang: 'en-US',
  cleanUrls: true,
  locales: localesConfig(),
  markdown: {
    // Register the DOT grammar so ```dot fences highlight (Shiki bundles none).
    languages: [dotLang],
    // ```graphviz fences render to SVG via @knowvah/vitepress-plugin-dot (the
    // plugin extracted from these docs' former inline fence hook). Options:
    // - renderLanguage 'graphviz': plain ```dot fences stay highlighted
    //   source — the guides include a documented infinite-loop example that
    //   must NOT render.
    // - mode 'client': DotDiagram renders in the browser through the vite
    //   alias below, so diagrams use the live `src` engine and docs stay in
    //   lockstep with the library — same reason the playground imports the
    //   real source. (Build mode would resolve @knowvah/dot-engine from
    //   node_modules — a published snapshot, not this repo's src.)
    // - wrapperClass 'dot-figure': reuse the existing custom.css styling.
    config: (md) =>
      dotMarkdown(md, {
        renderLanguage: 'graphviz',
        mode: 'client',
        useCurrentColor: true,
        wrapperClass: 'dot-figure',
      }),
  },
  head: [
    // The mark comes from @knowvah/theme, copied into docs-site/public/ by
    // `npm run docs:brand` (docs-site/copy-brand-assets.mjs).
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/knowvah_logo.svg' }],
    ['meta', { name: 'theme-color', content: '#c45d3e' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: '@knowvah/dot-engine' }],
  ],
  themeConfig: {
    // Nav-bar mark, beside the site title.
    logo: '/knowvah_logo.svg',
    // Built-in offline search (MiniSearch); no external service.
    search: { provider: 'local' },
    // `lang` → component strings for every registered locale; theme
    // components resolve theirs with `pickStrings` (theme/strings.ts), since
    // the filesystem-reading registry cannot reach the client bundle.
    componentsByLang: COMPONENTS_BY_LANG,
    socialLinks: [
      { icon: 'github', link: 'https://github.com/knowvah/dot-engine' },
    ],
  },
  vite: {
    resolve: {
      alias: {
        // The playground imports the *real* engine source, so docs stay in
        // lockstep with the library rather than a copied bundle.
        '@knowvah/dot-engine': fileURLToPath(
          new URL('../../src/index.ts', import.meta.url),
        ),
      },
    },
  },
});
