# T1: find where fdp first departs from native

## Context

On `tests/graphs/fdp.gv` the port's xdot differs from native's on one value only,
clusterA's `bb` x0 (`1.5987e-14` port, `3.1974e-14` native; see
[AD-1](../decisions.md#ad-1-reproduce-on-fdpgvs-first-render-confirm-on-142s-render-3)).
Node positions differ by up to `6.0e-12` inch (part 11 T7). The value near zero is a
cancellation, so the cause is upstream: a position, an offset or a bb term that
differs in its last bits. This task finds the first one.

## Plugin dirs

Stock oracle, for gate checks (`/tmp/ghl` has no neato_layout):

```
G=$TMPDIR/issue142-ghl; B=~/git/graphviz/build; mkdir -p $G
for p in core dot_layout neato_layout; do
  ln -sf $B/plugin/$p/libgvplugin_$p.8.dylib $B/plugin/$p/libgvplugin_$p.dylib \
    $B/plugin/$p/libgvplugin_$p.8.0.15.dylib $G/
done
GVBINDIR=$G $B/cmd/dot/dot -c
```

Instrumented: build per [AD-2](../decisions.md#ad-2-trace-with-an-instrumented-scratch-build-by-bisection)
into `$TMPDIR/issue142-gv/`, with core and dot_layout copied from the stock dir
(`plans/post-16-1-followups-11/harness/T7/build.sh` shows how to keep a fresh
neato plugin from writing through a symlink). Run `oraclePreflight` for `fdp`
against both dirs first. With traces off, the instrumented build must print the
same xdot as stock on `fdp.gv` (byte compare); otherwise the instrumentation
changed codegen (for example contraction): fix that before trusting a trace.

## Task

1. Commit nothing in `src/`. Put the trace patches and scripts under
   `plans/issue-142-fdp-bb-drift/harness/`: `trace-native.patch` (the C traces),
   `build-native.sh` (rsync, patch, build), `port-trace.patch` (the port's
   matching traces, applied only in a scratch copy or reverted before any commit),
   `firstdiff.mjs` (prints the first differing line of two trace files).
   Part 10's `harness/T14/firstdiff.mjs` may be reused.
2. Trace at phase boundaries with `%a` (hex float), one line per value, same
   labels on both sides: positions after initial placement; after each `tlayout`
   iteration; after `xlayout`; each cluster's bb and offset as `layout.c` computes
   them. Find the first differing line.
3. Inside the first differing phase, trace statement inputs and outputs until one
   statement has equal inputs and a different output. That statement is the
   origin.
4. Classify per [AD-3](../decisions.md#ad-3-outcome-rule):
   - Contraction: show the `fmadd`/`fmsub` (or its absence) in
     `otool -tv $B/plugin/neato_layout/libgvplugin_neato_layout.8.dylib` for that
     function, and that the port's `fma`/`fms` from `src/common/fma.ts` on the
     traced inputs gives native's value.
   - libm: a standalone C program (`cc -O0`, so nothing is folded) calling the
     function on the traced input prints native's value, and `node -e` with the V8
     call prints the port's.
5. Journal the diagnosis artifact in the mission journal: mechanism, origin in C
   and in the port (`file:line`), causal chain to clusterA's bb x0, what was ruled
   out with evidence, the class. Commit the harness as
   `test(T1): trace fdp.gv against an instrumented native fdp`.

## Write-set

- `plans/issue-142-fdp-bb-drift/harness/**`
- `plans/issue-142-fdp-bb-drift/decision-journal.md`
- Temporary: `$TMPDIR/issue142-*`; trace lines in `src/layout/fdp/*.ts`, reverted
  before the commit (`git diff --stat src/` must be empty when T1 commits).

## Read-set

- `~/git/graphviz/lib/fdpgen/{layout.c,tlayout.c,xlayout.c}`
- `src/layout/fdp/{layout.ts,tlayout.ts,tlayout-init.ts,xlayout.ts,ports.ts,normalize.ts,comp.ts}`
- `src/common/fma.ts`, `src/common/libm-hypot.ts`
- `.agent-notes/fdp-fma-oracle-2026-06.md`, `.agent-notes/fdp-graph-bb-short.md`
- `plans/post-16-1-followups-11/harness/T7/{build.sh,fdpgv-first-render.txt}`
- `plans/post-16-1-followups-10/harness/T14/{noaddr.patch,firstdiff.mjs}`
- `docs/known-divergences.md:921-937` (the `sin`/`cos` class)

## Interface contracts

Output to T2, in the mission journal: `class` (`a`, `b` or `c`), the C
`file:line`, the port `file:line`, and the traced inputs and both outputs as `%a`.

## Acceptance criteria

- Given the instrumented build with traces off, when it renders `fdp.gv` to xdot,
  then the bytes equal the stock oracle's.
- Given both traces, when `firstdiff.mjs` runs, then it names one labelled line,
  and every line before it is equal.
- Given the origin statement, when its traced inputs are fed to the class's
  check (disassembly and `fma`, or the standalone libm program), then that check
  reproduces native's output and the port's output.
- Given the T1 commit, when `git diff --stat f544f206.. -- src/` runs, then it is
  empty.

## Observability

N/A: the traces are temporary and env-gated.

## Rollback

Reversible: the harness is files under the brief directory.
