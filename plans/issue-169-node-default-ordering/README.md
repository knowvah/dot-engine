# Mission: issue #169: dot honours a node-default `ordering`

## Objective

`doOrderingForNodes` (`src/layout/dot/mincross-build.ts:341-347`) reads
`n.attrs.get('ordering')`. A `node [ordering=out]` default lives in the node's
`nodeDefaultsSnapshot`, not in `n.attrs`, so the port never orders those nodes'
edges. C `do_ordering_for_nodes` (`lib/dotgen/mincross.c:489-505`) reads
`late_string(n, N_ordering, NULL)`, which is `agxget`: the node's own value, else
the default it was created under. The port already has that accessor, `nodeAttr`
(`src/common/attr-get.ts:25`).

The same two C functions print `ordering '%s' not recognized for node '%s'.`
(`mincross.c:499`) and `ordering '%s' not recognized.` (`mincross.c:525`). The
port prints neither. Native prints both (`harness/native/bad-*.err`).

Done means: `doOrderingForNodes` reads through `nodeAttr`; both warning branches
are ported; tests pin native's `-Tplain` output for a root-scoped and a
subgraph-scoped node default, a default declared after the nodes, and native's
stderr for the three bad-value probes; all gates are green. Type `fix`, so this is
a patch release.

**Out of scope:** the aux mincross order on labelled flat-adjacent port edges
(#170). `aux-flat-adj.gv` changes with this fix but still differs from native;
that is expected. Any other `src/` file. The `!G_ordering && !N_ordering` early
return of `ordered_edges` (`mincross.c:516`): the port's walk does nothing in that
case either, so there is no behaviour to port.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. They override this brief where
   the two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline f5ae1c08..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, never merge `main` into it.
- **Base sha:** `f5ae1c082a58dc3054e60286fc81a5056a060b2f` (tip at planning time).
  If the tip moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-169 brief` (this
  directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-169/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(dot): honour a node-default ordering as do_ordering_for_nodes does

  C reads each node's ordering with late_string, which falls back to the
  node default it was created under; the port read only the node's own
  attributes, so node [ordering=out] did nothing. Read it through
  nodeAttr, and print both "ordering not recognized" errors of
  do_ordering_for_nodes and ordered_edges, as native does.

  Refs: #169
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-node-default-ordering.md#bytediff) | identical on every job (expected) |
| 6 | Targeted survey | see [T1](batch-1/T1-node-default-ordering.md#targeted-survey) | the table in T1 |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0) with `GVBINDIR=/tmp/ghl` (core + dot_layout: enough, the change is
dot-only). Run `oraclePreflight` (`test/corpus/oracle-env.ts:124`) for `dot` before
trusting native output; a missing `config8` is fixed with
`GVBINDIR=/tmp/ghl ~/git/graphviz/build/cmd/dot/dot -c`. Never use `/tmp/ghl1611*`:
that is the 16.1.1 build. Check `uptime` before gate 6; above 12, wait.

Baseline at planning: all four baseline gates green on `f5ae1c08` (see
[decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts: diagnose to a stated
   mechanism, journal it, stop.
3. Gate 5 shows any changed output. No smoke id mentions `ordering`, and the
   candidate change left all smoke jobs identical at planning. A change means an
   unexpected path: diagnose it, and halt per the queue rules unless it equals
   native.
4. Gate 6 misses its table (any `head` count above the table's, or a `headErr` of
   `DIFF` where the table says `same`). The premise is wrong: stop with the
   evidence.
5. A test other than the new ones fails because of the change. At planning, no
   test set a node-default `ordering` or an unrecognised value.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names, wording and placement inside the two test files.
- How the long `agerrorf` line is wrapped (keep the message text exact).
- Whether `aux-flat-adj.gv` gains FLATORDER edges for auxt in the aux graph: check
  it with a temporary trace (the issue says native adds two), journal the count,
  remove the trace. If the port adds none, that is a finding for #170, not a stop:
  comment on #170 and continue.
- A divergence found on the way that this fix does not cause: `follow-up` issue,
  per the queue rules.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-node-default-ordering.md](batch-1/T1-node-default-ordering.md) | the task |
| [harness/compare.mjs](harness/compare.mjs) | gate 6: native, base, head per input and format |
| [harness/probes/](harness/probes/) | the seven probe inputs |
| [harness/native/](harness/native/) | native 16.1.0 `-Tplain` and stderr per probe |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where the ordering value is read |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (project journal): mechanism, files, gates.
- `.agent-notes/issue-169.md` only for something novel; otherwise state there was
  nothing novel in the journal row.
- Final message ends with the driver's status line.

## Summary (2026-11-11)

- **Tasks:** 1 of 1 (T1). Executed in two sessions: the first was interrupted
  by a machine update after the green step and the aux trace; the second ran the
  gates and finished.
- **Decisions:** 17 journal rows; one flagged for review (gate 6 was run with
  `uptime` above 12, see "gate 6 load").
- **Gates:** typecheck 0; `npm test` 571 files, 13496 tests; golden gates 5/5;
  corpus + docs 24 files, 2844 tests; smoke bytediff 1960 of 1960 identical;
  targeted survey equals the T1 table on all 24 rows.
- **Deviations from the brief:** both `doOrderingForNodes` unit tests live in
  `ordering.test.ts` (the branch test file would pass the 500-line hook cap);
  one extra unit test (empty value); stderr is pinned as joined pieces, not a
  list of lines. AD-2 says native exits 0 on the bad-value probes; it exits 1
  and still prints the layout. The port has no exit status, so nothing follows.
- **Known issues / follow-ups:** none new. `aux-flat-adj.gv` still differs from
  native (#170); the port now adds native's two FLATORDER edges there.
