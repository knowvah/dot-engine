# Decisions: issue #170

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-11. No issue was labelled `queue:planned`. #170 was the lowest-numbered
open `queue:ready` issue, and it has no "Blocked by" references. Nobody confirmed
the decisions below. Each one names the options it rejected and the evidence, so
the maintainer can audit it.

### AD-1: diagnose first, as its own task; no `src/` change in T1

- **Decision:** T1 traces native and the port at the same points and writes the
  diagnosis artifact to the journal. It changes no file under `src/`. T2 writes
  the red tests and the fix at the origin T1 names.
- **Rejected:** one task that diagnoses and fixes. The issue names no mechanism,
  and the queue rules say a fix without one is a halt. A separate T1 commit gives
  the artifact a checkpoint that survives a halt in T2.
- **Rejected:** planning a candidate fix now. At planning, the C and the port were
  compared for every function on the flat-reorder path, and they match (README,
  "Why reading the code was not enough"). Any candidate would be a guess.
- **Evidence:** `harness/native/*.trajectory` against `harness/trajectory.mts`:
  native 4 crossings, port 2, at the first aux line on all four probes.

### AD-2: native traces come from a rebuilt `gvplugin_dot_layout` in `$TMPDIR`

- **Decision:** use the #130/#131 recipe (T1 spells it out). rsync
  `~/git/graphviz` to `$TMPDIR`, add env-gated `fprintf` traces in
  `lib/dotgen/mincross.c`, build only `gvplugin_dot_layout`, and swap it into a
  `$TMPDIR` plugin dir beside `/tmp/ghl`'s core plugin. Every trace point is in
  `lib/dotgen`, so no libgvc rebuild is needed.
- **Rejected:** `dot -v` alone. It gives crossing counts, not orders.
- **Rejected:** lldb on the oracle. The oracle is a release build, and a
  `fprintf` matches the port trace line for line.
- **Evidence:** `.agent-notes/issue-131.md` ("trace libgvc behaviour from the
  dotgen call site"). Queue rules: native graphviz is read-only, so instrumented
  copies go in `$TMPDIR`.

### AD-3: `node-default-out.gv` is a fourth required probe

- **Decision:** T2's tests pin native for all four probes. `node-default-out.gv`
  is #169's `aux-flat-adj.gv`, `node [ordering=out]`. Its first-count split is
  the same as the other three (native 4, port 2). Since #169, the port adds the
  same FLATORDER edges for it.
- **Rejected:** only the issue's three inputs. #169's summary hands this row to
  #170, and it follows the same path.
- **Fallback:** if T1 shows that the fourth probe takes a different mechanism,
  drop it from the tests, open a `follow-up` issue, and journal it. Do not stop.

### AD-4: the fix goes at the origin, even in a shared primitive

- **Decision:** T2 changes the ported counterpart of the C statement T1 names, in
  the file that holds it, within T2's write-set. The likely origins
  (`fastgr.ts`, `mincross-utils.ts`, `mincross-build.ts`) are shared by
  main-graph layouts, so gates 5 and 6 decide whether the change is safe. No
  aux-only guard or flag.
- **Rejected:** a guard that applies the fix only inside the aux layout. The C has
  no such guard, and CLAUDE.md says to port every branch as it is, with no new
  options.
- **Evidence:** the queue rules' gate 5 and its two exceptions. `rules/diagnosis.md`,
  "Scope of change".

### AD-5: tests render through the public API and pin native's text

- **Decision:** T2 adds `src/layout/dot/flat-adj-ordering.test.ts`. For each of
  the four probes it renders `-Tplain` through `render()`, and compares with
  native text copied from `harness/native/*.plain`, after the format's
  normalisation, as the existing `flat-adj-*.test.ts` files do. If T1 names a
  unit-level value (an order, a flag), add a unit test for it in the origin's
  existing test file.
- **Rejected:** a mock that snapshots the aux graph (#130's AD-4). The issue's
  done criterion is output equality, and `-Tplain` pins the label order directly.
- **Evidence:** `flat-adj-source-subgraph.test.ts` and `ordering.test.ts`
  already render probes and compare with native output.

## Size constraint

`splines-flat.ts` has 561 lines at the base. The complexity hook blocks any edit
that leaves a file over 500 lines longer than it is at HEAD. If T2 must edit it,
keep its line count at or below 561 (see #130's AD-3 for how it was done before).
The other candidate files are under 500 lines.

## Baseline

On `6676b85c`, 2026-11-11, during planning: `npm run typecheck` exit 0;
`npm test` exit 0, 571 files, 13496 tests passed. `package.json` has no lint
script, so typecheck is the static gate. The working tree was clean apart from
this brief. Oracle preflight passed (16.1.0, `/tmp/ghl`).

## Rollback

Reversible: revert the one commit. No data, API or format change. The expected
output change is limited to inputs that take the changed statement, and gates 5
and 6 bound it.
