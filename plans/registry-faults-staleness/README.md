# Mission: registry fault acceptances + staleness checks

## Objective

Close post-16.1 follow-ups 1 and 2 (`plans/post-16.1-followups/README.md`).
(1) Let the engines/json/map accepted-divergence registries accept a
**port-error or timeout** verdict, and move acceptance **A10** (`2784` throws
`Map maximum size exceeded` on circo/twopi/neato/fdp/sfdp) out of
`docs/known-divergences.md` prose and into the registries. (2) Add a single
staleness check over the engines/json/map/plain/xdot/dot-format registries so
an accepted entry whose committed walk row no longer matches its declared
verdict fails `npm test`. Then update the English doc and its 23 locale copies.

Test/docs infrastructure only: **no `src/` change** (STOP 2), so no dot survey
or engine walk is required; the only oracle work is re-walking six cached
2784 rows (T5).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full
   (`rules/autonomous-execution.md` is a stub).
2. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then the current batch's
   `overview.md`. Verify task commits with `git log --oneline`.
3. Read `.agent-notes/t14-roster-additions.md` (pack/2784 context) and
   `.agent-notes/` entries a task spec names.

## Branch

`feature/registry-faults-staleness` off `main` (`e8b4e78b` or later). First
commit on the branch: this brief + `.claude/settings.autonomous.json`
(`docs(plans): add the registry faults mission brief`). Then one commit
per task (Conventional Commits, ≤72-char subject, lines ≤80, no attribution);
T7a–c share one commit. END: push the branch and open the PR (pre-authorized;
the repo rebase-merges — do not merge).

## Quality gates (every task, before commit)

- `npm run typecheck` — exit 0 — fix_and_rerun
- `npx vitest run test/corpus test/docs` — exit 0 — fix_and_rerun
- `bash test/golden/gates.sh` — 5/5 PASS — fix_and_rerun (T1–T5, T8)
- T7 only: `node scripts/docs-i18n-status.mjs` — `stale pages: 0` for every locale
- No survey/walk gate: `git diff main -- src` must stay empty (else STOP 2).

## Stop conditions

1. A task must write outside its write-set (generated artifacts excepted —
   see push-forward).
2. Any `src/` file needs changing.
3. The same gate check fails twice in a row (2-fix cap spent); the journal row
   carries the diagnosis artifact (`~/.claude/rules/diagnosis.md`).
4. An AD is contradicted (e.g. json/map need report-time resolution, or a
   seventh registry needs fault fields).
5. A 2784 re-walk misses the oracle cache (a native render would start:
   4–20 min, ~100 GB peak).
6. A re-walk or regeneration changes any row/count beyond 2784 and the planned
   1879/1435 retirements.
7. Strict staleness flags an entry other than fdp `1879` ×3 and dot-format
   `1435` (each new retirement needs the user).
8. A translation cannot keep anchors, links, and code spans byte-identical, or
   a locale's include structure differs from the English source.
9. Push to `main`, merge a PR, version bump, tag, or publish.

## Push forward (decide alone, journal it)

- Wording of test names, failure messages, registry `comment` fields.
- Committing `.json`/`.jsonl`/`PARITY-*.md` the planned walk/report commands
  rewrite (part of T5); `git checkout` any summary a walk rewrites outside it.
- Small type tweaks to T1's interface if T2/T3/T4 consume the final shape.
- Dashboard rendering of accepted fault rows (blank `#diffs`, `errIncludes`
  as the bound/reason).
- 1–3-line pre-existing fixes in files being edited; others → `.agent-notes/`.
- Locale grouping/order and translation wording within
  `plans/docs-site-localization/translation-spec.md`.
- Recreate the 16.1 walks' `GVBINDIR` path with identical symlinks to keep a
  cache hit (T5 spec has the path).

## Batches

| Batch | Tasks | Mode | Done |
|---|---|---|---|
| [1](batch-1/overview.md) | T1 fault-acceptance helper | single | [x] |
| [2](batch-2/overview.md) | T2 staleness + retirements · T3 engine join · T4 json/map walkers | parallel | [x] |
| [3](batch-3/overview.md) | T5 A10 entries + re-walk + dashboards | single | [x] |
| [4](batch-4/overview.md) | T6 English docs | single | [x] |
| [5](batch-5/overview.md) | T7a/b/c locale re-translations (one commit) | parallel | [x] |
| [6](batch-6/overview.md) | T8 close-out + PR | single | [x] |

## Documents

- [decisions.md](decisions.md) — AD-1 … AD-7 (locked)
- [decision-journal.md](decision-journal.md) — append-only execution log
- [diagrams/component-map.md](diagrams/component-map.md),
  [diagrams/data-flow.md](diagrams/data-flow.md)
- Global journal: append a mission-summary row to `plans/decision-journal.md` (T8).

## Conventions

- Only the orchestrator writes `decision-journal.md`; subagents report
  observations in their hand-back. Batch-2 tasks have disjoint write-sets and
  may run as parallel subagents (worktrees optional); land them one at a time
  with gates between.
- TDD: each code task writes its failing tests first.
- Diagnosis mode for any unexpected failure: mechanism / origin / causal chain
  / ruled out in the journal row.
- Planning provenance: `plans/post-16.1-followups/README.md` items 1–2;
  `plans/graphviz-16.1-sync/decision-journal.md` rows T13 ph.2 / T13 land.

## Session-end summary (2026-10-14)

- **Tasks:** 8/8 planned completed (T1–T6, T7a–c in one commit, T8); no STOP
  condition hit.
- **Decisions journaled:** 9 rows; flagged for review: T5 omits `delta` on the
  json/map A10 entries (spec said `"—"`), T6 wording "does not finish within
  the walk's time budget" (MEDIUM confidence on the exact kill cause), T7 used
  `general-purpose` agents instead of `technical-writer`.
- **Retirements:** fdp `1879` (engines/json/map), dot-format `1435`.
- **Gates (final tree):** typecheck 0; `vitest test/corpus test/docs` 2778/2778;
  golden 5/5; `docs-i18n-status` stale pages 0 ×23; `git diff main -- src`
  empty.
- **Follow-up:** json/map detail pages render accepted fault rows with
  `#diffs 0` and an empty firstDiff (cosmetic).
