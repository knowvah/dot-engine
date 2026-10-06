// SPDX-License-Identifier: EPL-2.0
/**
 * Locale registry for the documentation site.
 *
 * English is served at the root. Every other language is a URL prefix
 * (`/de/…`), and the set of languages follows the Knowvah docs sites'
 * convention (the 23 non-English locales dot-atlassian ships).
 *
 * ## Locales are discovered, not hand-listed
 *
 * Each translated language is a module at
 * `docs-site/.vitepress/locales/<prefix>.ts` that default-exports a single
 * `DocsLocale`. This file discovers every such module by reading the
 * `locales/` directory and dynamically importing each entry — adding a
 * language means adding its module, with no edit here or in `config.ts`.
 *
 * This is not `import.meta.glob`. VitePress (and Vite) load `.vitepress/
 * config.ts` through `loadConfigFromFile` → `bundleConfigFile`, which
 * bundles the config's entire relative-import graph with plain esbuild and
 * runs the result directly under Node — that path never enters Vite's own
 * plugin container, which is what implements the `import.meta.glob` macro.
 * A glob call anywhere in this file's import graph is therefore an
 * undefined property access at runtime (`TypeError: ... .glob is not a
 * function`) — established against the same toolchain in dot-atlassian's
 * docs site, whose registry this one ports. Because `config.ts` runs only in
 * Node at build time — never shipped to a browser — a `readdirSync` plus a
 * dynamic `import()` of the resulting path carries none of the "can't be
 * statically analyzed for a client bundle" risk that pattern normally warns
 * about; Node resolves it directly, and (as of Node 22.18+/24) loads the
 * `.ts` module natively. The repo pins node 26.3.1.
 *
 * Consequently a locale module must be loadable by Node's type stripping on
 * its own: data only, and `import type` for anything it names from here.
 *
 * ## Only complete locales are registered
 *
 * VitePress does **not** fall back to the default locale for a missing page —
 * a registered locale with a missing page gives the reader a 404 from the
 * language switcher. So a locale module belongs in `locales/` only once all
 * of its pages exist, and translations land one language at a time.
 * `assertLocaleComplete` (called from `config.ts`) enforces this at build
 * time. A half-finished language is worse than an absent one.
 *
 * ## This module is build-side only
 *
 * It reads the filesystem, so theme components must never import it. They
 * receive each locale's component strings through `themeConfig`
 * (`componentsByLang`) and resolve them with `pickStrings` from
 * `theme/strings.ts`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { EN_COMPONENTS, pickStrings, type ComponentStrings } from './theme/strings.js';

/** Nav and sidebar labels — one field per text in the English config. */
export interface NavLabels {
  // nav
  overview: string;
  guide: string;
  showcase: string;
  playground: string;
  api: string;
  conformance: string;
  parity: string;
  // sidebar groups
  introduction: string;
  guides: string;
  recipes: string;
  migrating: string;
  reference: string;
  // Introduction
  overviewMentalModel: string;
  gettingStarted: string;
  layoutEngines: string;
  glossary: string;
  // Guides
  browserUsage: string;
  buildAGraph: string;
  readGeometry: string;
  textMeasurement: string;
  images: string;
  renderFormats: string;
  xdotDrawops: string;
  // Showcase
  goldenCorpus: string;
  // Recipes
  recipesCookbook: string;
  // Migrating
  fromCCli: string;
  fromJsLibs: string;
  // Reference
  apiCurated: string;
  errors: string;
  types: string;
  typedoc: string;
  conformanceMatch: string;
  knownDivergences: string;
  parityDot: string;
  parityEngines: string;
  perf: string;
  /** Appended to the label of every English-only page in a non-root locale. */
  englishOnly: string;
}

export interface DocsLocale {
  /** Shown in the language switcher, written in that language. */
  label: string;
  /** `lang` attribute on `<html>`, e.g. `de-DE`. */
  lang: string;
  /** Nav and sidebar labels. */
  ui: NavLabels;
  /** Playground / GoldenGallery / stale-banner strings. */
  components: ComponentStrings;
}

/**
 * Every prefix a translation may live under, registered or not. The
 * completeness walk skips these directories when collecting the English page
 * set, so a half-written (or quarantined) locale's pages are never mistaken
 * for English ones.
 */
export const ALL_LOCALE_PREFIXES = [
  'cs', 'da', 'de', 'es', 'et', 'fi', 'fr', 'hu', 'is', 'it', 'ja', 'ko',
  'nl', 'no', 'pl', 'pt-br', 'ro', 'ru', 'sk', 'sv', 'tr', 'zh-cn', 'zh-tw',
] as const;

/**
 * English pages no locale translates (paths relative to `docs-site/`; a
 * trailing `/` names a directory, `*` matches within one path segment).
 * Generated reports and TypeDoc stay English and are linked unprefixed;
 * `showcase/` is generated per locale by `copy-goldens.mjs`.
 */
export const TRANSLATABLE_EXCLUDES: readonly string[] = [
  'parity*.md',
  'engines.md',
  'perf.md',
  'reference/',
  'showcase/',
];

const localesDir = path.join(import.meta.dirname, 'locales');

/** Every `locales/<prefix>.ts` module, sorted for a deterministic switcher order. */
const localeFiles = fs.existsSync(localesDir)
  ? fs
      .readdirSync(localesDir)
      .filter((name) => name.endsWith('.ts'))
      .sort()
  : [];

/**
 * Translated locales, keyed by their URL prefix (`de` → `/de/…`), discovered
 * from `docs-site/.vitepress/locales/*.ts`. Order here is the order of the
 * language switcher.
 */
export const LOCALES: Record<string, DocsLocale> = Object.fromEntries(
  await Promise.all(
    localeFiles.map(async (fileName) => {
      const prefix = fileName.slice(0, -'.ts'.length);
      // Build-time only: the path comes from a directory listing of this
      // repo's own locales folder, never from user input.
      const mod = (await import(path.join(localesDir, fileName))) as {
        default: DocsLocale;
      };
      return [prefix, mod.default] as const;
    }),
  ),
);

/** `lang` → component strings for every registered locale (root excluded). */
export const COMPONENTS_BY_LANG: Readonly<Record<string, ComponentStrings>> =
  Object.fromEntries(
    Object.values(LOCALES).map((loc) => [loc.lang, loc.components] as const),
  );

/** Component strings for `lang`; English for the root or an unknown `lang`. */
export function stringsForLang(lang: string): ComponentStrings {
  return pickStrings(lang, COMPONENTS_BY_LANG);
}

export { EN_COMPONENTS };

/** A nav or sidebar link — structurally a VitePress `DefaultTheme` item. */
export interface NavLink {
  text: string;
  link: string;
}

/** A sidebar group of links. */
export interface SidebarGroup {
  text: string;
  items: NavLink[];
}

/**
 * True when `relPath` (relative to `docs-site/`, `/`-separated) is excluded
 * by one of `excludes` — a trailing `/` names a directory and everything
 * under it, `*` matches within one path segment.
 */
function isExcluded(relPath: string, excludes: readonly string[]): boolean {
  return excludes.some((pattern) => {
    if (pattern.endsWith('/')) return relPath.startsWith(pattern);
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped.replace(/\*/g, '[^/]*')}$`).test(relPath);
  });
}

/** Every translatable English page under `root`, relative and sorted. */
function englishPages(
  root: string,
  excludes: readonly string[],
  localeDirs: readonly string[],
): string[] {
  const pages: string[] = [];
  const walk = (dir: string, rel: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        // VitePress internals, static assets, and every locale's own tree.
        if (entry.name.startsWith('.') || entry.name === 'public') continue;
        if (rel === '' && localeDirs.includes(entry.name)) continue;
        if (isExcluded(`${relPath}/`, excludes)) continue;
        walk(path.join(dir, entry.name), relPath);
      } else if (entry.name.endsWith('.md') && !isExcluded(relPath, excludes)) {
        pages.push(relPath);
      }
    }
  };
  walk(root, '');
  return pages.sort();
}

/**
 * Fails the build if locale `prefix` is missing any translatable page.
 *
 * VitePress does not check this and does not fall back: with a locale
 * registered but a page absent, the build **succeeds**, the language switcher
 * offers the page, and the link 404s. The English page set is the `root`
 * tree minus dot-dirs, `public/`, every locale directory (`localeDirs`), and
 * `excludes` — so a new hand-written English page fails every locale that
 * lacks it, by design.
 */
export function assertLocaleComplete(
  root: string,
  prefix: string,
  excludes: readonly string[],
  localeDirs: readonly string[] = ALL_LOCALE_PREFIXES,
): void {
  const pages = englishPages(root, excludes, localeDirs);
  const missing = pages.filter(
    (rel) => !fs.existsSync(path.join(root, prefix, rel)),
  );
  if (missing.length === 0) return;
  throw new Error(
    `Locale "${prefix}" is registered via ` +
      `docs-site/.vitepress/locales/${prefix}.ts but is missing ` +
      `${missing.length} of ${pages.length} pages:\n` +
      missing.map((m) => `  docs-site/${prefix}/${m}`).join('\n') +
      `\n\nVitePress does not fall back to English for a missing page — it ` +
      `would ship a language switcher whose links 404. Either write the ` +
      `pages or delete docs-site/.vitepress/locales/${prefix}.ts until they ` +
      `exist.`,
  );
}

/** English labels. The root locale, and the shape every other one fills in. */
export const EN: NavLabels = {
  overview: 'Overview',
  guide: 'Guide',
  showcase: 'Showcase',
  playground: 'Playground',
  api: 'API',
  conformance: 'Conformance',
  parity: 'Parity',
  introduction: 'Introduction',
  guides: 'Guides',
  recipes: 'Recipes',
  migrating: 'Migrating',
  reference: 'Reference',
  overviewMentalModel: 'Overview (mental model)',
  gettingStarted: 'Getting started',
  layoutEngines: 'Layout engines',
  glossary: 'Glossary',
  browserUsage: 'Browser usage',
  buildAGraph: 'Build a graph in code',
  readGeometry: 'Read computed geometry',
  textMeasurement: 'Text measurement',
  images: 'Working with images',
  renderFormats: 'Render to other formats',
  xdotDrawops: 'Custom rendering with xdot',
  goldenCorpus: 'The golden corpus',
  recipesCookbook: 'Recipes cookbook',
  fromCCli: 'From the C dot CLI',
  fromJsLibs: 'From JS graphviz libraries',
  apiCurated: 'API reference (curated)',
  errors: 'Errors and exceptions',
  types: 'Types',
  typedoc: 'Generated API (TypeDoc)',
  conformanceMatch: 'Conformance (what "match" means)',
  knownDivergences: 'Known divergences',
  parityDot: 'Parity dashboard (dot)',
  parityEngines: 'Engine parity (all engines)',
  perf: 'Performance dashboard',
  englishOnly: '(English)',
};

/**
 * Builds nav/sidebar items for one locale. VitePress does **not** prefix a
 * locale's themeConfig links, hence the explicit `prefix` (`''` for root,
 * `/de` for German). English-only pages — generated reports and TypeDoc —
 * keep their unprefixed link and, outside the root, say they are English.
 */
function linker(prefix: string, ui: NavLabels): {
  page: (text: string, link: string) => NavLink;
  english: (text: string, link: string) => NavLink;
} {
  return {
    page: (text: string, link: string) => ({ text, link: `${prefix}${link}` }),
    english: (text: string, link: string) => ({
      text: prefix === '' ? text : `${text} ${ui.englishOnly}`,
      link,
    }),
  };
}

export function navFor(prefix: string, ui: NavLabels): NavLink[] {
  const { page, english } = linker(prefix, ui);
  return [
    page(ui.overview, '/guide/overview'),
    page(ui.guide, '/guide/getting-started'),
    page(ui.showcase, '/showcase/'),
    page(ui.playground, '/playground'),
    page(ui.api, '/guide/api'),
    page(ui.conformance, '/conformance'),
    english(ui.parity, '/engines'),
  ];
}

const SHOWCASE_ENGINES = [
  'dot', 'neato', 'fdp', 'sfdp', 'circo', 'twopi', 'osage', 'patchwork',
] as const;

function guideGroups(prefix: string, ui: NavLabels): SidebarGroup[] {
  const { page } = linker(prefix, ui);
  return [
    {
      text: ui.introduction,
      items: [
        page(ui.overviewMentalModel, '/guide/overview'),
        page(ui.gettingStarted, '/guide/getting-started'),
        page(ui.layoutEngines, '/guide/engines'),
        page(ui.glossary, '/guide/glossary'),
      ],
    },
    {
      text: ui.guides,
      items: [
        page(ui.browserUsage, '/guide/browser'),
        page(ui.buildAGraph, '/guide/build-a-graph'),
        page(ui.readGeometry, '/guide/geometry'),
        page(ui.textMeasurement, '/guide/text-measurement'),
        page(ui.images, '/guide/images'),
        page(ui.renderFormats, '/guide/render-formats'),
        page(ui.xdotDrawops, '/guide/xdot-drawops'),
      ],
    },
  ];
}

function showcaseAndHowToGroups(
  prefix: string,
  ui: NavLabels,
): SidebarGroup[] {
  const { page } = linker(prefix, ui);
  return [
    {
      text: ui.showcase,
      items: [
        page(ui.goldenCorpus, '/showcase/'),
        ...SHOWCASE_ENGINES.map((e) => page(e, `/showcase/${e}`)),
      ],
    },
    { text: ui.recipes, items: [page(ui.recipesCookbook, '/guide/recipes')] },
    {
      text: ui.migrating,
      items: [
        page(ui.fromCCli, '/guide/migrate-from-c-cli'),
        page(ui.fromJsLibs, '/guide/migrate-from-js-libs'),
      ],
    },
  ];
}

function referenceGroup(prefix: string, ui: NavLabels): SidebarGroup {
  const { page, english } = linker(prefix, ui);
  return {
    text: ui.reference,
    items: [
      page(ui.apiCurated, '/guide/api'),
      page(ui.errors, '/guide/errors'),
      page(ui.types, '/guide/types'),
      english(ui.typedoc, '/reference/'),
      page(ui.playground, '/playground'),
      page(ui.conformanceMatch, '/conformance'),
      page(ui.knownDivergences, '/divergences'),
      english(ui.parityDot, '/parity'),
      english(ui.parityEngines, '/engines'),
      english(ui.perf, '/perf'),
    ],
  };
}

export function sidebarFor(prefix: string, ui: NavLabels): SidebarGroup[] {
  return [
    ...guideGroups(prefix, ui),
    ...showcaseAndHowToGroups(prefix, ui),
    referenceGroup(prefix, ui),
  ];
}
