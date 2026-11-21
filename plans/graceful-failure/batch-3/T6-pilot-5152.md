<!-- SPDX-License-Identifier: EPL-2.0 -->
# T6: Pilot. Patch 0001 = graphviz!5152; #266 becomes U1

## Context

graphviz!5152 (upstream issue graphviz#2876, dot-engine #266) fixes a
use-after-free in `canon` (`lib/common/output.c`). In `-Tplain` output,
native prints freed memory as an unquoted label made of built text. The port
prints the correct text. Today this is forgiven by **64 entries** in
`test/corpus/accepted-divergences-plain.json` whose reason begins
"oracle bug (A4): canon() use-after-free". The fork branch
`plain-canon-use-after-free` in `/Users/scottseely/git/sseely/graphviz`
holds the MR commits: `f9d1cc145` (test) and `c5960b0b7` (fix), both based
on upstream `main`. The startup gate has confirmed the MR is merged (D8).

## Task

1. `git -C /Users/scottseely/git/sseely/graphviz fetch upstream`. Find
   5152's merged commits on `upstream/main`; they may differ from the
   branch after review. Record their shas.
2. Create branch `carried/plain-canon-use-after-free` at tag `16.1.1` in a
   worktree under `/Users/scottseely/git/sseely/graphviz-wt/`.
   Cherry-pick the merged fix with `-x`, and the test too if it applies;
   the test is optional for the oracle.
   - A context-only conflict may be fixed by hand. Journal the hunk.
   - A conflict that needs a **logic** change is **stop 6**.
3. Export the patch with `git format-patch --start-number 1 -o test/corpus/oracle-patches 16.1.1..carried/plain-canon-use-after-free`.
   Add its manifest entry: `upstreamMr: 5152`, `upstreamIssue: 2876`,
   `status: 'merged'`, `dotEngineIssue: 266`.
4. Push the branch to the fork: `git -C <worktree> push origin carried/plain-canon-use-after-free`.
5. Rebuild the carried oracle (`bash test/corpus/build-carried-oracle.sh`).
   Check that #266's repro
   `digraph { ab [label="\Nx"]; cd [label="q-r"]; ef [label=zz] }`
   under `-Tplain` prints `abx` on the carried build and an empty field on
   pristine.
6. Re-run the plain walk (`test/corpus/plain-walk.ts`, all 8 engines,
   fresh, so delete the plain JSONL first) against the carried oracle.
   - Every id in the 64 entries must now compare clean on the label field.
     Remove each entry whose graph is now conformant.
   - If an entry still diverges for another reason, keep it, rewrite its
     reason to name that other cause, and journal it.
   - `registry-staleness.test.ts` and `accepted-divergences.test.ts` must
     pass.
7. `docs/known-divergences.md`:
   - add `## Upstream fixes carried (U-series) {#u-series}` before
     "Pending 16.1.1 ports", with a table of columns `U#`, Fix, Upstream
     (MR/issue), Patch, Status and Drop when;
   - add a U1 row: canon use-after-free, !5152 / #2876, `0001-…patch`,
     merged, "at the next pin move";
   - add a short paragraph linking ADR-0003;
   - in the intro, the three-class list gains a fourth bullet for the
     U-series.
8. Comment on GitHub #266 with the result (patch path, retired-entry count)
   and close it.

## Write-set

`test/corpus/oracle-patches/0001-*.patch`, `test/corpus/oracle-patches/manifest.json`,
`test/corpus/accepted-divergences-plain.json`, `test/corpus/plain-parity-*.json`,
`test/corpus/plain-parity-*.jsonl`, `test/corpus/PARITY-*-plain.md`,
`docs/known-divergences.md`.
Fork: `carried/plain-canon-use-after-free` only.

## Read-set

- `test/corpus/oracle-patches/README.md`
- `test/corpus/build-carried-oracle.sh` (usage only)
- `test/corpus/plain-walk.ts:1-60` (usage)
- `docs/known-divergences.md:1-48` and lines 1239-1300
- `gh issue view 266`

## Acceptance criteria

- Given 5152's merged commits, when backported onto 16.1.1, then the
  patch's logic is identical to the merged diff, and any context fixup is
  journaled.
- Given the rebuilt carried oracle and #266's repro, when run with
  `-Tplain`, then native prints `abx`, equal to the port.
- Given the fresh plain walk against the carried oracle, when complete,
  then there are 0 regressions on every engine, and every retired entry's
  graph is conformant.
- Given `known-divergences.md`, when read, then the U-series section has
  U1 with the MR, issue, patch file, status and drop rule.

## Observability

The journal records: the number of acceptance entries retired and kept,
plain parity counts before and after per engine, and the carried build
stamp (`carried-build.json`).

## Rollback

Reversible. Deleting `0001-*.patch` and its manifest entry, rebuilding, and
restoring `accepted-divergences-plain.json` returns the previous state.

## Commit

`chore(oracle): carry graphviz!5152 as patch 0001 and retire 266 entries`,
with a body and `Closes: #266`.
