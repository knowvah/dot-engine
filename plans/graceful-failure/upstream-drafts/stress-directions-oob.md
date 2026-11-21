<!-- SPDX-License-Identifier: EPL-2.0 -->
# stress-directions-oob: heap-buffer-overflow in `sparse_stress_subspace_majorization_kD`

Status: pushed and filed.

- Fork issue: https://gitlab.com/sseely/graphviz/-/work_items/3
- Branch: `fix/stress-directions-oob` on origin (no MR opened).
- Push line: ` * [new branch]          fix/stress-directions-oob -> fix/stress-directions-oob`
  (`git push -o ci.skip origin fix/stress-directions-oob`).
- Shas (unsigned): test `9f9cfbace`, fix `0bbb66f6b`, base `upstream/main`
  `3d49611e3e743f46b85cae91fe672fb85d5c7b31`.

## Duplicate check (graphviz/graphviz, read-only)

- issues "stress directions": 1 hit, #513 (2016 Solaris neato maps; unrelated)
- issues "neato dim=4 hier", "hier dim": no hits
- MRs "stress": !4992, !4725, !1711 (hierarchy leaks, modernisation, NULL
  derefs; none touches the `directions[k][k]` loop)
- MRs "directions": 5 hits, all unrelated

## Upstream issue text

**`mode=hier dim=4` on a two-node graph writes past the `directions` allocation**

```
graph { mode=hier; dim=4; a -- b }
```

`GVBINDIR=<dir with core, dot_layout, neato_layout> dot -Kneato -Tplain r.gv`

Observed: with the 16.1.1 build, 30 of 40 runs exit 133 (SIGTRAP from malloc
corruption detection); the others exit 0. An AddressSanitizer build at
`upstream/main` (3d49611e3) reports:

```
ERROR: AddressSanitizer: heap-buffer-overflow
WRITE of size 8 ... 0 bytes after 48-byte region
    #0 sparse_stress_subspace_majorization_kD stress.c:513
    #1 stress_majorization_kD_mkernel stress.c:872
    #2 stress_majorization_with_hierarchy constrained_majorization.c:95
    #3 majorization neatoinit.c:1117
allocated by: sparse_stress_subspace_majorization_kD stress.c:497
```

Expected: no out-of-bounds write.

Mechanism (instrumented, ASan build with temporary `fprintf`):
`stress_majorization_with_hierarchy` calls the k-D majorization with
`dim - 1` (`constrained_majorization.c:95`). Trace at `stress.c:511`:
`dim=3 n=2 subspace_dim=2 alloc_doubles=6`, then `k=0 index=0 ok`,
`k=1 index=3 ok`, `k=2 index=6 OUT OF BOUNDS`. `subspace_dim` is
`MIN(stress_pca_dim, n)` (`stress.c:256`), `directions` is `dim *
subspace_dim` doubles (`stress.c:497`), and for `dim != 2` the loop at
`stress.c:512` sets `directions[k][k] = 1` for every `k < dim`. Once `dim >
subspace_dim` the index `k * subspace_dim + k` leaves the row and, for the
last row, the allocation. With `dim = 3` and `n = 2`, index 6 of 6.

Fix: bound the loop by `subspace_dim` (there are only that many axes).

Evidence it is the same defect for other shapes: `dim=3` (kernel `dim=2`,
PCA branch) is clean; the failure needs kernel `dim > min(50, n)`.

History: `git log -S'directions[k][k] = 1' -- lib/neatogen/stress.c` returns
only `256ef6666` (2004-12-23, "Initial revision"). The loop is original.

Not checked: other callers of the k-D kernel with `dim > n`; whether
`mode=major` reaches the same loop (`dim=3 a--b` in default mode did not
trigger it, the `smart_ini && n > 1` path was not exercised); non-ASan
platforms other than macOS arm64.

## MR description (style of !5152)

neatogen stress: fix: bound the initial directions by the subspace size

`sparse_stress_subspace_majorization_kD` allocates `directions` as a `dim` by
`subspace_dim` matrix, where `subspace_dim` is `MIN(stress_pca_dim, n)`. For
`dim != 2` the smart initialization set `directions[k][k]` for every `k < dim`.
When the graph has fewer nodes than `dim` this writes outside the row and,
for the last row, outside the allocation. `mode=hier dim=4` on two nodes
reaches it, because the hierarchy code passes `dim - 1`.

The test runs that graph. It is only reliable under AddressSanitizer; without
it the 8-byte overflow sometimes lands in malloc padding (30 of 40 runs crash
on macOS arm64).

Gitlab: fixes #<upstream issue number>

## Maintainer must read every line

- [ ] `lib/neatogen/stress.c`: loop bound `k < dim && k < subspace_dim` and the
      added comment (rows `k >= subspace_dim` stay zero from `gv_calloc`)
- [ ] `tests/test_regression.py::test_stress_directions_oob`: no
      `xfail` after the fix; it only fails reliably under ASan (a non-ASan
      build can XPASS the strict marker in the first commit)
- [ ] `CHANGELOG.md`: entry has no issue number yet
- [ ] `ci/clang_format.py` excludes `stress.c`; clang-format was not run on it
- [ ] Commit trailers and wording are the maintainer's to confirm

## dot-engine port behaviour

The port renders the repro graph (`render-one.ts r.gv neato`: SVG, 62x95pt,
exit 0, no abort).
