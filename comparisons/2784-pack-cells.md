<!-- SPDX-License-Identifier: EPL-2.0 -->

# `2784` — polyomino pack needs 2.0e9 cells; the port throws at V8's `Map` limit

## Status

**ACCEPTED** (2026-10-14, graphviz 16.1 sync, T13). On the five pack-based
layout engines (`circo`, `twopi`, `neato`, `fdp`, `sfdp`; every output format)
the port throws `Map maximum size exceeded` on `~/git/graphviz/tests/2784.dot`
where native 16.1.0 completes. On `dot` the graph is `conformant`. The cause is
a platform limit below the code: the faithful port of `lib/pack/pack.c`
(`97fcccd8`) needs a set of 2,011,656,764 cells; a V8 `Map` holds at most 2^24
(16,777,216) entries.

The accepted outcome is a **thrown error, not a verdict**. The per-engine
registries (`accepted-divergences-engines.json` and the format registries)
accept only rows whose verdict is `diverged`; a `port-error` row cannot be
expressed there, so this page and `docs/known-divergences.md` (A10) are the
record, and the walks keep reporting `2784` under their port-error faults.

## Repro

```sh
GVBINDIR=/tmp/ghl ~/git/graphviz/build/cmd/dot/dot -Kcirco -Txdot \
  ~/git/graphviz/tests/2784.dot > native.xdot            # ~260 s, exits 0
npx tsx test/corpus/render-one-xdot.ts ~/git/graphviz/tests/2784.dot circo
# Error: Map maximum size exceeded  (after ~12 s)
```

The input is one line: `graph{... 2[0="" height="30000000000000000"] ...}`
with `splines="ortho"`; one node is 3e16 pt tall.

## Native vs port

| | native 16.1.0 | port |
|---|---|---|
| `circo` / `fdp` / `sfdp` / `twopi` | completes (walk: 260 s / 250 s / 274 s / 1191 s under load) | `port-error: Map maximum size exceeded` (11-14 s) |
| `neato` | completes | same error |
| `dot` | completes | `conformant` |
| polyomino cells in the pack set | 2,011,656,764 | limit 16,777,216 (2^24) |
| native cost (dedicated run) | 482 s, 67.3 GB RSS, 101 GB peak | n/a |

## Mechanism

`pack.c` places each connected component by rasterising it into cells of
`step` points and recording the occupied cells in a `PointSet`; `fits` then
probes candidate positions against that set. With a 3e16-pt node and the
component's `step`, the oversized node accounts for the 2.0e9 cells (the
total is from the journal's measurement; the per-node attribution is inferred
from the input). Native stores them in a `Dt_t` set (`addPS`): 67 GB resident.

The port mirrors the structure (`src/layout/pack/poly-place.ts`:
`PointSet` over a `Map<string, Point>`). V8 throws a `RangeError` once a `Map`
passes 2^24 entries, long before 2.0e9. Before `97fcccd8` the port's `step`
and placement used double arithmetic where C uses `int` (saturating
`computeStep`, 32-bit `fits`), which made it compute a small, wrong layout for
this graph without ever approaching the limit. `97fcccd8` fixed the arithmetic
(it also made `1314` conformant on the same five engines) and thereby exposed
the real size of the set. The decision to keep the faithful arithmetic and
accept the throw was taken in the T14 fixes row of the mission journal.

## Why accepted

- The limit is the runtime's, not a choice in the port: no `Map`, `Set` or
  typed-array structure in a browser holds 2.0e9 keyed entries, and the
  native build needs 67 GB of resident memory to do so.
- A sparse or interval representation of the cells would change the
  algorithm's data structure for a single degenerate fuzz input. The project
  rule is to port the C as written, so this is documented rather than
  redesigned.
- The previous "pass" was a wrong layout, so no conformant behaviour is lost.

## Measurement

Walk rows (`test/corpus/parity-<engine>.json`, 929-id roster): `circo`
oracleMs 259,988 / portMs 12,803; `fdp` 249,646 / 10,823; `sfdp` 273,981 /
11,723; `twopi` 1,190,772 / 13,543; each `err: "Map maximum size exceeded"`.
The `neato` row in the staged walk is provisional (rendered before the pack
fix); a re-walk is expected to record the same error. The cell count, RSS and
the 482 s figure come from the mission journal (T14 fixes row, 2026-10-13).
