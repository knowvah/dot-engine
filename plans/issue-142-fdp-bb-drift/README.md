# Mission: issue #142: fdp's last-bit cluster bb drift

## Objective

The port's fdp layout drifts from native in the last bits. The drift becomes visible
only where a value lands near zero and xdot prints it with `%.5g`. At the tip
`f544f206`, `dot -Kfdp -Txdot tests/graphs/fdp.gv` differs from the port on one value
only: clusterA's `bb` x0, `3.1974e-14` native and `1.5987e-14` in the port. #142's
case is render 3 of `subg-fdp.cluster_k` in root mode (`-3.2742e-11` native,
`1.6e-11` port). Part 11 T7 measured node positions on `fdp.gv` up to `6.0e-12`
inch apart.

Done means the drift has a stated mechanism: the first value at which the port's fdp
departs from native, with its `file:line` in the C and in the port. Then one of
two outcomes ([AD-3](decisions.md#ad-3-outcome-rule)):

- **(a) Port defect** (an unmodelled fma contraction proven by disassembly, a
  `hypot` not routed through `libmHypot`, a reordered operation, an unported
  branch): fix it in `src/layout/fdp/`, pin it with a native-traced unit test, and
  re-trace to the next divergence. Type `fix`.
- **(b) Platform libm** (Apple `sin`, `cos` or `atan2` against V8): no code change.
  The ledger already accepts that class (`docs/known-divergences.md:921-937`), and
  the ruling on #133 makes a new platform model wontfix. Record the mechanism.
  Type `docs`.

Either way, item 156 of `plans/post-16.1-followups/README.md` is marked, and both
journals get a row.

**Out of scope:** native's heap-address nondeterminism (`fdpgen/layout.c:466,501,637`,
part 11 T7: the port equals settled native). Any engine other than fdp. A macOS
`sin`/`cos`/`atan2` model. Any edit to `docs/known-divergences.md` or `docs-site/`
([AD-4](decisions.md#ad-4-no-ledger-edit)).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. They override this brief where
   the two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then the open batch's overview.
   Check finished work with `git log --oneline f544f206..`.
4. Read `.agent-notes/fdp-fma-oracle-2026-06.md` (how fdp reached bit-exactness
   with fma, and the full-precision probe) before tracing.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, never merge `main` into it.
- **Base sha:** `f544f206b5c082c5e4296ad3ecf97e04f30fce45` (tip at planning). If
  the tip moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-142 brief` (this
  directory), then `test(T1): ...` for the trace harness, then T2's commits.
  Commit with `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T2's last step):** `git tag issue-142/pre-squash`, then
  `git reset --soft <base>` and one commit. Outcome (a):

  ```
  fix(fdp): <what the port now computes as C does>

  <mechanism in two or three lines: the C site, what the port did, how the
  last bit reached clusterA's bb x0 on fdp.gv>

  Refs: #142
  ```

  Outcome (b):

  ```
  docs(fdp): trace the 1e-11 cluster bb drift to apple libm <fn>

  <the C site and the first differing value; the ledger's sin/cos class
  and the ruling on #133 cover it, so no code changes>

  Refs: #142
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs`, then `npm run docs:i18n-status` | exit 0; `stale pages: 0` |
| 5 | Smoke bytediff | outcome (a) only; see [T2](batch-2/T2-outcome.md#bytediff) | every changed output equals native, or passes a queue-rule exception |
| 6 | Targeted survey | see [T2](batch-2/T2-outcome.md#targeted-survey) | no input moves away from native |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0). `/tmp/ghl` holds only core and dot_layout, so fdp needs its own plugin
dir (recipe in [T1](batch-1/T1-diagnose.md#plugin-dirs)). Never use `/tmp/ghl1611*`:
that is the 16.1.1 build. Run `oraclePreflight` (`test/corpus/oracle-env.ts:124`)
for `fdp` before trusting native output. Check `uptime` before gate 6 and before
any native loop; above 12, wait.

Baseline at planning: see [decisions.md](decisions.md#baseline).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts: diagnose to a stated
   mechanism, journal it, stop.
3. The trace finds no first divergence that fits (a) or (b) — for example, native
   and port agree on every traced value yet the bb still differs, or the first
   divergence is in code outside `src/layout/fdp/`. Stop with the diagnosis
   artifact as far as it got (what is ruled out, what to instrument next).
4. A fix of class (a) changes any smoke output away from native (gate 5), or moves
   a gate-6 input away from native. Stop with the evidence.
5. A test other than T2's new one fails because of the fix. A test that pins an old
   fdp value may be re-recorded only after the journal states which value it
   pinned and shows the new one equals a native trace.
6. A finding contradicts a statement in `docs/known-divergences.md` (for example,
   the drift turns out not to be A1). That is a ledger question for the
   maintainer: open a `needs-ruling` issue and stop.
7. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Which phase boundaries and statements to trace, and the trace format.
- After an (a) fix, whether a second divergence is also (a): fix it under the same
  rules (one commit per mechanism, at most three fixes; a fourth is stop 3).
- Unit-test wording and placement in the existing fdp test file nearest the fix.
- Item 156's wording, in the style of the other DONE items.
- New defects found on the way: `follow-up` issues per the queue rules.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-5, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | batch 1: the trace |
| [batch-1/T1-diagnose.md](batch-1/T1-diagnose.md) | T1 |
| [batch-2/overview.md](batch-2/overview.md) | batch 2: outcome and close-out |
| [batch-2/T2-outcome.md](batch-2/T2-outcome.md) | T2 |
| [harness/compare.mjs](harness/compare.mjs) | gate 6: native, base, head per input and format |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where a last bit travels to the bb |
| [diagrams/component-map.md](diagrams/component-map.md) | components the trace touches |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |
| 2: T2 | [x] |

## Session end

- One row in `plans/decision-journal.md` (project journal): mechanism, outcome,
  files, gates.
- `.agent-notes/issue-142.md`: the trace recipe and the first-divergence site
  (novel for fdp either way).
- Final message ends with the driver's status line.

## Summary

Run on 2026-11-11, base `f544f206`, per-task history under the tag
`issue-142/pre-squash`.

- **Tasks:** 2 of 2 (T1, T2).
- **Outcome:** (b) for the drift of #142, plus two class (a) fixes found on the way.
  - The drift starts at Apple libm `atan2` against V8 at `lib/fdpgen/layout.c:568`
    (`getEdgeList`; port `src/layout/fdp/ports.ts`), with `cos`/`sin` at
    `tlayout.c:501-502`. With native's libm results injected, the port equals native
    byte for byte on `fdp.gv` and on #142's three renders. No libm model, no ledger
    edit; the port's output on those inputs is unchanged.
  - Fixed: two statements the oracle binary contracts into `fmadd` and the port
    computed plain, `dist2` (`layout.c:569`) and the reversed port fan
    (`layout.c:640`), each pinned by a native-traced value in
    `src/layout/fdp/derive.branch.test.ts`. They change no corpus output.
- **Decisions:** 4 journalled judgment calls (the scratch build copies three files
  instead of an rsync; the counterfactual; fixing the two (a) defects in a class (b)
  mission; the extra cluster bytediff in gate 6). For review: the scope decision, and
  #209.
- **Gates:** 1 typecheck exit 0; 2 `npm test` 571 files, 13488 tests; 3 golden gates
  5/5; 4 corpus + docs 2844 tests, 0 stale pages; 5 smoke bytediff 1960 identical,
  0 diffs (accepted-row changes: none; toward-native changes: none); 6 targeted
  survey 70 scored rows, `lost=0`, head = base, 5 `native-varies`; 280 clustered fdp
  ids identical between base and head.
- **Open:** #209 (`needs-ruling`: model `atan2`/`sin`/`cos` for fdp, or keep the
  clustered rows as accepted drift). Follow-ups #210 (2242's cluster margin), #211
  (1436's component sequence), #212 (`x_layout` on non-clustered inputs), #213
  (`normalize`'s rotation is contracted in the oracle).
