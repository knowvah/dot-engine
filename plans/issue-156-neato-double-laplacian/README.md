# Mission: issue #156: neato double-precision Laplacian and conjugate gradient

## Objective

Graphviz 16.1.1 computes neato's hierarchy Laplacian and its conjugate gradient
in double (upstream `1936e80d6`):

- `IMDS_given_dim`'s `lap` is `double **`.
- `conjugate_gradient_f` became `conjugate_gradient_d`, built on
  `right_mult_with_vector_d`.
- The subspace stress matrix is built with `mult_dense_mat_d`.
- `mult_dense_mat` and `right_mult_with_vector_f` are deleted.

Three follow-up commits (`e5be39033`, `2aca7c60d`, `5cb68c2e0`) drop
`IMDS_given_dim`'s `b != balance[i]` guard, which changes nothing.

The port still runs the float path, so it reproduces 16.1.0. On the 12
`mode=hier` probes ([harness/probes/](harness/probes/)) the base equals native
16.1.0 byte for byte, and it is 10/24 EQUAL against 16.1.1 (plain and xdot). The
worst cases are `case-tdist`, with node moves of about 0.05 in, and
`rtest-mode-hier`, with 483 plain lines. `mode=hier` is the only way in: it
reaches both changed sites (smart init → subspace CG, then `IMDS_given_dim`).

The port needs:

1. `conjugateGradientD` with the oracle's reduction widths
   ([AD-1](decisions.md#ad-1-one-double-cg-conjugategradientd-with-the-oracles-block-pattern)),
   and the float path deleted
   ([AD-2](decisions.md#ad-2-retire-the-float-path-entirely)).
2. `IMDS_given_dim` in double, with fused balance terms and no guard
   ([AD-3](decisions.md#ad-3-imds_given_dim-in-double-as-the-oracle-computes-it)).
3. The subspace path on `multDenseMatD` and `conjugateGradientD`
   ([AD-4](decisions.md#ad-4-the-subspace-path-uses-multdensematd-and-conjugategradientd)).
4. Every 16.1.0 fixture on this path re-captured from 16.1.1
   ([AD-5](decisions.md#ad-5-native-fixtures-on-this-path-are-re-captured-from-1611-never-from-the-port)).

Done means:

- [harness/compare-native.sh](harness/compare-native.sh) on the head gives 24/24
  EQUAL. The base gives 10/24.
- The unit fixtures that T2 re-captures are red on the base and green on the
  head, bit for bit. The float functions are gone (`grep` finds no
  `conjugateGradientF`, `rightMultWithVectorF` or `multDenseMat(`).
- Every gate is green. Smoke bytediff is identical, or every changed output
  equals native.

Type `fix`.

**Out of scope:**

- The other 16.1.1 neatogen commits (#154 took the vpsc guards; the rest are
  refactors).
- #148's corpus inputs. `start=self` under `mode=major`, which stays loud
  (`start.ts:158`). That loud throw is why the subspace path is reachable only
  through `mode=hier`.
- `9f71d9ee9` (`(float)-1.0` → `-1.0f`), which changes nothing.

## Evidence (measured at planning, base `55bb3ef4`)

- **Oracle codegen.** `_conjugate_gradient_d`, `_mult_dense_mat_d` and
  `_IMDS_given_dim` are local symbols in the 16.1.1 neato plugin. The solver and
  `mult_dense_mat_d` are out of line, so each has one reduction pattern for every
  caller. The widths and the fused balance loops are tabulated in AD-1 and AD-3.
  The excerpts are in [harness/disasm/](harness/disasm/).
- **Probes.** [harness/base-results.txt](harness/base-results.txt): 10/24 EQUAL
  against 16.1.1, with stderr equal everywhere. Base `-Tplain` against native
  16.1.0 (a `$TMPDIR` plugin dir symlinking `~/git/graphviz/build/plugin/{core,dot_layout,neato_layout}`)
  differs on 0 of 12. The probes are:
  - the 6 `__fixtures__/hier` graphs;
  - corpus `1554`;
  - random DAGs with 12, 40 and 80 nodes;
  - rtest `graphs/mode.gv` with `-Gmode=hier`, and with `-Gmode=hier -Glevelsgap=1`
    (`tests/test_rtest.py:191-192`; the corpus runs `mode.gv` without those
    flags).
- **Fixtures.** Of the stored `__fixtures__/hier/*.plain` files, these differ
  under 16.1.1: `hier-probe` (1 line), `cases/tdist` (12) and `cases/dirnone` (10).
- **`oraclePreflight`** for neato (`/tmp/ghl1611-all`): `config8` present,
  version 16.1.1.
- **Baseline gates** (load 5-11):
  - typecheck exit 0;
  - `npm test` 580 files, 13683 passed, 18 expected fail;
  - `gates.sh` 5/5 PASS;
  - corpus + docs 25 files, 2863 passed.
- **`smart-ini-x.ts` is 503 lines.** The complexity hook blocks any edit that
  makes it longer (it is over 500). Gate 4's cap is 600.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, then [decisions.md](decisions.md), then
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 55bb3ef4..`.
4. Read `.agent-notes/issue-129.md` (how to link a `libneatogen.a` harness, and
   `.mts` for tsx scripts) and `.agent-notes/post-16-1-followups-8.md` (how to
   relink one instrumented neatogen file).

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `55bb3ef425f8ad8c1a83816af59a766ea3a42bfd` (tip at planning). If
  the tip moved, use the tip at execution start as the base and journal it.
- **Per-task commits while working:**
  1. `docs(mission): add issue-156 brief` (this directory).
  2. `test(T1): …` (harness and calibration evidence, `plans/` only).
  3. `fix(T2): …`.

  Commit with `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T2's last step):** `git tag issue-156/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(neato): use double matrices in the laplacian and conjugate gradient

  Graphviz 16.1.1 builds IMDS_given_dim's Laplacian and the subspace
  stress matrix in double and solves both with conjugate_gradient_d
  (upstream 1936e80d6), deleting the float solver, mult_dense_mat and
  right_mult_with_vector_f. Port it with the oracle's reduction widths
  and fused balance terms, drop the no-op b != balance[i] guard
  (e5be39033), and re-capture the mode=hier fixtures from 16.1.1.

  Refs: #156
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; 18 expected fail; the count moves only by the tests T2 adds or deletes, journalled |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0, 2863 passed |
| 5 | Smoke bytediff | see [T2](batch-1/T2-port-double-cg.md#bytediff) | identical, or each change equals native |
| 6 | Targeted survey | see [T2](batch-1/T2-port-double-cg.md#targeted-survey) | probes 24/24 EQUAL; `1554` equal to native |

The oracle is graphviz 16.1.1 (ADR-0002): `~/git/graphviz-16.1.1/build/cmd/dot/dot`
with `/tmp/ghl1611-all` for neato. Run `oraclePreflight` (`test/corpus/oracle-env.ts`)
before you trust native output. If `config8` is missing, run
`GVBINDIR=/tmp/ghl1611-all <dot> -c`. Check `uptime` before gates 5 and 6, and
wait if the load is above 12.

## Stop conditions

1. A file outside a task's write-set needs a change.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. T1's harness `conjugate_gradient_d` does not have the plugin's reduction
   pattern, or its vectors disagree with AD-1's widths. Instrument it, journal
   the widths that match, and go on only if the plugin's disassembly agrees with
   them. If it does not, halt with the evidence.
4. After T2, a probe still differs from native 16.1.1. Trace the first
   intermediate value that departs: per-iteration `y`, `balance`, CG `r·r` and
   `alpha` from an instrumented copy of the 16.1.1 plugin, relinked as in
   `.agent-notes/post-16-1-followups-8.md`. Fix it if the cause is in the
   write-set. Otherwise halt with the diagnosis.
5. A red-step test passes on the base. Diagnose that before you change the test.
6. Gate 5 or 6 changes an output that does not equal native and is not a
   toward-native or accepted-row change under the queue rules.
7. Any edit would make `smart-ini-x.ts` longer than 503 lines.

## Push-forward (decide alone, journal it)

- Whether `conjugateGradientD` reuses the `cgf*` helper structure (renamed) or
  shares it with `conjugateGradient`. Also its test file (`conjgrad.test.ts` or a
  new `conjgrad.d.test.ts`).
- The harness layout under `harness/` (one C file with modes, or one per
  function) and the random-input sizes, as long as n spans 5..40 and covers
  n % 8 ≠ 0 and n % 4 ≠ 0.
- Whether to add the 12/40/80-node DAGs as new `__fixtures__/hier/cases` (plain
  only, captured from native 16.1.1).
- How to word the fixture headers.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-6, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-native-harness.md](batch-1/T1-native-harness.md) | native harness and calibration |
| [batch-1/T2-port-double-cg.md](batch-1/T2-port-double-cg.md) | the port and the fixtures |
| [harness/compare-native.sh](harness/compare-native.sh) | probes: port bundle against native, plain and xdot |
| [harness/probes/](harness/probes/) | 12 `mode=hier` probe graphs |
| [harness/base-results.txt](harness/base-results.txt) | base: 10/24 |
| [harness/disasm/](harness/disasm/) | oracle plugin excerpts |
| [harness/survey-ids.txt](harness/survey-ids.txt) | gate 6 corpus ids |
| [diagrams/data-flow.md](diagrams/data-flow.md) | `mode=hier`, from start to end |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1, T2 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  files, gates.
- Write `.agent-notes/issue-156.md` only for something novel, such as a harness
  whose inlining differs from the plugin, or a reduction width that the
  disassembly misreads.
- Comment on #156 with the outcome: the probe counts, the fixtures re-captured,
  and which ids moved.
- End the final message with the driver's status line.

## Summary (2026-11-16)

- **Tasks:** 2 of 2 done (T1, T2), by the orchestrator alone.
- **Result:** probes 24/24 EQUAL to native 16.1.1 (base 10/24). The head also
  equals native byte for byte on every `mode=hier` fixture input under
  `__fixtures__/{hier,dim,models}` (83 jobs).
- **Decisions:** 11 journal rows. For review:
  - Fixtures beyond the brief's list were re-captured: 12 `dim/hier-*` cases
    (xdot and dot) and 5 `models/hier-*` cases. They are 16.1.0 captures on
    this path; 8 of them went red once the port matched 16.1.1.
  - `c1554.xdot` was left as stored: 16.1.1 differs only in statement order.
  - The solver test is `conjgrad.dense.test.ts`, with native vectors in
    `__fixtures__/conjgrad-d.json`; `*.d.test.ts` does not typecheck.
  - `multDense.c` was removed from `__fixtures__/dim/smart-units.json`.
  - The brief's grep needs `-w` (`rightMultWithVectorFF` is a different kernel).
- **Gates:** typecheck 0; `npm test` 13690 passed, 18 expected fail;
  `gates.sh` 5/5; corpus + docs 2863 passed; smoke bytediff 1960 of 1960
  identical; survey `1554` identical, probes 24/24.
- **Known issues / follow-ups:** none. `1554` is quarantined in the corpus
  manifest, so `bytediff.ts` takes it only through `--file`.
