# issue-190 mission — observations (2026-11-21)

## Observation: relabel.c is the one-process native harness that sets an attribute between layouts
- **Context**: reproducing a no-free relayout after a node attribute change against the carried oracle.
- **Finding**: `plans/issue-190-node-relabel/harness/relabel.c` runs n cycles of `gvLayout` +
  `gvRenderData` on one graph with no `gvFreeLayout`, and can `agsafeset` one node attribute after
  render 1. It does not call `agseterr`, so warnings reach stderr. `twice.c`
  (`plans/post-16-1-followups-9/harness/T11/`) cannot set an attribute and silences stderr.
  `harness/build.sh` links it against the carried build; `harness/probe.ts` is the port side with
  the same `== render N` protocol, and `harness/native-compare.sh` runs both over `cases.txt`.
- **Impact**: use it for any "change an attribute, lay out again" probe. `regen.sh` in
  `src/gvc/__fixtures__/rerender/` cannot produce such fixtures; `harness/recapture.sh` does.
- **Confidence**: High

## Observation: native fdp prints the non-comparable clusters error on every no-free relayout
- **Context**: the 46-case no-free matrix, fdp rows.
- **Finding**: on a second fdp layout with no free, native prints
  `Error: node "a" is contained in two non-comparable clusters "%1" and "%1"` once, with or without
  an attribute change, on a graph with no clusters. The port prints nothing. stdout is identical.
  Tracked as #256.
- **Impact**: an fdp no-free stderr comparison shows one native line more until #256 is settled;
  it is not a label or reset difference.
- **Confidence**: High (3 matrix rows, `harness/results/native-head.tsv`)

## Observation: bytediff id mode rejects quarantined manifest ids
- **Context**: gate 6's reach bytediff over a list of ids picked by grepping the corpus inputs.
- **Finding**: `test/tools/bytediff.ts` `loadManifest` keeps `status === 'applicable'` rows only, so
  an ids file naming a quarantined id throws `unknown id <id>` before any job runs. `--file <path>`
  runs such an input on every engine. Of the #190 reach list, `1494` and `2782` (`malformed`) and
  `2761`, `2761_1` (`oracle-crash`) are quarantined. `marker-run.sh` reads the manifest itself and
  takes any status, so the marker ran them.
- **Impact**: filter a reach list by manifest status before handing it to bytediff, or run the
  quarantined inputs with `--file` and say so.
- **Confidence**: High

## Observation: 2782.dot under dot, xdot sits at bytediff's 1536 MB heap limit
- **Context**: the one capped job of the reach bytediff.
- **Finding**: `2782.dot` has `minlen=283647` (bb height 1.4576e+05 in). `bd-job.ts` with
  `--max-old-space-size=1536` dies with `Allocation failed` on some runs and finishes on others, on
  the same bundle: base 2 of 6, head 4 of 6. Every finished run printed the same 3229 bytes, and
  so did both bundles at 4096 MB.
- **Impact**: a cap on this job says nothing about a change. Compare the finished outputs (or
  raise the heap) before reading it as a regression.
- **Confidence**: High for the observation; which allocation fails was not traced.
