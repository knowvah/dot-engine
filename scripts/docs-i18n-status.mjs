// SPDX-License-Identifier: EPL-2.0
// Translation drift report (decisions.md#drift). For every locale, lists
// missing pages, stale pages (sourceHash != hash of the English source),
// pages without a sourceHash, and golden descriptions still in English.
// Never fails: it exits 0 whatever it finds.
//
//   node scripts/docs-i18n-status.mjs                 print the report
//   node scripts/docs-i18n-status.mjs --write-hashes  write
//     docs-site/.vitepress/i18n-hashes.json (gitignored) and print nothing.
//     Shape: { "<locale page relativePath>": "<English URL>" } for each stale
//     page, e.g. { "de/guide/api.md": "/guide/api" }. StaleBanner.vue reads it.
//
// Locales scanned: every `docs-site/.vitepress/locales/<p>.ts` module plus
// every top-level `docs-site/<p>/` directory whose name looks like a locale
// prefix. Page sets mirror assertLocaleComplete in i18n.ts (duplicated here:
// that module is TypeScript with top-level fs work and cannot be imported by
// plain node; a test pins TRANSLATABLE_EXCLUDES and the prefix rule to it).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { hashSource, parseSourceHash, englishSourceFor, LOCALE_PREFIX_PATTERN, REPO_ROOT, SITE_DIR } from './i18n-hash.mjs';
import { localizeGoldens, listLocalePrefixes } from '../docs-site/copy-goldens.mjs';

export const TRANSLATABLE_EXCLUDES = [
  'parity*.md',
  'engines.md',
  'perf.md',
  'reference/',
  'showcase/',
];
const HASHES_FILE = `${SITE_DIR}/.vitepress/i18n-hashes.json`;
const MANIFEST_FILE = 'test/golden/manifest.json';
const LOCALES_DIR = `${SITE_DIR}/.vitepress/locales`;

/** True when `relPath` matches an exclude (trailing `/` = directory, `*` = within a segment). */
export function isExcluded(relPath, excludes) {
  return excludes.some((pattern) => {
    if (pattern.endsWith('/')) return relPath.startsWith(pattern);
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped.replace(/\*/g, '[^/]*')}$`).test(relPath);
  });
}

/** Every `.md` under `dir` (relative, sorted), skipping dot-dirs, `public/` and `skip(relDir/)`. */
export function walkMarkdown(dir, skip) {
  const pages = [];
  const walk = (abs, rel) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'public') continue;
        if (!skip(`${relPath}/`)) walk(join(abs, entry.name), relPath);
      } else if (entry.name.endsWith('.md') && !skip(relPath)) {
        pages.push(relPath);
      }
    }
  };
  walk(dir, '');
  return pages.sort();
}

/** Locale prefixes to scan: registered modules plus locale-named directories. */
export function detectLocales(root) {
  const site = join(root, SITE_DIR);
  const dirs = existsSync(site)
    ? readdirSync(site, { withFileTypes: true })
        .filter((d) => d.isDirectory() && LOCALE_PREFIX_PATTERN.test(d.name))
        .map((d) => d.name)
    : [];
  return [...new Set([...dirs, ...listLocalePrefixes(join(root, LOCALES_DIR))])].sort();
}

/** Translatable English pages (relative to docs-site/), minus the locale dirs. */
export function englishPages(root, localeDirs) {
  const skipTop = (rel) => localeDirs.some((p) => rel === `${p}/`);
  return walkMarkdown(join(root, SITE_DIR), (rel) => skipTop(rel) || isExcluded(rel, TRANSLATABLE_EXCLUDES));
}

/** English URL of a locale page given its locale-relative path. */
export function englishUrl(rel) {
  const noExt = rel.replace(/\.md$/, '');
  if (noExt === 'index') return '/';
  return noExt.endsWith('/index') ? `/${noExt.slice(0, -'index'.length)}` : `/${noExt}`;
}

function classifyPage(root, prefix, rel) {
  const localePath = `${SITE_DIR}/${prefix}/${rel}`;
  const source = englishSourceFor(localePath, root);
  if (!existsSync(join(root, source))) return 'orphaned';
  const recorded = parseSourceHash(readFileSync(join(root, localePath), 'utf8'));
  if (recorded === undefined) return 'noHash';
  return recorded === hashSource(source, root) ? 'ok' : 'stale';
}

/** Status of the translated pages of one locale, plus its missing pages. */
export function localeStatus(root, prefix, localeDirs) {
  const status = { prefix, missing: [], stale: [], noHash: [], orphaned: [] };
  const dir = join(root, SITE_DIR, prefix);
  const own = existsSync(dir) ? walkMarkdown(dir, (rel) => rel.startsWith('showcase/')) : [];
  for (const rel of own) {
    const kind = classifyPage(root, prefix, rel);
    if (kind !== 'ok') status[kind].push(rel);
  }
  const have = new Set(own);
  status.missing = englishPages(root, localeDirs).filter((rel) => !have.has(rel));
  return status;
}

/** Golden ids with no translation for a locale (all ids when it has no file). */
export function missingGoldenIds(manifest, translations) {
  return localizeGoldens(manifest, translations ?? {}).missingIds;
}

/** `{ "<prefix>/<rel>": "<English URL>" }` for every stale page. */
export function staleHashes(statuses) {
  const out = {};
  for (const s of statuses) {
    for (const rel of s.stale) out[`${s.prefix}/${rel}`] = englishUrl(rel);
  }
  return out;
}

/** Human-readable report lines for one locale. */
export function formatLocale(status, goldenIds) {
  const lines = [`${status.prefix}:`];
  const groups = [
    ['missing pages', status.missing],
    ['stale pages', status.stale],
    ['pages without sourceHash', status.noHash],
    ['pages whose English source is gone', status.orphaned],
    ['golden descriptions still English', goldenIds],
  ];
  for (const [label, items] of groups) {
    lines.push(`  ${label}: ${items.length}`);
    for (const item of items) lines.push(`    - ${item}`);
  }
  return lines.join('\n');
}

function readJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined;
}

function collect(root) {
  const locales = detectLocales(root);
  const manifest = readJson(join(root, MANIFEST_FILE)) ?? [];
  return locales.map((prefix) => ({
    status: localeStatus(root, prefix, locales),
    goldenIds: missingGoldenIds(manifest, readJson(join(root, LOCALES_DIR, 'goldens', `${prefix}.json`))),
  }));
}

/** Writes the stale-page map the banner reads; returns it. */
export function writeHashes(root, statuses) {
  const file = join(root, HASHES_FILE);
  mkdirSync(dirname(file), { recursive: true });
  const map = staleHashes(statuses);
  writeFileSync(file, `${JSON.stringify(map, null, 2)}\n`);
  return map;
}

function main(args) {
  const results = collect(REPO_ROOT);
  if (args.includes('--write-hashes')) {
    writeHashes(REPO_ROOT, results.map((r) => r.status));
    return;
  }
  if (results.length === 0) console.log('[docs-i18n-status] no locales found');
  for (const { status, goldenIds } of results) console.log(formatLocale(status, goldenIds));
}

if (import.meta.main) main(process.argv.slice(2));
