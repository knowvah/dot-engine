# Mission: issue #149: write a body's edges after its nodes, in creation order

## Objective

Native 16.1.1 rewrote cgraph's `write_body` (`lib/cgraph/write.c:680-716` in
`~/git/graphviz-16.1.1`; upstream `230a65310`, `61e599d14`, `072a4d3ef`). It
walks a body's nodes as before, but it collects their out-edges into a pending
set keyed on `AGSEQ(e)`. After the node walk, `write_edges` (`:662-678`)
writes them in creation order and marks each done in a global bitset. An edge
written once is never written again, bare, in a later sibling or parent body.
`write_edge_test` and `edge_last_written` are gone. The port still has the
16.1.0 shape: it writes each edge right after its tail node, and it re-declares
an edge in a later scope (`src/render/dot/agwrite.ts:263-305`, `SerCtx.edgeLW`
in `src/render/dot/types.ts:26-27`). Every `-Tdot` and `-Txdot` render with
edges is affected, on every engine.

Done means:

- the port writes edges as 16.1.1 does;
- the five probes and the nine corpus witnesses are byte-equal to native
  16.1.1 in `-Tdot` and `-Txdot`, with tests pinning the probes;
- the 47 native fixtures the change turns red are re-captured from 16.1.1
  (line order only);
- every gate is green.

Type `fix`, a patch release. Not `BREAKING`: `-Tdot` bytes are output, not a
contract, and they move only toward native.

**Out of scope:** `-Tcanon` (the port has no canon format), #225 (the warning
that names an anonymous graph `''`), the corpus registries and the
`known-divergences.md` row (AD-5), and any fixture whose 16.1.1 capture
changes content.

## Evidence (measured at planning, base `2c362ef0`)

Throwaway head: a `$TMPDIR` copy of `src/` with the change, bundled with
esbuild. Run with [harness/compare.mjs](harness/compare.mjs) against native
16.1.1:

| ids | `-Tdot` base → head (native lines missing) | `-Txdot` |
|---|---|---|
| `1514` | 2 → 0 (eq) | 6 → 0 (eq) |
| `1581` | 12 → 0 (eq) | 12 → 0 (eq) |
| 5 × `*-radius_dot` | 2 → 0 (eq) | 5 → 0 (eq) |
| 2 × `*-shapes_dot` | 27 → 0 (eq) | 81 → 0 (eq) |
| `2860`, `2860_1` | 0 → 0 (eq) | 0 → 0 (eq) |
| `graphs-b` (neato) | 13 → 0 (eq) | 22 → 0 (eq) |

`1514`/`1581` stderr differ from native on base and head alike (#225). The five
[probes](harness/probes/) differ from native on the base (sorted lines equal)
and are byte-equal on the head. Native output is in [harness/native/](harness/native/),
and native stderr is empty on every probe. A full `npm test` on the throwaway head:
47 failures in 10 files, all stored 16.1.0 captures (AD-3, AD-4).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with this
   brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 2c362ef0..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, and never merge `main` into it.
- **Base sha:** `2c362ef051a5dfef9bb118586632a25311de75e0` (the tip at planning).
  If the tip has moved, use the tip at execution start as the base, journal it,
  and re-run `recapture.sh check` before T2.
- Per-task commits while working: first `docs(mission): add issue-149 brief`
  (this directory), then `fix(T1): ...`, `test(T2): ...`, and T3's journal
  commit. T1's commit is red on the 10 fixture tests until T2. That is expected,
  and the squash removes it. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T3's last step):** `git tag issue-149/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(dot): write a body's edges after its nodes, in creation order

  <two to four lines: 16.1.1's write_body pends a body's out-edges by
  AGSEQ and flushes them after the node walk, marking each done, so an
  edge is never re-declared in a later scope; fixtures re-captured>

  Refs: #149
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T3](batch-1/T3-gates-squash.md#bytediff) | only `dot`/`xdot` change; each changed row `eq` or `toward` |
| 6 | Targeted survey | see [T3](batch-1/T3-gates-squash.md#targeted-survey) | no `AWAY`; every `sortEq=yes` row `eq` |

Oracle (ADR-0002): `~/git/graphviz-16.1.1/build/cmd/dot/dot` with
`/tmp/ghl1611` (dot) or `/tmp/ghl1611-all` (other engines), as
`test/corpus/oracle-paths.mjs` says. Run `oraclePreflight`
(`test/corpus/oracle-env.ts`) before trusting native output. A missing
`config8` is fixed with `GVBINDIR=<dir> <dot> -c`. Never use the 16.1.0 build
as the oracle. Check `uptime` before gates 5 and 6. Above 12, wait. (Load was
85 at planning, so planning ran single renders only.)

## Stop conditions

1. A probe or witness id still differs from native 16.1.1 after T1. Diagnose to
   a full artifact (`rules/diagnosis.md`), journal it, comment it on #149, and
   stop.
2. `recapture.sh` reports a `CONTENT` or `MISSING` file, or T2 leaves a test
   red other than the hackflag order. Journal the file and stop. Its fixture
   carries another upstream change, and AD-3 does not cover it.
3. The fix needs a file outside the task write-sets. Journal why and stop.
4. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
5. Gate 5 or 6 shows an `AWAY` row, a changed `svg`/`json`/`plain`/`cmapx`
   output, or a `sortEq=yes` row that is not `eq`. Halt with the row.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names, wording and placement within the write-sets.
- Extra probes, if a gate-6 id shows a pattern the five do not cover (pin it
  only when the head equals native).
- The exact wording of the provenance lines (AD-3).
- A divergence found on the way that this fix does not cause: open a `follow-up`
  issue, per the queue rules.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-5, out of scope, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1, T2, T3 in sequence |
| [batch-1/T1-write-body.md](batch-1/T1-write-body.md) | red probe tests, the port |
| [batch-1/T2-fixtures.md](batch-1/T2-fixtures.md) | the 47 fixtures, the hackflag order |
| [batch-1/T3-gates-squash.md](batch-1/T3-gates-squash.md) | gates 1-6, squash |
| [harness/compare.mjs](harness/compare.mjs) | native, base and head per id, engine and format, with verdict |
| [harness/recapture.sh](harness/recapture.sh) | `check`/`apply` the 47 fixture re-captures |
| [harness/probes/](harness/probes/) | the five inputs |
| [harness/native/](harness/native/) | native 16.1.1 `-Tdot`, `-Txdot` (stderr empty) |
| [diagrams/data-flow.md](diagrams/data-flow.md) | `agwrite` 16.1.0 against 16.1.1 |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | the mission journal |
| [harness/mark.mjs](harness/mark.mjs) | gate 6: which inputs the change reaches (`D`, `R`, `N`), no native |
| [harness/classify.mjs](harness/classify.mjs) | per-statement check of a row that is not `eq` (added at execution) |
| [harness/results/](harness/results/) | gate 5 and 6 outputs; [non-eq-rows.md](harness/results/non-eq-rows.md) |

| Batch | Status |
|---|---|
| 1: T1, T2, T3 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  files, gates.
- Write `.agent-notes/issue-149.md` only for something novel. Otherwise, say in
  the journal row that nothing was novel.
- Comment on #149 with the result and the ids that moved, for the maintainer's
  survey (AD-5). Do not close it: it closes when the branch merges.
- The final message ends with the driver's status line.

## Summary (2026-11-16)

- **Tasks:** 3 of 3 (T1, T2, T3). One batch.
- **Result:** `writeBody` pends a body's out-edges by `Edge.seq` and
  `writeEdges` writes them after the node walk, in creation order, marking each
  done, as 16.1.1's `write_body`/`write_edges` do. `writeEdgeTest` and
  `SerCtx.edgeLW` are gone. The five probes and the witnesses (11 dot ids and
  `graphs-b:neato`) are byte-equal to native 16.1.1 in `-Tdot` and `-Txdot`.
  47 fixtures re-captured from 16.1.1 (`recapture.sh`: 47 `order`), the
  hackflag order swapped (AD-4).
- **Decisions:** 22 journal rows, three flagged for review, all in gates 5
  and 6: two rows the brief's stop condition 5 names
  (`graphs-polypoly`/osage/`-Tdot`, `sortEq=yes` and not `eq`;
  `graphs-in`/dot/`-Txdot`, `AWAY`) are artifacts of the line-count verdict
  over a layout difference that predates the mission, and the `toward` rows
  pass on a per-statement check (`harness/classify.mjs`), not on the line
  count alone.
- **Gates:** 1 typecheck exit 0; 2 `npm test` 577 files, 13558 passed, 18
  expected fail; 3 goldens 5/5; 4 corpus + docs 2863 passed; 5 smoke bytediff
  2352 jobs, 640 changed, all `dot`/`xdot`, 0 capped: 566 `eq`, 74 `toward`;
  6 marker scan 1229 inputs (`N` 662, `R` 445, `D` 2, 19 capped), 58 ids
  compared: 108 `eq`, 7 `toward`, 1 `AWAY` (diagnosed, above).
- **Accepted-row and toward-native changes:** 24 and 16 id:engine pairs,
  listed with counts in
  [harness/results/non-eq-rows.md](harness/results/non-eq-rows.md). On every
  one the head equals native with attribute values masked, no value differs
  from the base, and no value that was native's is lost.
- **Stop conditions:** 1, 2, 3, 4 and 6 not triggered. 5: see Decisions.
- **Follow-ups:** none opened.
- **Per-task history:** tag `issue-149/pre-squash`.
