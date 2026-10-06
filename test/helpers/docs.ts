// SPDX-License-Identifier: EPL-2.0
// Helpers for linting translated docs pages against their English source
// (translation-spec.md "Hard rules"). Everything takes a `root` — the repo
// root holding `docs-site/` and `docs/` — so the same code lints the real
// site and the fixtures. Pure checks return violation lists; they never throw.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { ComponentStrings } from '../../docs-site/.vitepress/theme/strings.js';

interface HashScript {
  englishSourceFor(localePagePath: string, root?: string): string;
}
const hashScript = (await import(
  pathToFileURL(fileURLToPath(new URL('../../scripts/i18n-hash.mjs', import.meta.url))).href
)) as HashScript;

export const SITE_DIR = 'docs-site';
const GENERATED_DIR = 'showcase/';
const SOURCE_HASH_PATTERN = /^[0-9a-f]{64}$/;
const COMPONENT_TAGS = ['Playground', 'GoldenGallery'] as const;

export interface Fence {
  info: string;
  body: string;
}
export interface ParsedPage {
  /** Top-level `key: value` pairs of the front matter (empty when none). */
  frontMatter: Record<string, string>;
  /** Every `link:` value anywhere in the front matter (hero actions, …). */
  frontMatterLinks: string[];
  fences: Fence[];
  /** Body with fenced blocks and inline code spans removed. */
  prose: string;
}
export interface Violation {
  check: string;
  file: string;
  message: string;
}
export interface LinkContext {
  prefix: string;
  /** Predicate over a link's path: an English-only page. */
  isEnglishOnly: (path: string) => boolean;
  /** Top-level names in `docs-site/public/` (`img`, `knowvah_logo.svg`, …). */
  staticAssets: readonly string[];
}

/** Splits a leading `---` block from the body. */
export function splitFrontMatter(md: string): { front: string | null; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(md);
  return m ? { front: m[1] ?? '', body: md.slice(m[0].length) } : { front: null, body: md };
}

function parseFrontMatter(front: string | null): Pick<ParsedPage, 'frontMatter' | 'frontMatterLinks'> {
  const frontMatter: Record<string, string> = {};
  const frontMatterLinks: string[] = [];
  for (const line of (front ?? '').split(/\r?\n/)) {
    const top = /^([A-Za-z][\w-]*):\s*(.*?)\s*$/.exec(line);
    if (top?.[1] !== undefined) frontMatter[top[1]] = (top[2] ?? '').replace(/^["']|["']$/g, '');
    const link = /^\s*(?:-\s+)?link:\s*["']?([^"'\s]+)["']?\s*$/.exec(line);
    if (link?.[1] !== undefined) frontMatterLinks.push(link[1]);
  }
  return { frontMatter, frontMatterLinks };
}

interface OpenFence {
  marker: string;
  info: string;
  lines: string[];
}

/** Opening fence line: 3+ backticks or tildes plus an info string (none may contain a backtick). */
function openFence(line: string): OpenFence | null {
  const m = /^\s*(`{3,}|~{3,})\s*(.*?)\s*$/.exec(line);
  if (m?.[1] === undefined) return null;
  const info = m[2] ?? '';
  return m[1][0] === '`' && info.includes('`') ? null : { marker: m[1], info, lines: [] };
}

/** A line closes a fence of the same character and at least the opening length. */
function closesFence(line: string, open: OpenFence): boolean {
  const m = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
  return m?.[1] !== undefined && m[1][0] === open.marker[0] && m[1].length >= open.marker.length;
}

/**
 * Splits a markdown body into fenced blocks (``` and ~~~, any length >= 3, so
 * a ```` fence may contain ```) and the remaining prose, in which fence lines
 * are blanked.
 */
export function scanFences(body: string): { fences: Fence[]; prose: string } {
  const fences: Fence[] = [];
  const prose: string[] = [];
  let open: OpenFence | null = null;
  for (const line of body.split('\n')) {
    if (open && closesFence(line, open)) {
      fences.push({ info: open.info, body: open.lines.join('\n') });
      open = null;
      prose.push('');
    } else if (open) {
      open.lines.push(line);
      prose.push('');
    } else {
      open = openFence(line);
      prose.push(open ? '' : line);
    }
  }
  if (open) fences.push({ info: open.info, body: open.lines.join('\n') });
  return { fences, prose: prose.join('\n') };
}

/** Removes inline code spans (any backtick run length). */
export function stripInlineCode(text: string): string {
  return text.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, '');
}

export function parsePage(md: string): ParsedPage {
  const { front, body } = splitFrontMatter(md);
  const { fences, prose } = scanFences(body);
  return { ...parseFrontMatter(front), fences, prose: stripInlineCode(prose) };
}

/** Internal (`/…`) link targets in prose: markdown `](/x)` and html `href="/x"`. */
export function extractInternalLinks(prose: string): string[] {
  const links: string[] = [];
  for (const m of prose.matchAll(/\]\(\s*<?(\/[^)\s>]*)|href=["'](\/[^"']*)["']/g)) {
    links.push((m[1] ?? m[2]) as string);
  }
  return links.filter((l) => !l.startsWith('//'));
}

const cache = new Map<string, ParsedPage>();

/** Reads and parses a page once per absolute path. */
export function loadPage(absPath: string): ParsedPage {
  let page = cache.get(absPath);
  if (!page) {
    page = parsePage(readFileSync(absPath, 'utf8'));
    cache.set(absPath, page);
  }
  return page;
}

/** Translated pages of a locale (relative to `docs-site/<prefix>/`), sorted, minus generated `showcase/`. */
export function listTranslatedPages(root: string, prefix: string): string[] {
  const out: string[] = [];
  const walk = (dir: string, rel: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const relPath = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (!e.name.startsWith('.') && `${relPath}/` !== GENERATED_DIR) walk(join(dir, e.name), relPath);
      } else if (e.name.endsWith('.md')) out.push(relPath);
    }
  };
  walk(join(root, SITE_DIR, prefix), '');
  return out.sort();
}

/** Repo-relative path of the English source of `docs-site/<prefix>/<rel>`. */
export function englishPathFor(prefix: string, rel: string): string {
  return hashScript.englishSourceFor(`${SITE_DIR}/${prefix}/${rel}`);
}

/** Top-level names in `docs-site/public/`. */
export function staticAssetsOf(root: string): string[] {
  return readdirSync(join(root, SITE_DIR, 'public')).sort();
}

/**
 * Predicate for English-only page URLs derived from the translatable-exclude
 * list: `parity*.md` → `/parity*`, `engines.md` → `/engines`, `reference/` →
 * `/reference` and below. `showcase/` is generated per locale, so it is not
 * English-only.
 */
export function englishOnlyMatcher(excludes: readonly string[]): (path: string) => boolean {
  const tests = excludes
    .filter((p) => p !== GENERATED_DIR)
    .map((p): ((path: string) => boolean) => {
      if (p.endsWith('/')) {
        const dir = `/${p.slice(0, -1)}`;
        return (path) => path === dir || path.startsWith(`${dir}/`);
      }
      const escaped = p.replace(/\.md$/, '').replace(/[.+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`^/${escaped.replace(/\*/g, '[^/]*')}$`);
      return (path) => re.test(path);
    });
  return (path) => tests.some((t) => t(path));
}

const v = (check: string, file: string, message: string): Violation => ({ check, file, message });

/** Check 1: same fences, in order, same info strings, identical bodies (index is 1-based). */
export function checkFences(en: ParsedPage, tr: ParsedPage, file: string): Violation[] {
  const out: Violation[] = [];
  if (en.fences.length !== tr.fences.length) {
    out.push(v('fences', file, `expected ${en.fences.length} code fences, found ${tr.fences.length}`));
  }
  en.fences.slice(0, tr.fences.length).forEach((f, i) => {
    const t = tr.fences[i] as Fence;
    if (f.info !== t.info) {
      out.push(v('fences', file, `fence #${i + 1}: info string "${t.info}" != "${f.info}"`));
    } else if (f.body !== t.body) {
      out.push(v('fences', file, `fence #${i + 1} (${f.info || 'no info'}): body differs from English`));
    }
  });
  return out;
}

function linkPath(link: string): string {
  return (link.split(/[?#]/)[0] ?? '').replace(/\.(?:html|md)$/, '');
}

/** Check 2: internal links carry the locale prefix unless English-only or a static asset. */
export function checkLinks(tr: ParsedPage, ctx: LinkContext, file: string): Violation[] {
  const links = [...extractInternalLinks(tr.prose), ...tr.frontMatterLinks.filter((l) => l.startsWith('/'))];
  const base = `/${ctx.prefix}`;
  return links
    .filter((link) => {
      const path = linkPath(link);
      const asset = ctx.staticAssets.includes(path.split('/')[1] ?? '');
      return !(path === base || path.startsWith(`${base}/`) || ctx.isEnglishOnly(path) || asset);
    })
    .map((link) => v('links', file, `link ${link} must be prefixed /${ctx.prefix}/ (or be English-only/static)`));
}

function containsWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u').test(text);
}

/**
 * Check 3: on a page that embeds a component, control names in English prose
 * are substituted by the locale's strings. Pages without a component use the
 * same words ("the DOT source", an "Engine" column) as ordinary nouns, which
 * inflecting languages must be free to decline — so they are not checked.
 */
export function checkComponents(
  en: ParsedPage,
  tr: ParsedPage,
  strings: { en: ComponentStrings; locale: ComponentStrings },
  file: string,
): Violation[] {
  const out: Violation[] = [];
  if (COMPONENT_TAGS.every((tag) => tagCount(en.prose, tag) === 0)) return out;
  for (const key of Object.keys(strings.en) as (keyof ComponentStrings)[]) {
    const english = strings.en[key];
    const local = strings.locale[key];
    if (local === english || !containsWord(en.prose, english)) continue;
    if (!containsWord(tr.prose, local)) out.push(v('components', file, `${key}: missing "${local}"`));
    if (containsWord(tr.prose, english)) out.push(v('components', file, `${key}: English "${english}" remains`));
  }
  return out;
}

/** Check 4: `sourceHash` is 64 lowercase hex chars. */
export function checkFrontMatter(tr: ParsedPage, file: string): Violation[] {
  const hash = tr.frontMatter['sourceHash'];
  if (hash === undefined) return [v('frontmatter', file, 'front matter has no sourceHash')];
  return SOURCE_HASH_PATTERN.test(hash)
    ? []
    : [v('frontmatter', file, `sourceHash "${hash}" is not 64 lowercase hex chars`)];
}

function tagCount(prose: string, tag: string): number {
  return prose.match(new RegExp(`<${tag}\\b`, 'g'))?.length ?? 0;
}

/** Check 5: `<Playground` / `<GoldenGallery` counts equal English; no `@include` directive. */
export function checkComponentTags(en: ParsedPage, tr: ParsedPage, file: string): Violation[] {
  const out: Violation[] = [];
  for (const tag of COMPONENT_TAGS) {
    const want = tagCount(en.prose, tag);
    const got = tagCount(tr.prose, tag);
    if (want !== got) out.push(v('tags', file, `<${tag}> count ${got}, English has ${want}`));
  }
  if (tr.prose.includes('<!--@include:')) {
    out.push(v('tags', file, 'contains an <!--@include: directive; translate the included content'));
  }
  return out;
}

export const CHECKS = ['fences', 'links', 'components', 'frontmatter', 'tags'] as const;

/** All violations of one translated page (each file is parsed once). */
export function lintPage(
  root: string,
  rel: string,
  ctx: LinkContext,
  strings: { en: ComponentStrings; locale: ComponentStrings },
): Violation[] {
  const file = `${SITE_DIR}/${ctx.prefix}/${rel}`;
  const tr = loadPage(join(root, file));
  const en = loadPage(join(root, englishPathFor(ctx.prefix, rel)));
  return [
    ...checkFences(en, tr, file),
    ...checkLinks(tr, ctx, file),
    ...checkComponents(en, tr, strings, file),
    ...checkFrontMatter(tr, file),
    ...checkComponentTags(en, tr, file),
  ];
}
