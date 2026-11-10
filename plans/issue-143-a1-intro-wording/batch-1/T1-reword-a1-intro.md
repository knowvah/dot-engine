# T1: reword the A1 iterative-engine intro

## Context

See the [README](../README.md#objective) for the false clause and where the document
contradicts it, and [decisions.md](../decisions.md) for AD-1 (English wording), AD-2
(locales and hashes) and AD-3 (gates).

## Task

TDD exception: documentation only. The existing `test/docs` suite (translation lint,
i18n status, locale completeness) is the check.

1. **Setup.** `npm run docs:i18n-status`: every locale must show `stale pages: 0` (stop
   condition 3). `grep -n "triaged" docs/known-divergences.md`: expect `:119`
   ("untriaged drift", correct, leave it) and the clause at `:190`.
2. **English (AD-1).** Edit `docs/known-divergences.md:189-191` only. Re-wrap the
   edited lines to the paragraph's width. `git diff --stat` shows one file, a few
   lines.
3. **Hash.** `node scripts/i18n-hash.mjs docs/known-divergences.md` → `<H>`. Compute it
   only after step 2 is final; any later English edit means recomputing.
4. **Locales (AD-2).** For each prefix in `ls docs-site/.vitepress/locales/*.ts`
   (23: cs da de es et fi fr hu is it ja ko nl no pl pt-br ro ru sk sv tr zh-cn zh-tw):
   find the line after `<a id="a1-iterative-characterization"></a>` in
   `docs-site/<prefix>/divergences.md`, replace that locale's "not yet triaged per-id"
   clause with a translation of the new clause, keep the inline code spans
   byte-identical, and set `sourceHash: <H>` in the front matter. Leave every other line
   untouched.
5. **Check.** `npm run docs:i18n-status`: 23 × `stale pages: 0`,
   `pages without sourceHash: 0`. `git diff --stat`: 24 doc files plus the plans.
   `git diff docs-site | grep '^[-+]' | grep -v sourceHash` shows only the clause lines.
6. Mark item 157 in `plans/post-16.1-followups/README.md` (line 721)
   `**[DONE — issue #143: the clause names the ±0.5 tolerance as the difference; 23 locales re-translated and re-hashed]**`,
   in item 154's style.
7. Gates 1-6 (README), journal, `.agent-notes/issue-143.md`, then the squash.

## Write-set

- `docs/known-divergences.md` (lines 189-191)
- `docs-site/{cs,da,de,es,et,fi,fr,hu,is,it,ja,ko,nl,no,pl,pt-br,ro,ru,sk,sv,tr,zh-cn,zh-tw}/divergences.md`
  (front matter `sourceHash`, and the clause on the line after the anchor)
- `plans/post-16.1-followups/README.md` (item 157)
- `plans/issue-143-a1-intro-wording/decision-journal.md`, `plans/decision-journal.md`
- `.agent-notes/issue-143.md`

## Read-set

- `docs/known-divergences.md:100-125,187-240`
- `test/corpus/engine-walk.ts:100-125`
- `scripts/i18n-hash.mjs`, `scripts/docs-i18n-status.mjs`
- `docs-site/.vitepress/README.md` ("Keeping translations current")
- `test/docs/translation-lint.test.ts`

## Interface contracts

None: no code changes, no task depends on this one.

## Observability

N/A: documentation only; no runtime path changes.

## Rollback

Reversible: revert the commit.

## Acceptance criteria

- Given `docs/known-divergences.md` at head, when grepping for "not yet triaged" or
  "**not** yet triaged", then nothing matches, and the paragraph's table and every
  figure are byte-identical to the base.
- Given the 23 locale `divergences.md` at head, when running
  `npm run docs:i18n-status`, then every locale reports `stale pages: 0` and
  `pages without sourceHash: 0`.
- Given `git diff <base> -- docs-site`, when filtering out `sourceHash` lines, then each
  of the 23 files changes only the clause line(s) after the anchor.
- Given the head, when running `npx vitest run test/docs`, then it exits 0.
