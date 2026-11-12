# Decisions: issue #142

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-11. Nobody confirmed these; each one names the rejected options and the
evidence so the maintainer can audit it.

### AD-1: reproduce on fdp.gv's first render, confirm on #142's render 3

- **Decision:** trace `tests/graphs/fdp.gv` (corpus `graphs-fdp`), one
  `dot -Kfdp` render. Check the outcome on #142's own case at the end: render 3 of
  `subg-fdp.cluster_k` root mode, with part 11's
  `plans/post-16-1-followups-11/harness/T7/port-vs-native.ts` against a native run
  with the noaddr plugin.
- **Rejected:** tracing #142's render 3 directly. Native varies on it from run to
  run (heap order: 10/4/2 classes over 16 runs, part 11 T7), it needs the
  `subg-after-free.c` driver, and it lays out a graph blown up to `1.8e5` points.
  Re-reading the issue as "trace only once it crosses print precision" and closing
  with no trace: the value already crosses xdot's `%.5g` print, and the queue rules
  require a stated mechanism for any discrepancy.
- **Evidence:** at `f544f206`, the port's `fdp.gv` xdot differs from native on one
  value only (backslash-newline wraps removed): clusterA `bb` x0, `1.5987e-14`
  port, `3.1974e-14` native. Stock native repeated 4 of 4 here; part 11 found 14 of
  16 stock and 16 of 16 noaddr runs give this class
  (`plans/post-16-1-followups-11/harness/T7/fdpgv-first-render.txt`), which also
  records the same cause as #142's case.

### AD-2: trace with an instrumented scratch build, by bisection

- **Decision:** rsync `~/git/graphviz` to `$TMPDIR`, apply part 10's
  `harness/T14/noaddr.patch` to `lib/fdpgen/layout.c`, add env-gated `%a` traces,
  and build only `gvplugin_neato_layout` (recipe in `native-oracle-libm`'s
  technique: `cmake --build <dir> --target gvplugin_neato_layout` with homebrew
  bison and flex). Add matching temporary traces in the port (never committed).
  Bisect: phase boundaries first (initial positions, each `tlayout` iteration,
  `xlayout`, the cluster bb in `layout.c`'s finalisation), then statements inside
  the first phase that differs. Check every suspected contraction with
  `otool -tv` on the oracle's own `libgvplugin_neato_layout.8.dylib`.
- **Rejected:** dumping positions only at the end (`GVTS_POS_DUMP`): that is how
  part 11 found the drift, and it cannot locate it. Editing `~/git/graphviz`: the
  queue rules forbid it.
- **Evidence:** the fdp fma work (`.agent-notes/fdp-fma-oracle-2026-06.md`) reached
  300 bit-exact iterations with this method. The C still has unmodelled libm
  calls the port computes with V8: `cos`/`sin`/`atan2` at `tlayout.c:474-476,
  501-502, 541-542` and `layout.c:568` (port `tlayout-init.ts:63-64,128-130,
  167-168`, `ports.ts:79`, `normalize.ts:85-98`). Contracted sites are modelled at
  `tlayout.ts:94-188`, `xlayout.ts:165-219`, `tlayout-init.ts:58-168`; sites in
  `layout.c` (cluster bb, offsets) have no fma in the port.

### AD-3: outcome rule

- **Decision:** classify the first divergence:
  - **(a) port defect:** the port computes the C expression differently in a way
    the port models elsewhere: a contraction shown by disassembly, a `hypot` not
    through `libmHypot`, an operation order, an unported branch. Fix it at the
    origin in `src/layout/fdp/`, TDD with a native-traced value, re-trace. At most
    three such fixes (README push-forward).
  - **(b) platform libm:** Apple `sin`, `cos`, `atan2` (or another non-`hypot`
    libm call) returns a different last bit from V8 on identical inputs, shown by a
    standalone C program that calls the libm function on the traced input. Record;
    no code change.
  - **(c) neither:** stop 3.
- **Rejected:** a macOS `sin`/`cos`/`atan2` model for outcome (b). The memory of
  the maintainer's ruling on #133 makes a new platform model wontfix unless last
  bits flip a layout decision and move geometry past 0.01. Here they move one
  printed value by `1.6e-14`.
- **Evidence:** `docs/known-divergences.md:921-937` accepts V8 against Apple
  `sin`/`cos` as a class, and A1 has an fdp class entry
  (`test/corpus/attribution-fdp.json`). The #189 brief applied the same rule to
  `exp`.

### AD-4: no ledger edit

- **Decision:** the mission changes nothing under `docs/` or `docs-site/`. The
  outcome lives in follow-ups item 156, both journals and
  `.agent-notes/issue-142.md`.
- **Rejected:** a per-id ledger bullet for `graphs-fdp`. It would need all 23
  locale pages re-translated for a value 1e-14 from native that every comparator
  passes; the ledger already states both classes that can cause it (A1 for fdp,
  the `sin`/`cos` class). If the trace contradicts the ledger, that is stop 6, not
  an edit.
- **Evidence:** `compareXdot` passes `fdp.gv` and #142's case (part 11 T7, T7b);
  the A1 iterative table counts `graphs-fdp` within ±0.5pt.

### AD-5: what an (a) fix must show

- **Decision:** after an (a) fix, the port's traced values equal native's up to the
  next divergence (or to the end), and clusterA's bb x0 on `fdp.gv` either equals
  native's text or keeps a difference traced to a later cause, which is classified
  again. Gate 5 then applies with the queue's two exceptions; gate 6 must show no
  input moving away from native.
- **Rejected:** accepting a fix because the one bb value matches. A last-bit change
  can match one printed value by chance; the trace is the evidence.
- **Evidence:** the #189 mission pinned its fix to a traced step for the same
  reason (`plans/issue-189-sgd-libm-hypot/decisions.md` AD-2).

## Baseline

Green on `f544f206` at planning: `npm run typecheck` (exit 0), `npm test` (571
files, 13486 tests), `bash test/golden/gates.sh` (5 passed, 0 failed),
`npx vitest run test/corpus test/docs` (24 files, 2844 tests),
`npm run docs:i18n-status` (0 stale). The project has no lint script. T1's native check: stock
`dot -Kfdp -Txdot tests/graphs/fdp.gv` under a plugin dir with core, dot_layout
and neato_layout prints the `a6e0163b` class 4 of 4.

## Rollback

Reversible: revert the commit. No data, API or dependency changes.

## Operational readiness (auto-confirmed)

A browser library, no service: no SLIs, alerts, dashboards, or on-call story. No API
or schema change. Outcome (a) moves fdp coordinates toward native by last bits;
outcome (b) changes no code.
