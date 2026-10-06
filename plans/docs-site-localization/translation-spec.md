<!-- SPDX-License-Identifier: EPL-2.0 -->
# Translation spec

The shared spec every translation subagent receives verbatim. Per-locale task
files name the locale and point here. After T6, `docs-site/de/` is the
reviewed worked example — **read the corresponding German page before
translating** (subagents for batches 3–7).

## Locales

| Prefix | `lang` | Label (`DocsLocale.label`) |
|---|---|---|
| cs | cs-CZ | Čeština |
| da | da-DK | Dansk |
| de | de-DE | Deutsch |
| es | es-ES | Español |
| et | et-EE | Eesti |
| fi | fi-FI | Suomi |
| fr | fr-FR | Français |
| hu | hu-HU | Magyar |
| is | is-IS | Íslenska |
| it | it-IT | Italiano |
| ja | ja-JP | 日本語 |
| ko | ko-KR | 한국어 |
| nl | nl-NL | Nederlands |
| no | no-NO | Norsk |
| pl | pl-PL | Polski |
| pt-br | pt-BR | Português (Brasil) |
| ro | ro-RO | Română |
| ru | ru-RU | Русский |
| sk | sk-SK | Slovenčina |
| sv | sv-SE | Svenska |
| tr | tr-TR | Türkçe |
| zh-cn | zh-CN | 简体中文 |
| zh-tw | zh-TW | 繁體中文 |

Labels and `lang` match dot-atlassian's `site/.vitepress/locales/*.ts`.

## Page split {#page-split}

Each locale is three subagents with disjoint write-sets, then the
orchestrator. Paths are under `docs-site/`.

| Part | Writes (`<p>` = prefix) | English lines |
|---|---|---|
| a | `<p>/index.md`, `<p>/playground.md`, `<p>/guide/{overview,getting-started,engines,glossary,browser,build-a-graph,geometry,text-measurement,images}.md` | ~1,180 |
| b | `<p>/guide/{render-formats,xdot-drawops,recipes,migrate-from-c-cli,migrate-from-js-libs,api,errors,types}.md` | ~2,130 |
| c | `<p>/conformance.md`, `<p>/divergences.md`, `<p>/divergences-proc3d-a2.md`, `.vitepress/locales/goldens/<p>.json` (247 ids + the `$showcase` block, per T3's contract) | ~1,510 + 247 descriptions |
| orchestrator | `.vitepress/locales/<p>.ts` (registration — written last) | — |

Part c sources: `conformance.md` ← `docs/conformance.md`,
`divergences.md` ← `docs/known-divergences.md` (translate the included
content into a full page; do **not** keep the `@include`).
`goldens/<p>.json` ← every `id`/`description` in
`test/golden/manifest.json`, as `{ "<id>": "<translated description>" }`,
keys in manifest order.

## Hard rules

1. **Front matter.** Every page starts with front matter containing
   `sourceHash:` — the SHA-256 hex of the English source file's bytes, as
   computed by `node scripts/i18n-hash.mjs <english-path>` (from T4). Keep any
   existing English front matter keys; translate values (`hero.text`,
   `tagline`, `features[].title/details`, action `text`), never keys.
   `hero.name` stays `@knowvah/dot-engine`.
2. **Code fences are byte-identical** — ```dot, ```graphviz, ```ts, ```js,
   ```sh, ```text, every one, in the same order. Comments inside code stay
   English. T5's lint fails on any difference.
3. **Never translate:** API identifiers (`renderSvg`, `getLayout`,
   `DotError`…), type names, Graphviz attribute and value names (`rankdir`,
   `splines=ortho`), engine names (`dot`, `neato`, `fdp`, `sfdp`, `circo`,
   `twopi`, `osage`, `patchwork`), output formats (`svg`, `xdot`, `-Tplain`),
   product nouns (Graphviz, Knowvah, VitePress, WASM, TypeScript), golden
   ids, issue numbers, file paths, inline `code` spans.
4. **Internal links take the prefix**: `/guide/api` → `/<p>/guide/api`.
   Exceptions stay unprefixed: `/parity*`, `/engines`, `/perf`,
   `/reference/…`. Anchors (`#…`) are kept as-is when they point at a
   heading in an English-only page; for translated pages, use the anchor
   VitePress generates from the translated heading. External URLs unchanged.
5. **Component strings are substituted, not translated freely.** When prose
   names a Playground/Gallery control ("Export SVG", "Engine", "DOT source"),
   use the exact string the orchestrator gives you in the prompt's
   `components` block. The orchestrator decides those strings (and the nav
   `ui` labels) *before* dispatch, passes them to all three subagents, and
   writes `.vitepress/locales/<p>.ts` only after all three parts pass lint —
   any file in `locales/` is auto-registered, so it must never exist early.
6. **Vue components and containers stay as-is**: `<Playground height="…"/>`,
   `::: tip` (translate the body, and a custom title if present).
7. **Structure mirrors English**: same headings in the same order, same
   tables (translate cells except identifiers), same images (`/img/…` paths
   unchanged).

## Glossary

Use consistently within a locale. The German column is filled by T6 and is
the model for the others; each locale task appends its own column's terms to
its commit body rather than editing this table (one writer).

| English | de |
|---|---|
| node | _(T6)_ |
| edge | |
| cluster / subgraph | |
| layout engine | |
| spline / edge routing | |
| golden (test case) | |
| oracle (native binary) | |
| conformance / divergence | |
| tolerance | |
| port (of Graphviz) | |

## Tone

Second person, technical, plain — match the English register. Formal
address where the language distinguishes (de *Sie*, fr *vous*, …), matching
dot-atlassian's choices for the same locale.

## Commit

`feat(docs): translate the docs site into <language>` — one commit per
locale, ≤72-char subject, body wrapped at 80: glossary choices, any wording
a non-reader would have to take on trust, and any quarantined page. End with
the session attribution line given at execution time.
