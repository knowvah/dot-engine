// SPDX-License-Identifier: EPL-2.0
// Copy step (run in docs:build / docs:dev, like copy-reports.mjs): read the
// golden manifest + input .dot sources and inject them into the docs site —
// (1) a data file the showcase gallery imports, and (2) one generated page per
// layout engine plus a showcase index. The goldens render CLIENT-SIDE in the
// browser via the library; see .vitepress/theme/GoldenGallery.vue.
//
// Localization: English lives here. Every locale module found at
// `.vitepress/locales/<p>.ts` additionally gets
//   - `.vitepress/goldens.<p>.json` — the same data with descriptions taken
//     from `.vitepress/locales/goldens/<p>.json` (per-id English fallback);
//   - `<p>/showcase/{index,<engine>}.md` — pages with translated prose and
//     `/<p>/`-prefixed internal links.
//
// `.vitepress/locales/goldens/<p>.json` is `{ "<goldenId>": "<description>",
// "$showcase": { … } }`. Keys starting with `$` are not golden ids. The
// optional `$showcase` object overrides these English defaults (every key is
// optional; a missing key falls back to English). Templates use `{name}`
// placeholders, filled by the generator:
//
//   indexTitle        front-matter title of the index page
//   indexHeading      H1 of the index page
//   indexIntro        paragraph before the engine list; {total}
//   indexRowCount     per-engine count suffix on the index; {count}
//   indexOutro        closing paragraph; {conformance} = the link to the
//                     conformance page (rendered from conformanceLabel)
//   conformanceLabel  link text of the conformance link
//   engineTitle       front-matter title of an engine page; {engine}
//   engineHeading     H1 of an engine page; {engine}, {count}
//   engineIntro       sentence after the blurb on an engine page
//   blurbs            { dot, neato, fdp, sfdp, circo, twopi, osage,
//                       patchwork }: one-line description of each engine
//
// Importing this module has no side effects; the generator runs only when the
// file is executed directly (`node docs-site/copy-goldens.mjs`).
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)); // docs-site/
const REPO = join(HERE, '..'); // repo root
const MANIFEST = join(REPO, 'test/golden/manifest.json');
const LOCALES_DIR = join(HERE, '.vitepress/locales');
const LOCALE_GOLDENS_DIR = join(LOCALES_DIR, 'goldens');
const SHOWCASE_KEY = '$showcase';
const MODULE_EXT = '.ts';

export const ENGINE_ORDER = [
  'dot', 'neato', 'fdp', 'sfdp', 'circo', 'twopi', 'osage', 'patchwork',
];

/** English showcase prose; see the key list in the header comment. */
export const EN_SHOWCASE = {
  indexTitle: 'Showcase',
  indexHeading: 'Showcase — the golden corpus',
  indexIntro: `Every graph in this section is one of **{total} golden test cases** the library is
held to, rendered **live in your browser** by \`@knowvah/dot-engine\` — the exact
code that ships. One page per layout engine:`,
  indexRowCount: '{count} goldens',
  indexOutro: `Each card shows the graph the library produced, a short description, and — folded
away — its DOT source. Deterministic cases match the native \`dot\` binary to
±0.01; iterative engines match within a looser tolerance
(see {conformance}).`,
  conformanceLabel: 'Conformance',
  engineTitle: '{engine} goldens',
  engineHeading: '{engine} — {count} goldens',
  engineIntro: 'Each graph below is rendered live in your browser by the library.',
  blurbs: {
    dot: 'Hierarchical, layered layout for directed graphs.',
    neato: 'Spring-model (Kamada–Kawai) layout for undirected graphs.',
    fdp: 'Force-directed (Fruchterman–Reingold) layout for undirected graphs.',
    sfdp: 'Scalable force-directed layout for large undirected graphs.',
    circo: 'Circular layout for cyclic / biconnected structures.',
    twopi: 'Radial layout around a root node.',
    osage: 'Clustered layout that packs subgraphs.',
    patchwork: 'Squarified treemap of clusters by area.',
  },
};

/** Replace each `{name}` in `template` with `vars[name]`. */
export function fillTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (whole, name) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/** English showcase strings overridden key-by-key (blurbs per engine). */
export function resolveShowcase(overrides) {
  const o = overrides ?? {};
  return {
    ...EN_SHOWCASE,
    ...o,
    blurbs: { ...EN_SHOWCASE.blurbs, ...(o.blurbs ?? {}) },
  };
}

/**
 * Manifest entries with `description` replaced by the translation when one
 * exists (per-id English fallback). `missingIds` lists entries with no
 * translation. Keys of `translations` starting with `$` are not ids.
 */
export function localizeGoldens(manifestEntries, translations) {
  const missingIds = [];
  const entries = manifestEntries.map((e) => {
    const t = translations[e.id];
    if (typeof t === 'string') {
      return { ...e, description: t };
    }
    missingIds.push(e.id);
    return { ...e };
  });
  return { entries, missingIds };
}

/** URL prefix for a locale: '' for English, `/<p>` otherwise. */
function urlBase(prefix) {
  return prefix ? `/${prefix}` : '';
}

/** Markdown of the showcase index page. */
export function renderShowcaseIndex(prefix, order, counts, strings) {
  const s = resolveShowcase(strings);
  const base = urlBase(prefix);
  const total = order.reduce((n, eng) => n + counts[eng], 0);
  const rows = order
    .map((eng) => {
      const count = fillTemplate(s.indexRowCount, { count: counts[eng] });
      return `- [**${eng}**](${base}/showcase/${eng}) — ${s.blurbs[eng]} _(${count})_`;
    })
    .join('\n');
  const conformance = `[${s.conformanceLabel}](${base}/conformance)`;
  return `---
title: ${yamlScalar(s.indexTitle)}
---

# ${s.indexHeading}

${fillTemplate(s.indexIntro, { total })}

${rows}

${fillTemplate(s.indexOutro, { conformance })}
`;
}

/**
 * A front-matter value: plain when YAML reads it back unchanged, else
 * double-quoted (JSON strings are valid YAML). Translated titles can contain
 * `: ` (Polish "dot: golden"), which a plain scalar cannot.
 */
export function yamlScalar(value) {
  return /[:#]|^[\s'"{}[\]&*!|>%@`,?-]|\s$/.test(value) ? JSON.stringify(value) : value;
}

/** Markdown of one engine's showcase page. */
export function renderEnginePage(engine, count, strings) {
  const s = resolveShowcase(strings);
  const vars = { engine, count };
  return `---
title: ${yamlScalar(fillTemplate(s.engineTitle, vars))}
---

# ${fillTemplate(s.engineHeading, vars)}

${s.blurbs[engine]} ${s.engineIntro}

<GoldenGallery engine="${engine}" />
`;
}

/** Group manifest entries (with their DOT source) by engine. */
export function groupByEngine(entries, readDot) {
  const byEngine = {};
  for (const e of entries) {
    (byEngine[e.engine] ??= []).push({
      id: e.id,
      description: e.description,
      toleranceClass: e.toleranceClass,
      dot: readDot(e.input),
    });
  }
  const order = ENGINE_ORDER.filter((eng) => byEngine[eng]?.length);
  const counts = Object.fromEntries(order.map((eng) => [eng, byEngine[eng].length]));
  return { order, counts, byEngine };
}

/** Locale prefixes = `*.ts` modules directly in `localesDir` (sorted). */
export function listLocalePrefixes(localesDir) {
  if (!existsSync(localesDir)) return [];
  return readdirSync(localesDir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(MODULE_EXT))
    .map((d) => d.name.slice(0, -MODULE_EXT.length))
    .sort();
}

function readTranslations(prefix) {
  const file = join(LOCALE_GOLDENS_DIR, `${prefix}.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
}

function writeShowcasePages(dir, prefix, grouped, strings) {
  mkdirSync(dir, { recursive: true });
  const { order, counts } = grouped;
  writeFileSync(join(dir, 'index.md'), renderShowcaseIndex(prefix, order, counts, strings));
  for (const eng of order) {
    writeFileSync(join(dir, `${eng}.md`), renderEnginePage(eng, counts[eng], strings));
  }
}

function writeLocale(prefix, manifest, readDot) {
  const translations = readTranslations(prefix);
  const { entries, missingIds } = localizeGoldens(manifest, translations);
  const grouped = groupByEngine(entries, readDot);
  writeFileSync(join(HERE, `.vitepress/goldens.${prefix}.json`), JSON.stringify(grouped));
  writeShowcasePages(join(HERE, prefix, 'showcase'), prefix, grouped, translations[SHOWCASE_KEY]);
  console.log(
    `[copy-goldens] ${prefix}: ${entries.length - missingIds.length}/${entries.length} descriptions translated`,
  );
}

function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const readDot = (input) => readFileSync(join(REPO, input), 'utf8');
  const grouped = groupByEngine(manifest, readDot);
  const total = grouped.order.reduce((n, eng) => n + grouped.counts[eng], 0);

  // (1) data the client gallery imports (gitignored, generated).
  writeFileSync(join(HERE, '.vitepress/goldens.json'), JSON.stringify(grouped));
  // (2) generated pages: a showcase index + one page per engine (gitignored).
  writeShowcasePages(join(HERE, 'showcase'), '', grouped, undefined);
  console.log(
    `[copy-goldens] ${total} goldens / ${grouped.order.length} engines → goldens.json + ${grouped.order.length + 1} pages`,
  );
  for (const prefix of listLocalePrefixes(LOCALES_DIR)) {
    writeLocale(prefix, manifest, readDot);
  }
}

if (import.meta.main) main();
