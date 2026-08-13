# Issue 11 (flat-edge label width vs nodesep) — NOT an engine defect

## Observation: the engine DOES grow the gap with the label width

- **Context**: plantuml-ts `docs/graphviz-issues/11-flat-edge-label-width-
  ignored-in-nodesep.md` reports that for a `minlen=0` edge the engine spaces
  the two nodes a constant 60.425 apart "regardless of the edge label's width",
  where real graphviz gives `labelWidth + 34.4`. Filed as their ledger M39/B34.
- **Finding**: on the issue's own repro DOT the engine is **byte-identical to
  the oracle** (`~/git/graphviz/build/cmd/dot/dot`, `GVBINDIR=/tmp/ghl`) — same
  node polygons, same spline, same label-table polygons — and the gap tracks
  the width at every value tested:

  | `WIDTH=` | oracle gap | engine gap |
  |---|---|---|
  | 0 | 46.425 | 46.425 |
  | 29 | 63.425 | 63.425 |
  | 200 | 234.425 | 234.425 |
  | 400 | 434.425 | 434.425 |

  63.425 at `WIDTH="29"` is exactly the jar value the issue quotes as expected.
- **Impact**: nothing to fix in this repo. `gap = WIDTH + 34.425` holds on both
  sides.
- **Confidence**: High.

## Observation: the reported constant comes from varying a field the builder ignores

- **Context**: their measurement was "the same graph fed to `layoutGraph()` four
  times, varying only `labelWidth`" — the builder API, not DOT text.
- **Finding**: two different label paths exist in their wrapper
  (`src/core/graph-layout-build-edges.ts:84-121`). With `labelBoxWidth`/
  `labelBoxHeight` set it emits `setHtmlAttr('label', '<TABLE FIXEDSIZE …
  WIDTH=… HEIGHT=…>')`; otherwise it falls to `attrs.label = a.label`, a
  **plain-text** label. That second path is what the class/object pipeline
  takes — the comment at `:74-77` says the box path is "currently only the
  state composite pipeline". `labelWidth` (the field they varied) is read only
  by the DOT *emitter*, `svek-dot-emit.ts:175-176`, which is a comparison
  artifact, not the engine's input.

  Reproduced on the engine's own builder API — varying the caller's
  `labelWidth` while the label string stays fixed gives a flat gap, exactly the
  reported shape; encoding the width in the HTML table tracks it:

  | | 0 | 29 | 200 | 400 |
  |---|---|---|---|---|
  | plain-text label, varying `labelWidth` | 47.425 | 47.425 | 47.425 | 47.425 |
  | HTML `FIXEDSIZE` table `WIDTH=` | 46.425 | 63.425 | 234.425 | 434.425 |
- **Impact**: issue 11 belongs in plantuml-ts. The fix is to route class/object
  edge labels through the same `labelBoxWidth`/`labelBoxHeight` → HTML-table
  reservation the state-composite pipeline already uses, so the engine receives
  the same box the DOT emitter writes.
- **Confidence**: High.

## Observation: on the plain-text path the residual is text measurement, ~2-3pt

- **Context**: what the plain-text path actually costs, since that is what the
  affected fixtures run through today.
- **Finding**: the engine does size a plain-text label — it measures the string
  — and lands a little under the jar:

  | label | engine gap | jar gap | delta |
  |---|---|---|---|
  | `ab` | 47.425 | 50.425 | 3.0 |
  | `label` | 61.425 | 63.425 | 2.0 |
  | `aVeryMuchLongerEdgeLabelHere` | 229.425 | 232.425 | 3.0 |

  Not a constant, so it is per-string text measurement (plus PlantUML's own box
  margins), not a missing separation term. Via the HTML table the same cases
  are exact.
- **Impact**: explains why the symptom looked like "constant" — the gap only
  looks frozen when the string is held fixed and a size field the path ignores
  is varied.
- **Confidence**: High.

## Observation: no engine API gap behind this

- **Finding**: graphviz sizes an edge label from its text or its HTML only;
  there is no `fixedsize` for edge labels. The HTML `FIXEDSIZE` table IS the
  canonical way to reserve a box, and the builder already exposes it through
  `setHtmlAttr`, which the consumer uses elsewhere.
- **Impact**: no counterpart to issue 13 here — nothing to add to the API.
- **Confidence**: High.

## Note on the secondary symptom

The filing also records nodes sitting 0.389px higher than the jar (`y=7` vs
`y=7.389`) on the same repro. Not reproducible against the oracle either: the
engine's node polygons match it exactly on that input. Same expected cause —
the plain-text path also loses the label's declared `HEIGHT="15"`.
