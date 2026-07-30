<!-- SPDX-License-Identifier: EPL-2.0 -->
# T5 — re-walk json/map so the computed class absorbs the verified ids

**Agent:** executor · **Depends on:** T4 · **Commit:** one

## Context

`json-walk.ts` and `map-walk.ts` resolve acceptance at **walk time**: an id in
the accepted set is recorded `accepted`, otherwise `diverged`
(`json-walk.ts:320`). The accepted set is the union of hand per-id rows and the
**computed class** — `accepted-class.ts` reads
`attribution-<engine>.json` and admits every `drift-exonerated` id. So once T3
has written those verdicts, a re-walk is all that is needed for the class to
absorb them; no registry edit is required, and none is permitted (see
[constraints.md](../constraints.md) "explicitly NOT push-forward").

## Task

Re-walk only the currently-`diverged` rows on the affected tracks. The walkers
resume by id, so drop just those rows from the resume JSONL and re-run:

```
GVBINDIR=/tmp/ghl JSON_CONCURRENCY=4 npx tsx test/corpus/json-walk.ts <engine> --survey
GVBINDIR=/tmp/ghl MAP_CONCURRENCY=4 npx tsx test/corpus/map-walk.ts sfdp
```

Note `map-walk.ts` routes a **positional engine** to the per-engine walk;
`--survey` there is dot-only legacy (line ~649-664). Engines sequentially.

A targeted re-walk is legitimate here — as it was in PR #37 — because this change
only ADDS ids to the walk-time accepted set, and that set is read solely in the
branch where diffs already exist. A conformant comparison cannot be altered by
construction. (This reasoning does **not** extend to any `src/` change: see S15.)

Expect the universe to be 910, so a re-walk may also pull in ids the tracks are
behind on — including `1652` for the json tracks, whose render is ~800s per
engine. Budget for that.

## Write-set

- `test/corpus/json-parity-neato.json` + `.jsonl`
- `test/corpus/json-parity-fdp.json` + `.jsonl`
- `test/corpus/json-parity-sfdp.json` + `.jsonl`
- `test/corpus/map-parity-sfdp.json` + `.jsonl`
- `plans/attribute-and-address-new-divergences/decision-journal.md`

Do **not** regenerate `PARITY*.md` — T7 is their sole writer, so that two tasks
never write the same generated file.

## Read-set

- `evidence/json-transfer.md` from T4 — the verified set (the only ids allowed to
  be absorbed)
- `test/corpus/accepted-class.ts` — how membership is computed
- `test/corpus/json-walk.ts:315-322` (verdict selection) and `:447-500`
  (resume model)
- `test/corpus/map-walk.ts:640-665` (CLI routing) and `runEngineWalk`'s resume

## Acceptance criteria

1. **Given** the verified-exonerated ids, **when** the walkers re-run, **then**
   their rows read `accepted` and the 7 target rows from the mission scope are
   resolved.
2. **Given** the re-walk completes, **when** compared against the pre-walk
   artifacts, **then** no id outside the target set changed verdict — except ids
   newly entering the universe, which must be enumerated.
3. **Given** an id was NOT verified in T4, **then** it remains `diverged` and is
   not silently absorbed.
4. **Given** any registry file shows as modified, **then** stop — the class should
   have made a registry edit unnecessary (**S3**, contradicts D5).

## Observability requirements

N/A. Signal = the per-track `counts` block in each regenerated `.json`; journal
the before/after diverged and accepted numbers per track.

## Rollback

**Reversible** — regenerated artifacts; `git checkout` the eight files while no
sweep is running.

## Commit

`test(corpus): absorb the attributed drift ids into the json/map classes`
Body: per-track before/after counts, and confirmation that no registry was edited.
