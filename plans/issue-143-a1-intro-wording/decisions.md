# Decisions: issue #143

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on 2026-11-10.
Nobody confirmed these. Each one names the rejected options and the evidence, so the
maintainer can audit it.

### AD-1: replace only the false clause; name the tolerance as the difference

- **Decision:** in `docs/known-divergences.md:189-191`, replace "are **not** yet
  triaged per-id —" so the sentence reads, in substance:

  > Unlike the `circo`/`twopi`/`osage` engine tracks above, which are held to ±0.01,
  > `neato`/`fdp`/`sfdp` are compared at ±0.5pt, and each of their diverged ids is
  > attributed below — `engine-walk.ts` records a `tolerance: 0.5` field for these
  > three and `parity-report.ts` renders them ...

  The rest of the sentence and paragraph stays byte-identical. Constraints on the final
  wording: it must not say or imply the iterative engines are untriaged; it must keep
  the contrast with the deterministic tracks; it must not change any figure; it must
  not say every diverged id is drift-exonerated (two are accepted per-id residuals,
  `:232-234`).
- **Rejected:**
  - (a) Delete the clause and start at "`engine-walk.ts` records ...". The "Unlike the
    circo/twopi/osage tracks" opening then has no predicate, and the reader loses why
    these three get a separate table.
  - (b) Move the "Unlike at first sweep, every diverged row ..." paragraph up into the
    intro. A wider rewrite of a long paragraph across 24 files, for a one-clause defect;
    more translation churn, same information.
- **Evidence:** `engine-walk.ts:102,117` (0.01 for the deterministic engines, 0.5 for
  the iterative ones); `known-divergences.md:115-119` and `:227-235` (every diverged id
  attributed; two per-id residuals). Item 157: "no figure is wrong".

### AD-2: retranslate the clause in all 23 locales and refresh their `sourceHash`

- **Decision:** in each `docs-site/<prefix>/divergences.md` (the 23 prefixes are the
  directories with a `docs-site/.vitepress/locales/<prefix>.ts` module), replace the
  locale's equivalent of "are not yet triaged per-id" with a translation of AD-1's
  clause, keeping the inline code spans (`` `neato` `` etc.) byte-identical. Then set
  the front matter `sourceHash:` of each to the output of
  `node scripts/i18n-hash.mjs docs/known-divergences.md`, computed after the English
  edit is final.
- **Precondition:** every locale `divergences.md` is fresh at the base (planning:
  `npm run docs:i18n-status`, 23 × `stale pages: 0`). So the only English change the
  new hash covers is this one. Stop condition 3 guards it at execution.
- **Rejected:**
  - (a) Edit English only and let the stale banner show. The issue names the 23 copies,
    and `docs-site/.vitepress/README.md` "Keeping translations current" says a refresh
    is re-translate plus hash.
  - (b) Refresh the hashes without translating. That hides a real English change
    behind a current hash, the drift the hash exists to catch.
  - (c) Re-translate the whole paragraph. More churn and more risk of drifting from
    the reviewed translations; only one clause changed.
- **Evidence:** `scripts/i18n-hash.mjs:1-6,19-22` (`divergences.md` hashes
  `docs/known-divergences.md`); `test/docs/translation-lint.test.ts` (well-formed
  `sourceHash`, byte-identical code fences).

### AD-3: gates 5 and 6 are replaced by the docs checks

- **Decision:** `src/` does not change, so the queue rules' gate 5 (bytediff) does not
  apply. No corpus id can reach a Markdown edit, so gate 6's targeted survey is the
  i18n status check: 23 locales, 0 stale, 0 without hash. Gate 4 (`test/docs`) runs
  the translation lint.
- **Rejected:** running the smoke bytediff anyway. It would compare two identical
  bundles; it costs machine time while other queue work runs (load 11.7 at planning).

## Follow-ups found at planning

None.

## Baseline

On `d6b12e9d`, 2026-11-10 during planning: see the planning row of
[decision-journal.md](decision-journal.md). There is no lint script; typecheck is the
static gate.

## Rollback

Reversible: revert the one commit. Documentation only; no output, API or data change.
