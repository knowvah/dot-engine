<!-- SPDX-License-Identifier: EPL-2.0 -->
# Architecture decisions

Confirmed by the user 2026-10-06. Locked — an implementation that contradicts
one is a stop condition, not a judgement call.

## 1. Drift: hash-stamped, bannered, never build-failing {#drift}

**Context.** `docs/known-divergences.md` (1276 lines) changed 9 times in two
months; ×23 locales is ~29k translated lines that go stale on every fix.
Failing the build on staleness would block every English edit; tracking
nothing lets translations rot silently.

**Decision.** Every translated page carries front matter
`sourceHash: <sha256 hex of the English source file bytes>`. For
`conformance.md` / `divergences.md` the English source is the *included*
file (`docs/conformance.md`, `docs/known-divergences.md`), not the one-line
include wrapper. A stale page renders a localized banner linking to the
English page. `npm run docs:i18n-status` lists stale pages per locale.

**Consequences.** English edits never block. Readers are told when a
translation lags. Re-translating is a deliberate, separate act.

## 2. Golden descriptions: hard coverage now, English fallback later {#goldens}

**Context.** 247 descriptions in `test/golden/manifest.json`; new goldens get
added during fidelity work.

**Decision.** `docs-site/.vitepress/locales/goldens/<p>.json` maps golden
`id` → description. T29 turns coverage into a hard 100% assertion for the
ids present at mission end. A later-added id falls back to English in the
gallery and is counted by `docs:i18n-status`.

## 3. Component strings live in the locale module {#components}

**Decision.** `DocsLocale.components: ComponentStrings`; English defaults in
`docs-site/.vitepress/theme/strings.ts` (`EN_COMPONENTS`). Playground and
GoldenGallery resolve via `useData().lang`. dot-atlassian's rule carries
over: a translated page naming a control ("Export SVG") must use that
locale's string — enforced by T5's lint.

## 4. English-only pages are linked unprefixed, and say so {#english-only}

**Decision.** Links to `/parity`, `/engines`, `/perf`, `/reference/` stay
unprefixed in every locale. Locale nav/sidebar labels for them carry a
translated "(English)" marker (`ui.englishOnly`).

## 5. Completeness = English tree minus an explicit exclude list {#completeness}

**Context.** VitePress does not fall back to the root locale for a missing
page — a registered locale with a missing page 404s from the switcher.

**Decision.** `assertLocaleComplete` walks the English `docs-site/` tree,
skipping dot-dirs, `public/`, locale prefixes, and
`TRANSLATABLE_EXCLUDES` = `parity*.md`, `engines.md`, `perf.md`,
`reference/`, `showcase/` (generated per locale by copy-goldens). A new
hand-written English page immediately fails every locale lacking it — by
design.

## 6. copy-goldens discovers locales the same way config does {#showcase}

**Decision.** `copy-goldens.mjs` lists `.vitepress/locales/*.ts` and
imports each natively (Node ≥22.18/26 strips types; the repo pins
node 26.3.1 — same mechanism and caveat as dot-atlassian's `i18n.ts`: no
`import.meta.glob`). It writes `docs-site/<p>/showcase/{index,<engine>}.md`
and `.vitepress/goldens.<p>.json`, both gitignored.

## 7. Translation process {#process}

**Decision.** German first; the user reviews it before batch 3. All
subagents follow [translation-spec.md](translation-spec.md): per-locale
glossary, code fences byte-identical, API identifiers and Graphviz attribute
names never translated, commit body explains non-obvious choices.
Native-speaker review is out of scope.

## 8. Concurrency: 15 agents per locale batch {#concurrency}

**Decision.** Three Sonnet subagents per locale (page split in the spec),
five locales per batch. The orchestrator alone writes the locale module and
commits, so subagent write-sets never overlap.

## Rollback classification

All tasks **Reversible**: revert the commit. A locale commit's revert
de-registers the language with its pages; batch-1 commits revert to today's
English-only site with unchanged URLs.
