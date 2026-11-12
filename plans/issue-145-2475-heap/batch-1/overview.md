# Batch 1: measure and diagnose

No `src/` change lands in this batch. Its output is the diagnosis artifact that decides
whether batch 2 runs and what batch 3 documents.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Per-phase live heap, port and native, c400/c800/c1600 | executor (no subagent) | `harness/`, journal | — | [x] |
| T2 | Heap snapshot at the peak phase, C mapping, diagnosis artifact | executor | `harness/`, journal | T1 | [x] |

Run sequentially: T2 needs T1's peak phase. Both are measurement work in one context; a
subagent would lose the numbers in the hand-off.

**Interface T1 → T2:** the phase table (one row per size × phase: port `heapUsed` MB,
port `rss` MB, native `size_in_use` MB, ratio) and the name of the peak phase and of the
phase whose ratio grows most from c800 to c1600.

**Interface T2 → T3, T4, T5:** in the journal, the diagnosis artifact plus:

- `outcome`: `port-artifact`, `c-faithful` or `mixed`;
- per structure: name, port `file:line`, C `file:line`, bytes at c400/c800 (or
  c800/c1600), class (AD-3), and the candidate representation change if any.
