# Architecture decisions (locked; approved by the user 2026-10-16)

| AD | Decision |
|---|---|
| AD-1 | Commits are made unsigned, on the local mission branch only; the user re-signs them all at the end |
| AD-2 | One branch, one commit per task, one PR, merged with a merge commit |
| AD-3 | Diagnosis items: fix with a full write-up, or park after about 2 h |
| AD-4 | The circo FMA patch lands only with a gain and a libm forcing proof for 1855 |
| AD-5 | pathplan `prerror` warnings print the message text only |
| AD-6 | `PointSet` compares exact doubles, as C does |

## AD-1: signing under autonomy

- **Context:** every dot-engine commit must be SSH-signed with the user's YubiKey (PIN +
  touch). An autonomous executor cannot sign.
- **Decision:**
  - The executor commits with `git -c commit.gpgsign=false commit -F <msg>`, on
    `chore/post-16-1-followups` only.
  - At T14 it stops. The user runs
    `git rebase --exec 'git commit --amend --no-edit -S' main` (one touch per commit).
  - Before any push, `git log --show-signature main..` must show a good signature on
    every commit.
  - This is an explicit, user-approved exception to "never `--no-gpg-sign`", scoped to
    local mission commits. Nothing unsigned is ever pushed.
- **Consequences:** SHAs change at the re-sign, so the journal cites task IDs and T14
  adds one row mapping each task ID to its signed SHA.

## AD-2: branch and PR shape

- **Context:** the repo allows merge commits only (rebase and squash have been off since
  #92), so branch SHAs survive the merge.
- **Decision:** branch `chore/post-16-1-followups`, one commit per task, one PR, merged
  with a merge commit. The PR is opened only after the re-sign.
- **Consequences:** the PR can be reviewed commit by commit. Generated data dominates
  the diff size.

## AD-3: diagnosis items (T12, T13)

- **Context:** items 7 and 9 have no known mechanism yet. fdp 2471's native layout is
  nondeterministic.
- **Decision:**
  - A fix lands only with mechanism, origin, causal chain and ruled-out evidence, plus a
    sweep with 0 regressions.
  - "Irreducible" requires a controlled experiment, such as injecting the oracle's
    values.
  - After about 2 h of investigation without a write-up, park the item: the journal row
    records what was ruled out and what to instrument next, the README keeps the item
    open, and the mission continues.
- **Consequences:** a hard item cannot stall the whole mission. A parked item is a
  valid outcome, and its entry must say so plainly.

## AD-4: circo FMA patch and graph 1855

- **Context:** `plans/graphviz-16.1-sync/followups/circpos-fma-assoc.patch` matches C's
  fused-multiply-add contraction but flips 1855, attributed to libm `sin`/`cos`
  amplification.
- **Decision:** land the patch only if both hold:
  1. it improves at least one verdict or measurably reduces diffs;
  2. a forcing experiment proves 1855's flip is libm-only: feed 1855 the native build's
     `sin`/`cos` results, and it matches.

  1855 is then accepted as a libm-class divergence (registry entry, `known-divergences.md`
  and its 23 locale copies with `sourceHash` re-stamped). Otherwise the patch stays
  parked, with the diagnosis recorded. Porting bit-exact libm `sin`/`cos` is a
  stop-and-ask.
- **Consequences:** C-faithful arithmetic lands only when it buys something measurable.

## AD-5: `prerror` message format

- **Context:** C prints `lib/pathplan/<__FILE__>:<line>: <msg>`. `__FILE__` depends on
  where the binary was built (the WASM build prints `lib/pathplan//home/runner/…`).
- **Decision:** `console.warn('<msg>')` with C's exact message text and no prefix,
  matching the port's existing `triangulation failed`.
- **Consequences:** stderr comparisons match on the message suffix.

## AD-6: `PointSet` key semantics

- **Context:** `poly-pack.ts` keys cells on `cround(x),cround(y)`; C's `pointset.c`
  compares raw doubles.
- **Decision:** use the shared `PointSet` (`src/common/pointset.ts`) with exact doubles
  at every site.
  - If any output changes, the task becomes a fidelity change: 0-regression survey, and
    every changed id must move toward the oracle.
  - Speed is measured before and after on a quiet machine.
- **Consequences:** a port-only rounding is removed. The commit type (`perf` or `fix`)
  follows whether any output changed.
