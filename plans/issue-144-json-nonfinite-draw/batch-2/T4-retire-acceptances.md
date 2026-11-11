# T4: re-walk the three ids, retire their acceptances, run the gates, squash

## Context

See the [README](../README.md#objective) and [decisions.md](../decisions.md) AD-4. The
precedent is `383a4f0e` (`chore(corpus): record t11 osage/twopi passes, retire a9
entries`). The rows to retire are the three `"opClass": "[parse]/oracle"` entries for
osage `1221`, `1332` and `2721` in `test/corpus/accepted-divergences-json.json` (about
lines 2333-2387), plus their `"verdict":"accepted"` rows in
`test/corpus/json-parity-osage.jsonl` (lines 77, 218 and 868 at planning).
`registry-staleness.test.ts` requires each acceptance to be backed by a diverged or
accepted walk row, so the jsonl rows and the registry rows change together.

## Steps

1. **Targeted comparison first.** With T1-T3 in, run a `.mts` script under `$TMPDIR`
   (see `.agent-notes/issue-129.md`): for each of the three ids, render the port's osage
   json and compare it to `../harness/out/<id>.osage.json` with `compareJson` at 0.01.
   Expect `pass: true` and 0 diffs. If any diff remains, apply stop condition 4.
2. **Re-walk.** Delete the three rows from `json-parity-osage.jsonl`, then run
   `GVBINDIR=<osage plugin dir> npx tsx test/corpus/json-walk.ts osage --survey`. Before
   you run it, read the walk's resume logic (`json-walk.ts:430-560`) and confirm that it
   renders only ids missing from the jsonl. If it would re-render more, do not run it.
   Write the three rows by hand from step 1 (`"verdict":"conformant"`, in the walk's row
   shape) and update `json-parity-osage.json`'s counts and results to match, as
   `383a4f0e` did. Expect counts to go from `conformant 919 / accepted 10` to
   `922 / 7`.
3. Remove the three registry rows from `accepted-divergences-json.json`.
4. Run `npx tsx test/corpus/parity-report.ts` and keep only the changes that come from
   these three ids (`PARITY-osage-json.md`, `PARITY.md` totals). If it rewrites unrelated
   pages (a timestamp, say), journal that and keep the diff minimal.
5. Mark follow-ups README item 158 (`plans/post-16.1-followups/README.md:723-725`)
   `[DONE — issue #144: ...]`, giving the mechanism in one clause, and name the
   compare-xdot follow-up issue from T3.
6. Run gates 1-6 (README table) and journal each result.
7. Commit `chore(T4): retire the osage json inf/nan acceptances`, then squash per the
   README.

## Write-set

| File | Change |
|---|---|
| `test/corpus/json-parity-osage.jsonl` | 3 rows → conformant |
| `test/corpus/json-parity-osage.json` | counts and 3 results |
| `test/corpus/accepted-divergences-json.json` | 3 rows removed |
| `test/corpus/PARITY-osage-json.md`, `test/corpus/PARITY.md` | regenerated rows/totals |
| `test/docs/**` | only a pinned count that the regeneration moves (journal it) |
| `plans/post-16.1-followups/README.md` | item 158 DONE |
| `plans/issue-144-json-nonfinite-draw/**` | journal, README status |
| `plans/decision-journal.md`, `.agent-notes/issue-144.md` | session end |

## Read-set

`git show 383a4f0e -- test/corpus/json-parity-osage.json test/corpus/PARITY-osage-json.md`,
`test/corpus/registry-staleness.ts`, `test/corpus/json-walk.ts:380-460`.

## Bytediff

Build bundles of the base and the head (`npm run build:js`, then copy `dist/index.js` to
`$TMPDIR/issue-144/{base,head}.mjs`; build the base from a `git worktree add` of the
base sha under `$TMPDIR`, or check out the base sources into a temp dir). Then run
`npx tsx test/tools/bytediff.ts <base>.mjs <head>.mjs ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt <out>.json`.
Expect no changed output: no smoke id has a non-finite draw coordinate, and the port's
xdot writer emits only finite decimals. Any change must equal native, or fall under the
queue rules' accepted-row exception.

## Targeted survey

**How the ids were chosen.** Native output only reaches the change when an xdot draw
string holds a token that the old scan rejected. Planning scanned every cached native
json and xdot output for all 8 engines (`~/.cache/dot-engine/oracle/{json,xdot}-oracle`).
Only osage `1221`, `1332` and `2721` hold `inf`/`nan` draw coordinates. No manifest
input carries an xdot attribute (`_draw_`, `_ldraw_`, `_background`), so the
`init-xdot` path changes nothing on the corpus.

**Run.** Write an ids file with `1221 osage`, `1332 osage` and `2721 osage`, and run the
bytediff above on it (all 5 formats). Expect json to change on all three ids and nothing
else. Each changed json must pass `compareJson` against native (step 1). Then check that
`getDrawOps(parse(<1221 src>), { engine: 'osage' })` (`src/render/xdot-public.ts`) now returns
the cluster's polygon with non-finite points, and record it. Journal the per-row result.

## Acceptance criteria

- Given osage `1221`, `1332` and `2721`, when compared with native json at 0.01, then
  each passes with 0 diffs.
- Given the registry and the walk rows, when `npx vitest run test/corpus` runs, then
  `registry-staleness` and `accepted-class` stay green with the three rows retired.
- Given the smoke list, when base and head bundles run, then no output changes, or each
  change equals native.
- Given follow-ups item 158, when the mission ends, then it is marked DONE.

## Observability

N/A. The evidence is the bytediff and survey JSON in `$TMPDIR`, summarized in the
journal.

## Rollback

Reversible by reverting the squash commit, which restores the three acceptances.
