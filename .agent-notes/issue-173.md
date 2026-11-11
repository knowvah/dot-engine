# issue #173: notes from the ranksep int-division fix

## Observation: a generated-input scan finds probes a hand search misses
- **Context**: The brief said planning tried six main-graph shapes with
  `ranksep=0.32`/`0.35` and none reached the tangent window, so the defect
  looked confined to the flat-adjacent aux graph.
- **Finding**: A script that renders a cross product of small inputs
  (3 rankdirs × 9 `ranksep` values × 7 node shapes × 25 edge shapes = 4725)
  through the base and head bundles in one process, and runs native only where
  the two differ, took under a minute and found 105 main-graph inputs the fix
  moves, all to native. The node width decides whether the tangent window is
  reached: `a [width=2]; a:n -> b` changes at `ranksep=0.32`, the default
  0.75in node does not. A marker bundle then says which changed expression
  each input reaches, so one probe per expression can be pinned.
- **Impact**: Before accepting "not reachable on the main graph" or pinning
  only the issue's inputs, run such a scan. In-process renders are
  history-dependent, so confirm every pinned input in a fresh process
  (`compare.mjs`) before trusting it.
- **Confidence**: High

## Observation: a probe that reaches two changed sites does not pin either
- **Context**: Checking that each of the six truncated expressions has a test
  that needs it, by reverting one expression at a time.
- **Finding**: `a:ne -> b:sw` reaches `beginpath` (top, going right) and
  `endpath` (bottom, going left). Reverting the `endpath` expression alone left
  it passing: the `beginpath` box decided the output. `a -> b:sw` with a 3in
  head reaches only the `endpath` expression and fails when it is reverted.
- **Impact**: A marker hit shows reach, not necessity. Revert each changed
  expression alone and require a failing test.
- **Confidence**: High

## Observation: where an odd `ranksep` comes from
- **Context**: Choosing inputs and judging which corpus ids the fix can reach.
- **Finding**: `GD_ranksep` is `POINTS(ranksep)`, then
  `(GD_ranksep + 1) / 2` when the graph has edge labels (`rank.c:180`). The
  default is 36, or 18 with labels, both even. It is odd only with an explicit
  `ranksep` (0.32in = 23), a labelled graph whose value halves to odd
  (0.25in → 9, 0.07in → 3), or a flat-adjacent aux of a labelled graph with a
  labelled group (18 → 9). On the corpus one id, `1949`, reaches a changed
  half with an odd value, and its output is equal to native either way.
- **Impact**: A corpus input that sets no `ranksep` and has no labelled
  flat-adjacent group with a port cannot reach this class of difference; that
  is a static check for ids too large for a marker scan.
- **Confidence**: High
