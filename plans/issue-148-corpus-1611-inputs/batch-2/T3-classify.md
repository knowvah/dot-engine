# T3: classify every new and changed id against native 16.1.1

## Context

AD-3 sets the categories. Planning's dot `-Tsvg` smoke is in
[../harness/planning-smoke.txt](../harness/planning-smoke.txt). The input file
name is the upstream issue number, and the bodies of #149–#165 cite these
upstream numbers (planning grep):

| filed issue | upstream numbers it cites | new ids that carry them |
|---|---|---|
| #149 `write_body` edge order | 2193, 2855, 2860, 2861 | `2860`, `2860_1`; the 7 changed inputs |
| #150 `update_bb_bz` depth | 2780 | `2780` |
| #151 degenerate boxes | 2773, 2774, 2776, 2778 | `2773`, `2773_1`, `2774`, `2774_1`, `2776`, `2776_1` |
| #152 `tree_adjust` int32 | 2758 | `2758` |
| #155 white space around IMG | 2621 | maybe `2821_*` (check) |
| #159 `flat_edges` abomination rank | 2756 | `2756`, `2756_1` |
| #160 empty ranks | 2759 | `2759`, `2759_1` |
| #161 `make_regular_edge` | 2765 | `2765`, `2765_1` (equal to native at planning) |
| #162 aux edge too long | 2776, 2781 | `2776_1`, `2781`, `2781_1` |

Unmapped: `2746`, `2761*` (native crash, T2), `2768*`, `2769*` (pack), `2783`
(ortho), `2821_*`, `2841` (fdp), `2866` (circo), `2870_*`.

**Known at planning, `2783`:** port = native 16.1.0 exactly; native 16.1.1
translates by 31 instead of 4 (node `0` at `cx=0`, not 27) and prints
`trapezoid segment construction failed` / `horizontal trapezoid construction
failed`. The issue's claim (ortho `9ac4b9e3d` needs no port change) is therefore
wrong or incomplete. Find which 16.1.1 commit moved it
(`git -C ~/git/graphviz log --oneline 16.1.0..16.1.1 -- lib/ortho lib/dotgen
lib/common`, bisect with instrumented copies built under `$TMPDIR` if needed) and
file or assign accordingly.

## Task

1. `uptime` ≤ 12, then `oraclePreflight` for `dot` and for an all-engines run.
2. Write `harness/classify.mjs`: for each id, render native 16.1.1, native
   16.1.0 and the port (`test/corpus/render-one*.ts`), cwd = the 16.1.1 tests
   dir, and compare with the survey's comparators (`test/golden/compare.ts` for
   SVG, the xdot walker's comparator for `-Txdot`). Record exit codes and stderr.
   Formats and engines: dot `-Tsvg` and `-Txdot` for every applicable new id and
   the 7 changed inputs; plus `-Kcirco` for `2866`, `-Kfdp` for `2841`. Native
   timeout 60 s, port 180 s.
3. Classify each (id, format) per AD-3. For `pending-port`, the evidence is the
   16.1.0/16.1.1 native pair plus the issue's C change; for `port-defect`, the
   first divergent stage if it is cheap to find (`GVTS_POS_DUMP`), else the
   observed symptom. The full diagnosis belongs to the follow-up mission; say so
   in the issue.
4. Confirm or refute the issue's three claims with the evidence: circo `2866`,
   pack `2768*`/`2769*`, ortho `2783`.
5. Write `classification.md`: one table, one row per id (category, issue,
   one-line evidence), the three claims, and the ids suggested for the queue
   smoke list (read-only, main checkout).
6. Issues: comment on each matched #149–#165 with its new ids and the observed
   port/native difference; file `follow-up` issues for `new-upstream` (also
   `upstream-16.1.1`) and `port-defect`; no `queue:ready` label.

## Write-set

`plans/issue-148-corpus-1611-inputs/classification.md`,
`plans/issue-148-corpus-1611-inputs/harness/*`. Temp output under `$TMPDIR`.
GitHub: comments on #149–#165, new issues.

## Acceptance criteria

- Given the 33 applicable new ids and the 7 changed inputs, when T3 finishes,
  then each has a category and, unless `conformant`, an issue number.
- Given `2783`, when classified, then the row names the 16.1.1 commit that moved
  native (or the bisect range and what ruled the rest out).
- Given the issue's three claims, when checked, then `classification.md` states
  each as held or refuted, with the render that shows it.
- Given any `new-upstream` or `port-defect` row, when T3 ends, then a GitHub issue
  exists with the input, both outputs' first differing lines, and the label
  `follow-up`.

## Quality bar

No file under `src/` or `test/` changes in T3. Commit
`docs(T3): classify the 16.1.1 corpus inputs`.

**Observability:** N/A — no new observable operations.
**Rollback:** Reversible (plan files only; issue comments stay as record).
