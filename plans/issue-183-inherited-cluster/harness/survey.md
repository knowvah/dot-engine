# Planning evidence: issue #183

Native: graphviz 16.1.1 (`~/git/graphviz-16.1.1/build/cmd/dot/dot`),
`GVBINDIR=/tmp/ghl1611` for dot and `/tmp/ghl1611-all` for the other engines.
Both have `config8`. Captured 2026-11-17. Base bundle built from `89708589`.
Head bundle: base + [prototype.diff](prototype.diff).

## Probes

| Probe | What it covers | Native clusters (dot / neato) |
|---|---|---|
| `r1` | the issue's first repro: root `cluster=true`, two nested `q` | 4 / 2 |
| `r2` | the issue's second repro: `cluster=true` on `p` and `r` | 4 / 2 |
| `late` | the root sets `cluster` after `p` opened | 1 / 1 |
| `nestlate` | set mid-body: `q` before, `s` after | 2 / 1 |
| `off` | a local `cluster=false` shadows the root for its children | 1 / 1 |
| `num` | `cluster=1` / `cluster=0` (mapbool numeric), digraph with edges | 1 / 1 |
| `anon` | `cluster=yes`; anonymous subgraphs inherit (fdp `fillMap` alias, #182) | 2 / 2 |
| `mixed` | a named `cluster_x` with `cluster=true`, child inherits | 2 / 1 |
| `sibling` | inheritance only below the scope that sets it | 3 / 2 |
| `attrstmt` | `graph [cluster=true, label=...]` statement form | 2 / 2 |
| `rankset` | a `rank=same` subgraph inherits and becomes a cluster | 1 / 1 |
| `pack` | dot `pack=true`: projection copies `attrs` (AD-1's decider) | 3 / 2 |
| `pack2` | `pack=true` with the value set on a subgraph | 2 / 1 |

Cluster counts are `class="cluster"` in `-Tsvg`; on the base the port is lower
in every probe under dot, fdp, osage and patchwork.

## Results ([results/probes-planning.tsv](results/probes-planning.tsv))

13 probes × 8 engines × `dot,xdot,svg` = 312 rows, base vs prototype B:

- stderr equals native in 312/312 (base: 303; `r1`, `r2`, `anon` under fdp
  lacked fillMap's `Two clusters named` line).
- `dot`/`xdot` stdout byte-equal to native in 204/208. The 4 others predate
  the change (decisions AD-4):
  - `num`/fdp (1 line, a cluster `bb` of `7.9936e-15` against `0`; #209);
  - `mixed`/sfdp (7 and 20 lines, the same on the base and with no clusters
    at all).
- `svg`: every row differs from native in the 3 header lines only, on base
  and head alike.

Option A ([prototype-a.diff](prototype-a.diff)): the same, except that
`pack.gv`/dot stays 10 lines off native (every subgraph's `bb` is missing).

## Survey ([results/survey-planning.tsv](results/survey-planning.tsv))

Selection: the corpus inputs that set `cluster` as a graph attribute
(`grep -rlE '(^|[^_a-zA-Z])cluster *='` over the oracle's `tests/`): `2717`,
`2854_1`, `2855`, `2475_2` (`2475_1` excluded: native runs longer than 300 s).
None nests a subgraph inside an inheriting scope. 8 engines × `dot,xdot`.

**Planning run, partial:** 54 of 64 rows. The run hit the session's 40-minute
background limit during `2475_2` under circo, so `2475_2` was measured under
dot, neato and fdp only. `headEqBase` is `yes` in 54/54, and no row goes from
stderr `same` to `DIFF`. `2717`/fdp: native `SEGVx5`. `2475_2` differs from
native on base and head alike (dot 77 lines, neato 4, fdp 22980/67329): these
predate the change. Expect `2475_2` to take about 5 minutes per engine, native
included. T1's gate 6 runs the full 64 rows.
