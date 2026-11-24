# T1: fi's word for per-id, the sv typo

## Context

See the [README](../README.md#objective) and [decisions.md](../decisions.md)
(AD-1 word, AD-2 no hash change, AD-3 gates).

## Task

TDD exception: documentation only. The `test/docs` suite and
`docs:i18n-status` are the check.

1. **Setup.** `grep -n syykohtai docs-site/fi/divergences.md` → lines 100,
   239, 247, 269, 270, 1134 (stop 2 otherwise).
   `grep -rn godkändande docs-site docs` → only `docs-site/sv/divergences.md:199`.
   `npm run -s docs:i18n-status > $TMPDIR/i18n-base.txt`.
2. **fi (AD-1).** On those six lines only, `syykohtai` → `tunnistekohtai`:
   - 100 `syykohtaisella` → `tunnistekohtaisella`
   - 239 `syykohtaisista` → `tunnistekohtaisista`
   - 247 `syykohtaisia` → `tunnistekohtaisia`
   - 269 `syykohtaisista` → `tunnistekohtaisista`
   - 270 `syykohtaisessa` → `tunnistekohtaisessa`
   - 1134 `syykohtainen` → `tunnistekohtainen`
3. **sv.** `:199` `godkändandeprocenten` → `godkännandeprocenten`.
4. **Check.** Both greps of step 1 now empty. `git diff --stat` shows the two
   pages, `7 insertions(+), 7 deletions(-)`. `git diff | grep '^[-+]' |
   grep -v '^[-+][-+]'` shows only the seven lines; front matter unchanged.
   `npm run -s docs:i18n-status | diff $TMPDIR/i18n-base.txt -` is empty.
5. Commit `docs(T1): ...`. Gates 1-6 (README), journal rows, the
   stale-translation follow-up check (README push-forward), then the squash.

## Write-set

- `docs-site/fi/divergences.md` (lines 100, 239, 247, 269, 270, 1134)
- `docs-site/sv/divergences.md` (line 199)
- `plans/issue-200-fi-sv-wording/decision-journal.md`, `plans/decision-journal.md`
- `.agent-notes/issue-200.md` (only for a novel finding)

## Read-set

- `docs/known-divergences.md:91-96,216-235,278-283,1166-1170` (the English)
- `docs-site/fi/divergences.md:98-104,237-249,267-272,1132-1136`
- `docs-site/sv/divergences.md:196-201`

## Interface contracts

None: no code changes, no task depends on this one.

## Observability

N/A: documentation only; no runtime path changes.

## Rollback

Reversible: revert the commit.

## Acceptance criteria

- Given `docs-site/fi/divergences.md` at head, when grepping `syykohtai`, then
  nothing matches, and `grep -c tunnistekohtai` is 7 (the six plus `:103`).
- Given `docs-site` at head, when grepping `godkändande`, then nothing
  matches, and sv `:199` contains `godkännandeprocenten`.
- Given `git diff <base> -- docs-site`, then exactly seven lines change, none
  of them front matter.
- Given the head, when running `npx vitest run test/docs` and
  `npm run docs:i18n-status`, then the tests exit 0 and the status output
  equals the base's.
