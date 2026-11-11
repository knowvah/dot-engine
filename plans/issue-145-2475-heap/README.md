# Mission: issue #145: find why the port's heap runs out on `2475_1`, and reduce it

## Objective

The dot survey scores `2475_1` (`~/git/graphviz/tests/2475_1.dot`) `errored`: the port's
render worker dies at V8's default heap limit (4,192 MB on this host, measured at
planning) with `<--- Last few GCs --->`. The input is 5,711 independent clusters with no
edges between them (150k nodes, 152k edges, `rankdir=BT`). Native 16.1.0 finishes in
1,412 s with an **8.41 GB peak RSS** (maintainer comment, 2026-11-10), so even a port with
zero overhead cannot finish under the default heap.

The maintainer's scope (issue comment, 2026-11-10) is a **diagnosis**: find out why the
port's heap grows, and reduce that growth. Their prefix table at `35f98bb0`:

| clusters (lines) | native s | native peak RSS | port s | port peak RSS |
|---|---|---|---|---|
| 400 (15k) | 0.81 | 89 MB | 6.1 | 451 MB |
| 800 (34k) | 5.3 | 254 MB | 29 | 907 MB |
| 1600 (79k) | 36 | 831 MB | 175 | 2.44 GB |

Native itself grows faster than the input (3.3x RSS for 2.3x input from c800 to c1600).
The port carries about 3x on top. **Lead:** at the end of the c800 render the live heap
drops from 531 MB to 216 MB in one GC, so about 300 MB is built within one phase and freed
at once.

**Work (see [decisions.md](decisions.md)):**

1. **T1:** measure live heap per phase, port and native, on c400, c800 and c1600 (AD-1).
2. **T2:** take a heap snapshot at the peak phase, map each large structure to the C
   structure it ports, classify the growth, and write the diagnosis artifact (AD-2, AD-3).
3. **T3 (conditional):** fix each port artifact at its origin; in either outcome, remove
   port-side constant overhead that can go without changing output (AD-4, AD-5).
4. **T4:** give the survey a per-id heap cap for `2475_1`, sized from native's 8.41 GB
   peak (AD-6).
5. **T5:** render the full `2475_1` once under that cap and compare it with native; write
   the `docs/known-divergences.md` entry when the growth is C-faithful (AD-7); gates;
   squash.

**Done when (the issue's two outcomes):**

- **Port artifact:** fixed at the origin, C-faithful; peak heap on c800 and c1600 drops
  measurably; the full `2475_1` renders within the survey's cap and compares with native;
  all gates pass.
- **C-faithful growth:** the structure is documented in `docs/known-divergences.md` with
  native and port numbers; the survey's cap for this id is sized from native's peak; the
  port-side constant overhead that can go without changing behaviour is removed.

**Boundaries (maintainer's, binding):** no algorithm simplification or restructuring to
save memory; keep C function boundaries and side-effect order. Representation changes (for
example typed arrays in place of object arrays) only where output stays byte-identical. No
unconditional raising of `--max-old-space-size`. Temporary markers come out before commit.
If the cause is the C's own growth, stop after documenting and sizing the cap.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read the queue rules (`.claude/queue-policy.md`, injected into the session). They
   override this brief where the two disagree.
3. Read this README, [decisions.md](decisions.md), [decision-journal.md](decision-journal.md),
   then the batch overviews. Check progress with `git log --oneline 59a5b3ee..`.
4. Read `.agent-notes/oracle-error-port-robustness.md`,
   `.agent-notes/survey-oracle-cap-overrun.md` and `.agent-notes/issue-129.md` (`.mts`
   temp scripts under `$TMPDIR`).

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, and never merge `main` into it.
- **Base sha:** `59a5b3ee4a103359ada5d35df85435917cc78081` (the tip at planning). If the
  tip has moved, use the tip at execution start as the base and journal it.
- Per-task commits: first `docs(mission): add issue-145 brief` (this directory), then
  `docs(T1): ...`, `docs(T2): ...`, `perf(T3a): ...` (one per change), `test(T4): ...`,
  `docs(T5): ...`. Commit with `git -c commit.gpgsign=false commit -F <msgfile>`.
- **Finish (T5's last step):** `git tag issue-145/pre-squash`, then
  `git reset --soft <base>` and one commit. Templates are in
  [T5](batch-3/T5-verify-document-squash.md#squash). Footer `Refs: #145`. Lines ≤ 80,
  subject ≤ 72, no attribution. Never push, rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 ratchet: no `src/` file grows past its cap) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | only when `src/` changed; see [T5](batch-3/T5-verify-document-squash.md#bytediff) | no changed output (T3 is representation-only) |
| 6 | Targeted survey | see [T5](batch-3/T5-verify-document-squash.md#targeted-survey) | prefix outputs byte-identical base vs head; full `2475_1` compared |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot` (16.1.0),
`GVBINDIR=/tmp/ghl`. Run `oraclePreflight` (`test/corpus/oracle-env.ts`) for `dot` before
trusting native output; a missing `config8` is fixed with `GVBINDIR=/tmp/ghl <dot> -c`.

**Load and memory.** Check `uptime` before every run longer than a minute (c1600, the
instrumented native, the full render) and wait while the load is above 12. Before the full
render also check free memory (`vm_stat`, `memory_pressure`): the host has 96 GB, and the
render may take tens of GB. Never run two heavy renders at once.

Baseline at planning: typecheck and `npm test` green on `59a5b3ee`
([decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside a task's write-set needs a change. T3's write-set is bounded, not
   listed: see [T3](batch-2/T3-reduce-heap.md#write-set).
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a stated
   mechanism, journal it, and stop.
3. A T3 change alters any output: a prefix output differs base vs head, or the smoke
   bytediff shows a change. Revert that change; if no byte-identical form exists, stop.
4. T2 cannot produce the diagnosis artifact (mechanism, origin `file:line`, causal chain,
   ruled out). Journal what is ruled out and what to instrument next, and stop: no change
   to `src/` without a stated mechanism.
5. The only fix for a port artifact changes an algorithm, its order of side effects, or a
   C function boundary. Journal the mechanism and stop with the question.
6. The heap cap that AD-6 computes exceeds 48 GB, the full render fails twice under the
   cap, or comparing the two full SVGs needs more than 3.5 GB of heap in the survey's
   parent process (AD-6). Stop with the question.
7. An architecture decision in [decisions.md](decisions.md) turns out to be wrong.

**Not a stop:** the full `2475_1` renders but diverges from native. That id has never been
compared. File a `needs-ruling` issue for the divergence with the first diff path and
finish the rest (queue rules, "a question that blocks only part").

## Push-forward (decide alone, journal it)

- Where the temporary markers sit inside a phase, and the snapshot prefix (c400 or c800)
  when the snapshot file is too large to parse (AD-2).
- How the heap summarizer is written (streaming or not), within `plans/.../harness/`.
- Dropping a T3 candidate whose saving on c800 is under 3% of peak live heap.
- Names of `survey.ts` helpers and their tests.
- Wording of the known-divergences entry and its section number.
- Filing a `follow-up` issue for any other defect found on the way.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-7, auto-confirmed record, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | T1, T2: measure and diagnose |
| [batch-1/T1-phase-heap.md](batch-1/T1-phase-heap.md) | per-phase live heap, port and native |
| [batch-1/T2-attribute.md](batch-1/T2-attribute.md) | snapshot, C mapping, diagnosis artifact |
| [batch-2/overview.md](batch-2/overview.md) | T3 |
| [batch-2/T3-reduce-heap.md](batch-2/T3-reduce-heap.md) | fixes / overhead removal |
| [batch-3/overview.md](batch-3/overview.md) | T4, T5 |
| [batch-3/T4-survey-heap-cap.md](batch-3/T4-survey-heap-cap.md) | per-id heap cap |
| [batch-3/T5-verify-document-squash.md](batch-3/T5-verify-document-squash.md) | full render, docs, gates, squash |
| [diagrams/data-flow.md](diagrams/data-flow.md) | measurement and survey flow |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [harness/prefix.sh](harness/prefix.sh) | cluster-prefix generator |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1, T2 | [x] |
| 2: T3 | [x] |
| 3: T4, T5 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): the outcome (port
  artifact, C-faithful or mixed), the mechanism, the numbers, the files, the gates.
- Write `.agent-notes/issue-145.md` for anything novel: candidates are the heap-snapshot
  technique at this size, the instrumented-native live-bytes probe, and the per-phase
  numbers.
- End the final message with the driver's status line.

## Summary (2026-11-10)

- **Tasks:** 5 of 5 (T1, T2, T3a, T3b, T4, T5). T3 ran two of its three allowed changes.
- **Outcome:** mixed. The growth is C's (`separate_subclust`, one aux edge per pair of sibling
  clusters); the port's 2.4x constant held a port artifact (an attribute `Map` per aux edge) and
  removable representation overhead (two `Port` objects per aux edge). Both are gone; an aux edge
  costs 458 B against native's 423 B.
- **Result:** the full `2475_1` renders in about 4,200 s (two runs, 9.70 and 10.15 GB peak) and is
  `conformant`; the survey caps its heap at 13,312 MB.
- **Decisions:** in [decision-journal.md](decision-journal.md). For review: the 23 locale
  translations of A14 (written in-session, not reviewed by a native speaker); the units correction
  (the T3a/T3b commit bodies under the pre-squash tag give MiB where the base is in MB).
- **Gates:** 1-6 pass (journal, "Gates (final tree)").
- **Follow-up:** #204 (`ND_par` keeps the x-pass aux edges alive after `removeAuxEdges`).
