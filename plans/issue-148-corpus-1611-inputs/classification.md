# Classification: the inputs graphviz 16.1.1 adds or changes (#148, T3)

Measured 2026-11-16 on `chore/issue-queue` (port = base `736b6d59`, no `src/`
change) against native **16.1.1** (the oracle), with native 16.1.0 for
attribution only.

## Method

- Harness: [harness/classify.mjs](harness/classify.mjs). Per (id, engine,
  format) it renders native 16.1.1, native 16.1.0 and the port
  (`test/corpus/render-one*.ts`) and scores them with the walkers' own
  comparators: `survey.ts` `diffVerdict` (SVG), `compare-xdot.ts` (xdot),
  `compare-dot.ts` (`-Tdot`). A native render is a reference when it is complete
  (`</svg>` / closing `}`), whatever its exit code, as in the walkers.
- Ids chosen: all 36 new ids and the 7 changed inputs (the only ids this mission
  can reach), dot `-Tsvg` and `-Txdot`; `2866` also `-Kcirco`, `2841` only
  `-Kfdp` (`layout=fdp`); `-Tdot` for `2860*` and the 7 changed inputs, because
  #149 changes statement order, which the xdot comparison cannot see.
- cwd = the 16.1.1 `tests/` dir (inputs name `2821.png` relatively). `2821_*`
  were also run from the repo root, which is what `survey.ts` does.
- 103 rows, no timeout: [harness/classify-results.tsv](harness/classify-results.tsv).
  Oracle preflight passed for dot, circo, fdp. Load was 70–90 from other
  repositories' test runs (no dot-engine survey running); no row is timing
  dependent.
- Categories are AD-3's. SVG and xdot agree on the category for every id.

## Result

Of the 36 new ids: 15 conformant, 17 pending-port (each on a filed issue),
3 oracle-crash, 0 new-upstream, and `2841` (quarantined `engine-deferred`; its
fdp render is a port defect, #224). The 7 changed inputs stay conformant on
every comparator.

| id | category | issue | evidence |
|---|---|---|---|
| `2746` | oracle-crash | quarantined (T2) | native 16.1.1 and 16.1.0 SIGSEGV; upstream `xfail`. The port throws too (`src/pathplan/route.ts:44` via `reallyRoute`); no reference exists |
| `2756`, `2756_1` | pending-port | #159 | 16.1.0 SIGSEGV, 16.1.1 exit 0. Port throws `reading 'v'` at `flat.ts:172` `flatLabelYpos` ← `processOtherLabel` ← `flatEdges`: no rank −1 for a labelled `other` edge |
| `2758` | pending-port | #162 (then #152) | 16.1.1 prints `Edge length 2147483701.000000 larger than maximum` once and fails the layout (8×8 pt, nodes at 0, no edge, exit 1). 16.1.0 printed it 3× and clamped. The port prints nothing and places nodes past int32 (`cx` 7174967375); it differs from both natives |
| `2759`, `2759_1` | pending-port | #160 | 16.1.0 SIGSEGV, 16.1.1 exit 0. Port throws `reading 'info'` at `position-ycoords.ts:178` `setYcoordsInitial` (empty rank) |
| `2761`, `2761_1` | oracle-crash | quarantined (T2) | native 16.1.1 SIGSEGV (`2761` `-Txdot`: SIGABRT) after `Error: install_in_rank, line 1157`; 16.1.0 too; upstream `xfail`. Port throws at `position-ycoords.ts:193` |
| `2765`, `2765_1` | conformant | — | SVG and xdot equal native 16.1.1 (16.1.0 SIGSEGV). `2765` stderr lacks 6 `port 0 unrecognized` warnings: #216, same on both natives |
| `2768`, `2768_1`, `2768_2` | conformant | — | SVG, xdot, stderr equal (16.1.0 SIGSEGV / SIGBUS) |
| `2769`, `2769_1`, `2769_2` | conformant | — | SVG, xdot, stderr equal (16.1.0 SIGSEGV) |
| `2773`, `2773_1`, `2774`, `2774_1`, `2776` | pending-port | #151 | 16.1.0 SIGBUS; 16.1.1 prints `in checkpath, all bounding boxes are below threshold`, exits 1, output complete. Port throws `reading 'll'` at `edge-route-faithful.ts:289` `widenPathBoxes`, before `checkPath` (see below) |
| `2776_1` | pending-port | #162 (then #151) | 16.1.1 prints `Edge length 300000000000000000.000000 larger than maximum` and fails the layout. The port clamps silently, carries on and hits the `widenPathBoxes` throw |
| `2780` | pending-port | #151 (then #150) | native as `2773` plus `lost d0 S… edge`; port throws at `widenPathBoxes`. #150's `update_bb_bz` bound is not observable until the path is rejected |
| `2781`, `2781_1` | pending-port | #162 | 16.1.0 SIGSEGV; 16.1.1 prints `Edge length 71999999999999994497073152.000000 larger than maximum`, exit 1, failed-layout output. Port renders with no error: diverged, max Δ 1.44e26 |
| `2783` | pending-port | #164 | port = native 16.1.0; 16.1.1 prints `trapezoid segment construction failed` and translates by 31, not 4. Revert test: 16.1.1 with only `b99490ece`'s permutation restored equals 16.1.0 and the port byte for byte (see below) |
| `2821_0` | conformant | — | from the repo root (the survey's cwd) SVG, xdot and stderr equal native (neither finds `2821.png`). From `tests/` native reads the PNG; the port given its size (`setImageSizer` 1×1) is conformant too. The harness worker has no sizer: #226 |
| `2821_1`, `2821_2` | pending-port | #155 | port = native 16.1.0 (`syntax error … <IMG SRC="2821.png"/>`); 16.1.1 accepts the white space after `<IMG/>` |
| `2841` | quarantined `engine-deferred` (fdp: port-defect) | #224 | in no track. `-Kfdp`: natives equal (6/6 runs identical); port differs: node `cluster_movie` at `189.87,134.62` not `0,0`, cluster `cluster_movie` bb `0,0,0,0`, root `lp` missing |
| `2860`, `2860_1` | conformant | — | SVG, xdot conformant; `-Tdot` byte-identical on port, 16.1.0 and 16.1.1 (they do not reach #149's reordering) |
| `2866` | conformant | — | dot and circo: SVG, xdot, stderr equal |
| `2870_0`, `2870_1`, `2870_2` | conformant | — | SVG, xdot, stderr equal |
| `linux.i386-radius_dot`, `linux.x86-radius_dot`, `linux.x86-shapes_dot`, `macosx-radius_dot`, `nshare-radius_dot`, `nshare-shapes_dot`, `windows-radius_dot` (changed) | conformant | — (`-Tdot` bytes: #149) | SVG, xdot and `compareDot` conformant on the new content, as the registries hold for the old. `-Tdot` bytes equal 16.1.0 and differ from 16.1.1 in line order only (4 lines on `radius_dot`, 54 on `shapes_dot`; sorted lines equal): #149's edge order |

## The issue's three claims

| claim | verdict | render that shows it |
|---|---|---|
| circo `db96c0ca3` (upstream 2866) needs no port change | **held** | `2866` `-Kcirco` (and dot): SVG and xdot conformant, stderr equal |
| pack `8ae4fd0a9` (upstream 2768, 2769) needs no port change | **held** | `2768`, `2768_1`, `2768_2`, `2769`, `2769_1`, `2769_2`: SVG and xdot conformant, stderr equal, where 16.1.0 crashed |
| ortho `9ac4b9e3d` (upstream 2783) needs no port change | **held for that commit; `2783` is still not conformant** | 16.1.1 minus only the permutation change renders `2783` exactly as the port does, so `9ac4b9e3d` is not what the port lacks. `2783` moves with `b99490ece`, filed as #164 |

## `2783`: which commit moved native

- **Mechanism:** `b99490ece` (`ortho partition: de-dupe permutation logic`)
  replaces the `srand48(173)`/`drand48` segment order with `gv_permutation` over
  unseeded libc `rand()`. In the new order `add_segment` fails on `2783`'s
  degenerate segments (node `2` is 3e16 in tall; node `0`'s height vanishes at
  that magnitude), so
  `construct_trapezoids` returns no trapezoid, `partition` prints `horizontal
  trapezoid construction failed` and returns NULL, and `dot_layout` returns
  before `dotneato_postprocess`: the drawing is never translated (`cx=0`, bb
  `LL.x=-27`), while `dot` still exits 0. The same early return is recorded for
  `2784` in `.agent-notes/gv16-triage.md`.
- **Origin:** `lib/ortho/partition.c:135` `generateRandomOrdering` (16.1.1).
- **Evidence:** [harness/2783-revert-test.sh](harness/2783-revert-test.sh)
  rebuilds libgvc under `$TMPDIR` from the oracle's objects. Control (unmodified
  `partition.c`) is byte-identical to the oracle. Variant
  ([the patch](harness/2783-revert-permutation.patch): 16.1.0's permutation, all
  else 16.1.1) prints nothing, translates by 4 and is byte-identical to native
  16.1.0, which the port matches (`compareSvg` conformant).
- **Ruled out:** `9ac4b9e3d` and the other 15 commits under `lib/ortho` in
  `16.1.0..16.1.1` (all present in the variant, which does not fail); the
  failure messages themselves (present in 16.1.0, `partition.c:694`,
  `trapezoid.c:623`).
- **Assigned:** #164, whose ruling (emulate macOS `rand()` through
  `src/common/crand.ts`) already covers it.

## `2773` family: the port throws before #151's guard

- **Mechanism:** every box of the path is degenerate (`LL.y == UR.y ≈ 7.286e17`;
  the node heights vanish at that magnitude), so `add_box` drops them all:
  `P.nbox = 0`. `adjustregularpath` then reads `P->boxes[i]` for `i` in
  `[fb-1, lb]` = `[0, 1]`. C reads inside the array `dot_splines_` preallocates
  (`dotsplines.c:338`, `gv_calloc(n_nodes + 20 * 2 * NSUB, …)`) and goes on to
  `checkpath`, which at 16.1.1 rejects the path (`routespl.c:648`). The port's
  `P.boxes` is a JS array of length 0, so `P.boxes[0].ll` throws.
- **Origin:** `src/layout/dot/edge-route-faithful.ts:289` `widenPathBoxes`.
- **Evidence:** a traced copy of `src/` under `$TMPDIR` printed, on `2773`:
  `tend.boxn=1 inter=3 hend.boxn=1 added P.nbox=0 fb=1 lb=1`, then
  `widenPathBoxes i=0 … P.boxes.length=0`; `2776_1` the same.
- **Consequence for #151:** its port note names `checkPath`
  (`splines-routespl.ts:183`) as the throw site; that guard is never reached on
  these inputs until `widenPathBoxes` tolerates the read. Posted on #151. The
  full diagnosis belongs to #151's mission.

## Follow-ups filed

| issue | what |
|---|---|
| #224 | fdp `2841`: a node and a cluster of the same name swap roles; root `lp` missing (port differs from both natives) |
| #225 | dot: the `already in a rankset` warning prints an empty name for an anonymous graph (native `%1`); seen on `2759` |
| #226 | corpus harness: native runs from the repo root and the port worker has no image sizer, so image inputs only test the missing-file path |

Comments with the id lists went to #149, #150, #151, #152, #155, #159, #160,
#161, #162, #164 and #216.

## Suggested additions to the queue smoke list

`~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt` is read-only here. The
new ids that are conformant today and guard a 16.1.1 fix: `2765`, `2765_1`
(#161's paths), `2768`, `2768_1`, `2769`, `2769_2` (pack), `2866` (circo
`buildParents`), `2860` (#149's upstream input), `2870_1`. Add each
pending-port id when its issue lands.
