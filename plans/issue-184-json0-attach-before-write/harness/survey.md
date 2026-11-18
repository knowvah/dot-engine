# Probes and survey: issue #184

## Probes (`probes/`, 10 inputs)

Each one reaches a key `attach_attrs` writes (`lib/common/output.c:254-416`):

| Probe | Reaches |
|---|---|
| `ab.gv` | the issue's repro: root `bb`, one edge `pos` |
| `labels.gv` | root and cluster labels (`lp`/`lwidth`/`lheight`), edge `lp`, `head_lp`, `tail_lp`, `xlp`, node `xlp`, record `rects` |
| `nested.gv` | nested clusters, a non-cluster subgraph inside a cluster (no `bb`), a top-level non-cluster subgraph |
| `lr.gv` | `rankdir=LR` with `rotate=90` (landscape `bb`) |
| `clusteredge.gv` | `compound` cluster edges: fdp's cluster-edge branch, which already attached first (must not change) |
| `concentrate.gv` | `concentrate=true`: merged edges with no spline of their own print no `pos` |
| `noedges.gv` | no edges: `bb` only |
| `inputbb.gv` | an input `bb` on the root and on a cluster, and a subgraph that inherits the root's (agmakeattrs) |
| `ortho.gv` | `splines=ortho`, edge label (stderr: #246 on dot and neato) |
| `multi.gv` | multi-edges, a back edge, a self loop, a `labelloc=b` cluster |

Native captures: `native/<probe>.gv.<engine>.json0`, made by `json0-compare.ts`
with `NATIVE_DIR=native` on 2026-11-17. Oracle: graphviz 16.1.1
(`~/git/graphviz-16.1.1/build/cmd/dot/dot`, `GVBINDIR=/tmp/ghl1611` for dot,
`/tmp/ghl1611-all` for the other engines), `-K<engine> -Tjson0 <probe>`.

**Planning result** (`results/probes-planning.tsv`, base `89613a69` against the
prototype):

- 80 rows. Head equals native in 79; base in 0.
- `concentrate`/sfdp: 42 lost and 0 unowned (sfdp's 4-cycle orientation,
  #257).
- stderr: `ortho`/dot and `ortho`/neato are `DIFF` on base and head (#246).

## Survey selection

The change reaches every json0 render that has a layout `bb` or an edge, so no
attribute or engine narrows it. The survey takes the queue's smoke list (49
ids) under 8 engines. Map the ids to files with:

```
node -e "
const m=require('./test/corpus/corpus-manifest.json');const fs=require('fs'),path=require('path');
const ids=fs.readFileSync(process.env.HOME+'/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt','utf8').split(/\s+/).filter(Boolean);
const root=process.env.HOME+'/git/graphviz-16.1.1/tests';
console.log(ids.map(id=>path.resolve(root,m.find(x=>x.id===id).path)).join('\n'));
" > $TMPDIR/i184-smoke-files.txt
```

**Planning result** (`results/survey-planning.tsv`, 392 rows, about 3 minutes
at load 8):

- head equals native in 373 rows;
- 17 rows have `lost` > 0, all sfdp, `unowned` 0 in each. Their new `bb` and
  `pos` values equal base `-Tjson`'s, and `-Tjson` differs from native there
  too (sfdp's tracked divergence);
- `polypoly`/osage: 4 node `pos` diffs, on the base as well;
- `2717`/fdp: native `SEGVx5`;
- `unowned` > 0: none. stderr `same`→`DIFF`: none.

## The `unowned` column

json0 newly prints keys whose values come from the same layout `-Tjson`
prints. A lost diff whose path and value also appear in base `-Tjson`'s diff
against native `-Tjson` is a divergence that already existed, now visible in
one more format. That is queue rules gate 5 exception (a). `unowned` counts
the lost diffs that are not of that kind. It must be 0.
