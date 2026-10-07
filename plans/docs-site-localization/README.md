<!-- SPDX-License-Identifier: EPL-2.0 -->
# Mission: localize the dot-engine docs site

## Objective

`dot-engine.knowvah.com` (VitePress, `docs-site/`) serves English only. Bring
it to the 23 non-English locales the dot-atlassian docs site ships, with
English staying at the root. Mirror dot-atlassian's architecture — a locale
registry discovered from `.vitepress/locales/<prefix>.ts`, nav/sidebar
generated from per-locale labels, and a build-time completeness gate — and
add what this site needs that dot-atlassian's did not: localized interactive
components, localized showcase pages and golden descriptions, and drift
tracking for translations of fast-moving pages (`known-divergences.md`).

German is translated first and reviewed by the user before any other locale.

**At mission start (and after every compaction) read
`~/.claude/docs/reference/autonomous-execution.md` in full**, then this file,
then the current batch's `overview.md`.

## Branch

`feature/docs-site-i18n`, off `main`. Never push `main` — open a PR at the end
(pushing `main` publishes a release).

## Quality gates

Run after every task. All must pass before the task is committed.

```
npm run typecheck            # tsc --noEmit
npm test                     # vitest run — includes test/docs/*.test.ts
npm run docs:build           # copy steps + typedoc + vitepress; assertLocaleComplete
git diff --name-only --cached  # must match the task's declared write-set
```

`npm run docs:i18n-status` (from T4) is informational, never a gate.
No `src/` file is in any write-set: a `src/` diff means something leaked.

## Stop conditions

Stop and wait for the user when:

1. A task needs a file outside its write-set that is not in another task's
2. The same gate check fails twice in a row
3. The work contradicts a decision in [decisions.md](decisions.md)
4. **German (T6) is done** — mandatory review before batch 3
5. An English page would need editing to make a translation work (log it in
   the journal; do not fix in passing — English is the source of truth)
6. `docs:build` exceeds 3× the T1 baseline time, or a locale's search index
   exceeds 3× the English one
7. A translation would need to change a code fence, API identifier, or
   Graphviz attribute name to read naturally
8. Anything would push to `main`

A subagent whose page fails translation lint twice gets its **locale
quarantined** (left unregistered, not committed); the rest of the batch
continues and the quarantine is surfaced at batch end. Per CLAUDE.md, a batch
with a quarantined case is not complete until it is in the journal.

## Push forward without asking when

- Choosing wording within a translation, given the glossary and fence rules
- Adding a glossary term — append to [translation-spec.md](translation-spec.md),
  note it in the commit body
- Fixing a gate failure inside the task's own write-set
- Re-dispatching a single subagent whose output fails lint, once
- Adding a test the acceptance criteria imply but do not name
- Splitting a fix into its own commit to satisfy a gate

## Batches

| Batch | Contents | Done |
|---|---|---|
| [1](batch-1/overview.md) | Registry + config (T1), then Playground strings, localized goldens/showcase, drift tracking, translation lint (T2–T5) | [x] |
| [2](batch-2/overview.md) | German — the worked example (T6). **Stop for review.** | [x] |
| [3](batch-3/overview.md) | cs, da, es, et, fi (T7–T11) | [x] |
| [4](batch-4/overview.md) | fr, hu, is, it, ja (T12–T16) | [x] |
| [5](batch-5/overview.md) | ko, nl, no, pl, pt-br (T17–T21) | [x] |
| [6](batch-6/overview.md) | ro, ru, sk, sv, tr (T22–T26) | [x] |
| [7](batch-7/overview.md) | zh-cn, zh-tw (T27–T28) | [x] |
| [8](batch-8/overview.md) | Closeout: hard goldens coverage, measurements, README, PR (T29) | [ ] |

## Execution model

- Batch 1: T1 alone, then T2–T5 in parallel (typescript-pro / Sonnet).
- Locale batches: **15 concurrent Sonnet subagents** (user decision) — three
  per locale, split as in [translation-spec.md](translation-spec.md#page-split).
  The orchestrator writes the locale module last, runs gates, and makes
  **one commit per locale**.
- Recommended executor model: `fable`.

## Documents

- [decisions.md](decisions.md) — the eight locked decisions
- [translation-spec.md](translation-spec.md) — the shared spec every
  translation subagent receives; per-locale task files are thin
- [diagrams/data-flow.md](diagrams/data-flow.md) — build-time flow
- [diagrams/component-map.md](diagrams/component-map.md) — what this touches
- [decision-journal.md](decision-journal.md) — appended during execution

## Reference implementation

`~/git/knowvah/dot-atlassian/site/.vitepress/{i18n.ts,config.ts,locales/}`
and its mission `~/git/knowvah/dot-atlassian/plans/docs-site-localization/`.
Read-only. Port the patterns, not the Atlassian specifics (no app locale
JSON, no screenshots, no R2).

## Out of scope

- Generated reports (`parity*.md`, `engines.md`, `perf.md`) and TypeDoc
  `reference/` — English-only, linked unprefixed from every locale
- Native-speaker review
- Any change to `src/` or to English page content
