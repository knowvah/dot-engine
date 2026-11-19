<!-- SPDX-License-Identifier: EPL-2.0 -->
# Carried oracle patches

The conformance oracle is graphviz 16.1.1 plus the patches in this directory
(`docs/adr/0003-upstream-fix-forward.md`). `../build-carried-oracle.sh` builds
the tag `16.1.1` of the fork at `~/git/sseely/graphviz` in the detached worktree
`~/git/sseely/graphviz-carried`, applying `*.patch` in lexical order with
`git am --3way`. Pristine 16.1.1 (`~/git/graphviz-16.1.1`) stays as the bisect
build and is never written to.

`manifest.json` (`{ "patches": [CarriedPatch] }`) lists every patch; 
`../oracle-patches.test.ts` fails when a file and an entry disagree.

## Life cycle

1. Draft: fix developed in the fork; nothing carried yet.
2. Fork issue `proposed`: the maintainer reads every line.
3. Upstream MR filed: the patch is carried (`status: "filed"`, `upstreamMr`
   set; the manifest test rejects `filed` with a null MR) and the port follows
   the C fix.
4. Merged upstream: `status: "merged"`; the patch is dropped at the next pin
   move (oracle version bump).

## Backport recipe

```sh
git -C ~/git/sseely/graphviz switch -c carried/<slug> 16.1.1   # in a worktree
# cherry-pick or re-apply the fix onto 16.1.1, commit
git format-patch -o test/corpus/oracle-patches --start-number N 16.1.1..
```

Run `format-patch` from the fork checkout, with an absolute `-o` path. Add the
manifest entry (`patch`, `slug`, `forkBranch: "carried/<slug>"`, `upstreamMr`,
`upstreamIssue`, `status`, `dotEngineIssue`), then rebuild with
`sh test/corpus/build-carried-oracle.sh`.

## Rule

Patch files are regenerated from the `carried/<slug>` branch, never
hand-edited. To change one, amend the branch and re-run `format-patch`.
