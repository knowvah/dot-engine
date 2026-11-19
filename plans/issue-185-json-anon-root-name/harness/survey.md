# Harness: probes and survey selection

## Probes ([probes/](probes/))

| Probe | Root | Native json/json0 root name |
|---|---|---|
| `bare.gv` | nameless, no statements | `%1` |
| `repro.gv` | nameless, anonymous subgraph + cluster (the issue's repro) | `%1` (subgraph `%3`) |
| `strict.gv` | nameless strict graph | `%1` |
| `empty.gv` | named `""` (control) | `""` |
| `named.gv` | named `G`, anonymous subgraph (control) | `G` (subgraph `%1`) |

Each under the 8 engines in json and json0: 80 rows,
[results/probes-planning.tsv](results/probes-planning.tsv): 80 `eq`, 48 moved.
[native-root-names.tsv](native-root-names.tsv) is its native column, which
`src/render/json-root-name.test.ts` reads.

## Survey selection ([survey-ids.txt](survey-ids.txt), 139 ids)

From `test/corpus/corpus-manifest.json`, `status` `applicable`, the file under
`ORACLE_CORPUS_ROOT` with comments stripped, and the first header matched by
`^\s*(strict\s+)?(di)?graph\s*([^{\s]*)\s*\{`:

- name empty (nameless root): 129 ids;
- name `""`: `1864`, `1896`, `2734` (control);
- no `%`-prefixed root names (#194's case);
- header not matched (a comment or odd spelling first): 7 ids
  (`tree-contrib-java-dot-uml`, `1221`, `2082`, `2108`, `56`, `698066`,
  `share-b545`), included so a missed nameless root cannot hide;
- 843 named roots, left out: the change returns `g.name` for them.

Engine dot, format json (json0 shares `buildGraphObject`; the probes cover it
under all 8 engines). Run in four shards of 35 ids, concatenated in id order. Native runs time out at 120 s (`TIMEOUT`,
verdict `skip`). Planning ran on base `9336a55c` and the prototype:
[results/survey-planning.tsv](results/survey-planning.tsv).

Planning result (139 rows): `eq`/moved 128, `eq`/unchanged 8, `skip` 3
(`1864` 14 MB and `2475_1`: native past 120 s; `share-b545`: a plain-format
file native and the port both reject). No `NE`, no `err` `DIFF`. Four shards
of 35 ids took over 30 minutes at load 4-9; the slow ids (`2343`, `2371`,
`2475_1`) were re-split.

## Gate 5 helper

[toward-native.ts](toward-native.ts) reads a bytediff output and prints, per
changed row, the diff-line counts against native on base and head and whether
every changed line now equals native's line. Planning:
[results/toward-native-planning.tsv](results/toward-native-planning.tsv), 96
rows, all `y`, `changed` `2`.
