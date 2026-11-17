# issue #149: notes from the write_body edge-order port

## Observation: a line-count verdict against native misreads a row whose layout already differs
- **Context**: Gates 5 and 6 compared base and head with native through the
  mission's `compare.mjs`: native lines that `diff` leaves unmatched, an
  `AWAY` verdict when the head misses a native line the base had, and
  `sortEq` (sorted lines equal) as the sign of an order-only difference.
- **Finding**: Both signals fail on a row whose layout differs from native
  before the change. (1) `graphs-in` under dot is native's mirror image, so the
  port's edge `4 -> 3` carries the very `_hdraw_` and `pos` lines native gives
  `1 -> 2`. `diff` pairs lines by text, whichever statement they are in. When
  the change reordered the edges, `diff` paired another coincident pair, and
  the row read `AWAY` at 19 → 19 with no value changed. (2) `graphs-polypoly`
  under osage swaps two nodes' `pos` (an accepted divergence): the sorted lines
  equal native's, so `sortEq=yes`, though the row can never be byte-equal.
- **Impact**: For a change that moves statements, judge a row that is not
  byte-equal per statement, not per line.
  `plans/issue-149-agwrite-edge-order/harness/classify.mjs` does it: `struct`
  (outputs equal once attribute values are masked), `pureMove` (every head line
  is a base line), and `fields` (re-parse the three outputs and compare every
  (object, attribute) pair: equal to native on base, on head, lost, changed).
  Copy it beside `compare.mjs` when a mission reorders output.
- **Confidence**: High (80 rows; `comm` of the missing-line lists for
  `graphs-in`)

## Observation: 16.1.0's write_edge_test re-declared an edge in a later sibling only
- **Context**: Writing a red test for "an edge written in a subgraph is not
  written again in the root".
- **Finding**: The case was green on the base. `subgdfs` numbers a parent
  before its subgraphs, and the first subgraph takes the parent's own number,
  so `edge_last_written < preorder` never held in a parent body. The base
  re-declared an edge bare only in a later sibling subgraph that also holds it
  (probe `sibling-once`). Over 1229 corpus and golden inputs only `1514` and
  `1581` did that; the other 682 changed inputs differ in order alone.
- **Impact**: A probe for the dropped re-declaration needs two sibling
  subgraphs that share an edge. A subgraph and its parent pin the order rule
  only.
- **Confidence**: High (marker scan, `harness/results/mark.json`)

## Observation: nearly every `-Tdot` capture stored before 16.1.1 has the old edge order
- **Context**: Re-capturing fixtures after the port (ADR-0002 decision 7).
- **Finding**: 662 of 1229 inputs change bytes in `-Tdot`/`-Txdot`. A stored
  native capture from 16.1.0 fails a byte comparison after this port, whatever
  it was written to pin. The 47 that tests read were re-captured only where
  16.1.1 differs in line order alone (`recapture.sh`); a wholesale regen
  changes content in 25 more files, which belong to other 16.1.1 issues (#158).
- **Impact**: When a later 16.1.1 port re-captures a `-Tdot` or `-Txdot`
  fixture, expect the edge order to move with it, and check order-only against
  content with `recapture.sh`'s sorted-lines test before copying.
- **Confidence**: High
