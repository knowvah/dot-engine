# Mission: issue #157: fdp always adds ctr in fdp_tLayout

## Objective

Graphviz 16.1.1 (upstream `3135d895a`) removes the `ctr.x != 0.0 || ctr.y != 0.0`
guard in `fdp_tLayout`, so the loop that adds the pinned-node centre `ctr` back
to every node always runs (`~/git/graphviz-16.1.1/lib/fdpgen/tlayout.c:593-596`).
The port's `fdpTLayout` (`src/layout/fdp/tlayout.ts:311`) still has the guard.
The two differ only in the sign of a zero: a coordinate that is `-0` while that
axis's `ctr` is `+0` stays `-0` in the port and becomes `+0` in 16.1.1.

Done means:

- `fdpTLayout` adds `ctr` to every node, with no guard
  ([AD-1](decisions.md#ad-1-drop-the-guard-exactly-as-upstream-did)).
- A new test block in `src/layout/fdp/fdp.test.ts` fails on the base and passes
  on the head
  ([AD-2](decisions.md#ad-2-the-test-drives-fdptlayout-on-a-derived-component)).
- Every gate is green. The smoke bytediff and the targeted survey are identical
  on every job.

Type `fix`, a patch release.

**Out of scope:**

- The other 16.1.1 fdpgen commits. This issue is `3135d895a` only.
- #148's corpus inputs, and #209 (fdp's clustered A1 drift).
- `docs/known-divergences.md` and the corpus records
  ([AD-3](decisions.md#ad-3-no-corpus-record-or-ledger-edit)).

## Evidence (measured at planning, base `760f7cc1`)

- **The port keeps `-0`.** A scratch script ran `fdpTLayout` on the derived
  component of [harness/pinned-neg-zero.gv](harness/pinned-neg-zero.gv) (see
  AD-2). After the call, `b.pos` is `[-0, 0]` (`Object.is(-0)` true). `a` and `c`
  are unchanged.
- **Output cannot show it.** Native 16.1.1 `-Kfdp -Tplain` on the probe puts
  `b` at `1.005 1.005`, translated off the origin. `-Gnotranslate=true` gives
  the same output. The 16.1.0 bisect plugin dir `/tmp/ghl` has no fdp, so no
  16.1.0 render was taken.
- **Reach detector:** [harness/detector.sh](harness/detector.sh) runs a base
  copy patched with [harness/detector.patch](harness/detector.patch). The patch
  prints `P157HIT` for any node whose bits differ between the guarded add and
  the unguarded one. It fires on the probe (`P157HIT b true false`). Over the
  982 applicable corpus ids (`-Kfdp -Tplain`, 20 s cap, 3 lanes):
  no hit. 960 ids finished and 22 hit the cap (`tree-share-examples-world`,
  `1652`, `1864`, `2064`, `2095_1`, `2108`, `2222`, `2343`, `2371`, `2471`,
  `2475_1`, `2593`, `2621`, `2646`, `2834`, `graphs-b100`, `graphs-b103`,
  `graphs-b104`, `graphs-badvoro`, `graphs-root`, `linux.x86-root_twopi`,
  `nshare-root_twopi`). None of the capped ids is a smoke or survey id. Per-id
  status: [harness/detector-status.txt](harness/detector-status.txt).
- **The issue's comment:** no corpus id, format walk, engine walk, attribution
  row or golden changed verdict at 16.1.1 because of this change (#147's
  classification).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 760f7cc1..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `760f7cc1` (`git rev-parse 760f7cc1` for the full sha; tip at
  planning). If the tip moved, use the tip at execution start as the base and
  journal it.
- Per-task commits while working: first `docs(mission): add issue-157 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-157/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(fdp): always add ctr back in fdp_tlayout

  Graphviz 16.1.1 drops fdp_tLayout's ctr != 0 guard and adds the
  pinned-node centre to every node unconditionally (upstream
  3135d895a). The only difference is a -0 coordinate becoming +0 when
  ctr is zero; no output format shows it, since fdp translates the
  drawing afterwards. Port it and pin the sign at the layout state.

  Refs: #157
  ```

  Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR,
  or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0; 13690 + the new tests passed, 18 expected fail |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0, 2863 passed |
| 5 | Smoke bytediff | see [T1](batch-1/T1-fdp-ctr-always-add.md#bytediff) | identical on every job |
| 6 | Targeted survey | see [T1](batch-1/T1-fdp-ctr-always-add.md#targeted-survey) | identical on every job |

The oracle is graphviz 16.1.1 (ADR-0002): `~/git/graphviz-16.1.1/build/cmd/dot/dot`,
with `/tmp/ghl1611-all` for fdp. Gates 5 and 6 compare port with port, so no
native output is trusted. If a job changes, run `oraclePreflight`
(`test/corpus/oracle-env.ts`) for `fdp` before you compare it with native. If
`config8` is missing, run `GVBINDIR=/tmp/ghl1611-all <dot> -c`. Check `uptime`
before gates 5 and 6, and wait if the load is above 12.

The baseline was green at planning: see [decisions.md](decisions.md#baseline).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a
   stated mechanism, journal it, and stop.
3. Case 1 of the new test passes on the base. At planning the base kept `-0`.
   Find out why before you change the test: has the `deriveGraph` path stopped
   carrying the pinned `-0`?
4. Gate 5 or 6 shows any changed output. No corpus id reached the changed case
   at planning. A change means an unexpected path: diagnose it with the
   detector, and halt per the queue rules unless it equals native.
5. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- The test names, and where the new describe block sits in `fdp.test.ts`.
- Whether case 2 also checks the free node's pos is finite. It must not pin
  that node's value, which depends on `drand48`.
- The doc comment's exact wording.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-3, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-fdp-ctr-always-add.md](batch-1/T1-fdp-ctr-always-add.md) | the task |
| [harness/pinned-neg-zero.gv](harness/pinned-neg-zero.gv) | the probe: a pinned `-0` with `ctr = (0, 0)` |
| [harness/detector.sh](harness/detector.sh) | reach check: `P157HIT` lines per id |
| [harness/detector.patch](harness/detector.patch) | the base-copy instrumentation it needs |
| [harness/detector-status.txt](harness/detector-status.txt) | planning run: rc and hits per id |
| [harness/survey-ids.txt](harness/survey-ids.txt) | gate 6 ids |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where ctr is added back |
| [diagrams/component-map.md](diagrams/component-map.md) | the touched component |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (the project journal): mechanism,
  files, gates.
- Write `.agent-notes/issue-157.md` only for something novel. Otherwise, say in
  the journal row that nothing was novel.
- Comment on #157 with the outcome: no corpus id reaches the change, and the
  unit test pins it.
- The final message ends with the driver's status line.

## Summary (2026-11-16)

- **Tasks:** 1 of 1 (T1).
- **Decisions:** AD-1 to AD-3 held as planned. Journalled push-forwards: the
  test names and their place after `findCComp`; case 2 checks the free node's
  pos is finite. None flagged for review.
- **Gates:** typecheck 0; `npm test` 580 files, 13692 passed, 18 expected
  fail; `gates.sh` 5/5; corpus + docs 2863 passed; smoke bytediff 1960/1960
  identical; survey 60/60 identical; the probe 5/5 identical base to head,
  and equal to native 16.1.1 in plain and xdot.
- **Known gaps:** the 22 ids that hit the planning detector's 20 s cap were not
  checked for reach (none is a smoke or survey id). The Evidence line's
  `1.005 1.005` for `b` is `1.375 1.25` on native 16.1.1; the conclusion is
  the same.
- **Stop summary:** done, no halt.
