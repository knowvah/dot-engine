# T5: full render, cap value, documentation, gates, squash

## Context

[decisions.md](../decisions.md) AD-6, AD-7. The cached native SVG is
`~/.cache/dot-engine/oracle/oracle/c2e610dcc867/2475_1.svg` (101,313,598 bytes). Before
using it, confirm `c2e610dcc867` is the survey's current `ORACLE_SIG`
(`test/corpus/survey.ts:57`); if not, re-render native once (about 24 min, 8.4 GB) when
the load allows.

## Steps

1. **Full render.** Trial cap `1.5 x R x 8,410 MB` (R from T3, or from T1 if T3 did not
   run), at most 48 GB. Check load and free memory, then run detached (the Bash background
   limit is 2 h; the render may take 3 h or more):
   `nohup env NODE_OPTIONS=--max-old-space-size=<trial> /usr/bin/time -l node_modules/.bin/tsx test/corpus/render-one.ts ~/git/graphviz/tests/2475_1.dot dot > $TMPDIR/issue-145/2475_1.port.svg 2> $TMPDIR/issue-145/2475_1.port.log &`
   and wait with a Monitor on the process. Record wall time and peak RSS. An OOM: raise
   the trial cap once by 1.5x (journal it); a second failure is stop condition 6.
2. **Compare.** A `.mts` script under `$TMPDIR` that reads both SVGs and calls
   `diffVerdict` (`survey.ts:469`), run under `/usr/bin/time -l` with
   `--max-old-space-size=4192` (the survey parent's default). Record the verdict and the
   comparator's peak RSS. Out of heap there, or a peak over 3.5 GB: stop condition 6.
   `diverged`: file a `needs-ruling` issue (first diff path, `maxDelta`) and continue.
3. **Cap value.** `k = full peak RSS / 8,410 MB`; set `PORT_HEAP_MB['2475_1']` to
   `ceil(1.25 x k x 8,410)` rounded up to a whole GB (in MB). Update the comment with k and
   the measured port time and peak. Re-run T4's tests.
4. **Documentation** (AD-7). For `c-faithful` or `mixed`: add the section after A13 in
   `docs/known-divergences.md` with what happens (the structure and its C counterpart, with
   `file:line`), why it is accepted (C's own growth, plus a constant representation
   factor), and a table: native vs port peak RSS and time on c400, c800, c1600 and full,
   base and head. Link the issue. For `port-artifact`: no section.
5. **Gates 1-6** (README table; record each).
6. **Squash** (below), then session end per the README.

## Bytediff

Only when `src/` changed. Build bundles of the base and the head (`npm run build:js`, copy
`dist/index.js` to `$TMPDIR/issue-145/{base,head}.mjs`; build the base from a
`git worktree add` of the base sha under `$TMPDIR`, removed afterwards). Run
`npx tsx test/tools/bytediff.ts <base>.mjs <head>.mjs ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt <out>.json`.
Expect no changed output; any change is stop condition 3.

## Targeted survey

**How the ids were chosen:** T3 changes are representation-only on the dot path, and the
prefixes of `2475_1` exercise exactly the code path T2 found. So the survey is: c100-c800
port SVGs byte-identical base vs head (T3's check, repeated at the final head); c100 and
c200 port SVGs compared with native via `diffVerdict` (they matched native in size at
`35f98bb0`); and the full `2475_1` from step 2. When a T3 change sits in code shared beyond
clusters (for example `src/model/` or `src/common/`), add the dot corpus ids that the smoke
list already covers for that file, and name them in the journal.

## Squash

`git tag issue-145/pre-squash`, `git reset --soft <base>`, one commit. Pick the template
for the outcome; fill the bracketed parts; add a gates line as #139's commit does.

```
perf(dot): <the structure> no longer outgrows the heap on 2475_1

<Mechanism in two or three sentences: what the port built that C does
not, at which file:line, and what replaced it.> Output is byte-identical.
Peak RSS on the c1600 prefix fell from <a> to <b>; the full 2475_1
renders in <t> at <p> peak (native 1,412 s, 8.41 GB) and is <verdict>.
The survey caps that id's heap at <cap> MB, sized from native's peak.

Refs: #145
```

```
docs(dot): document 2475_1's heap growth and cap its survey heap

<Mechanism: the structure, its C counterpart at file:line, and why
both grow faster than the input.> The port adds a constant <k>x on top
<and removes <what> without changing output>. The survey caps
2475_1's heap at <cap> MB, sized from native's 8.41 GB peak; with it
the id renders in <t> and is <verdict>.

Refs: #145
```

## Write-set

`test/corpus/survey.ts` (cap value and comment), `docs/known-divergences.md`,
`test/docs/**` and `test/corpus/known-divergences-examples.test.ts` only if they pin
something the new section moves (journal it), `plans/issue-145-2475-heap/**`,
`plans/decision-journal.md`, `.agent-notes/issue-145.md`.

## Acceptance criteria

- Given the cap, when the full `2475_1` renders under it, then it exits 0 with a
  well-formed SVG and its peak RSS is recorded.
- Given the two full SVGs, when `diffVerdict` runs under a 4,192 MB heap, then it returns
  a verdict, and the verdict is in the journal.
- Given outcome `c-faithful` or `mixed`, when `docs/known-divergences.md` is read, then it
  has the new section with native and port numbers.
- Given the squash, when `git log 59a5b3ee..` runs, then it shows one commit with footer
  `Refs: #145`, and the tag `issue-145/pre-squash` points at the last task commit.

## Observability / rollback

Observability: N/A. Rollback: reversible; revert the squash commit.
