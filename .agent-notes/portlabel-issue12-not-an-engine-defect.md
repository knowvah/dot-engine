# Issue 12 (`taillabel`/`headlabel` centres) — NOT an engine defect

## Observation: dot-engine's port-label placement is byte-exact vs the oracle

- **Context**: plantuml-ts `docs/graphviz-issues/12-port-label-placement-near-
  head-node.md` reports that `getLayout()` returns `taillabel`/`headlabel`
  centres that "do not match real graphviz" — head label placed ~3px from its
  node where graphviz clears ~14.4px. Filed as their ledger M41/B32 against
  fixture `object/tobuka-93-jale775` (41 diffs).
- **Finding**: the engine matches the canonical oracle
  (`~/git/graphviz/build/cmd/dot/dot`, `GVBINDIR=/tmp/ghl`) exactly. Four
  independent forms, all **byte-identical** geometry:
  1. the issue's own repro DOT (HTML `FIXEDSIZE` tables, empty cells);
  2. the same with plain-text `taillabel="1" headlabel="*"`;
  3. the same with text inside the HTML tables;
  4. **the fixture's real input** — `test-results/dot-cache/object/
     tobuka-93-jale775/svek-1.dot`, the jar's own emitted svek DOT, 7 port
     labels. Every `points="…"` and every `d="M…"` identical.
- **Impact**: there is nothing to fix in this repo for issue 12. Do not go
  looking in `splines-label.ts`, `straight-edges.ts`, or `label/xlabels.ts`.
- **Confidence**: High.

## Observation: `place_portlabel` is not even on this code path

- **Context**: the obvious suspect is `place_portlabel` (PORT_LABEL_DISTANCE
  10, PORT_LABEL_ANGLE -25).
- **Finding**: C returns 0 immediately unless `labelangle` or `labeldistance`
  is set — `lib/common/splines.c:1321-1327`, and `makePortLabels` has the same
  gate at `:1206`. Neither attribute appears in PlantUML's svek DOT, so both
  native and port route these labels through the **xlabel placer**
  (`postproc.c:addXLabels` → anchor `edgeTailpoint`/`edgeHeadpoint`, a
  zero-size object at the spline endpoint). The port's `noAngleAttrs` guard
  (`splines-label.ts:239-245`) mirrors the C gate correctly.
- **Impact**: any future port-label divergence should be instrumented in the
  xlabel placer, not in `place_portlabel`, unless the input sets those attrs.
- **Confidence**: High.

## Observation: the residual is a per-END sign error in the consumer's conversion

- **Context**: the fixture still measures 41 diffs after issue 13's
  `tailLabel`/`headLabel` landed and plantuml-ts migrated to it (their
  `de0547c3`). Measured here directly via `renderFixtureClass` + `compareSvg`.
- **Finding**: all 41 are port-label `<text>` x/y — 14 y, 14 x, 13 other. Every
  y delta is **≈6.63 = half the 13pt label-box height**, but with **opposite
  signs for the two ends of each edge**: `text[1]` (head) needs +6.63,
  `text[2]` (tail) needs −6.63. `portLabelAnchor`
  (`src/diagrams/class/class-edge-geo.ts:202-223`) applies ONE formula
  (`y = center.y - m.height/2 + baselineOffset`) to both ends, and one formula
  fed correct centres cannot produce opposite-signed errors. The jar draws
  these labels itself — graphviz only reserves an empty FIXEDSIZE table box
  (the oracle render of `svek-1.dot` contains **zero** `<text>`) — so the rule
  to mirror is upstream `SvekEdge.java`'s per-end text placement, not
  graphviz's.
- **Impact**: issue 12 belongs in plantuml-ts, not here. Their own
  falsification ("conversion is uniform +10.611 for both, so it is innocent")
  tested uniformity, which does not imply correctness — and the true
  baseline−centre offset measured here on their label shape is **−11.502
  (tail) / −11.495 (head)**, uniform at ≈11.50, not 10.611.
- **Confidence**: High for the engine-side exoneration and for the ±half-height
  opposite-sign measurement; Medium for naming `SvekEdge.java` as the specific
  upstream rule to port, which was not read.

## Observation: plantuml-ts's `node_modules/@knowvah/dot-engine` is a local build

- **Context**: comparing against the "pinned 1.3.0" to date the regression.
- **Finding**: that directory was replaced at 08:22 on 2026-08-13 with a build
  of THIS working tree — `dist/api.js` contains `placedLabelPos`, added in this
  session and not yet published. A "pinned 1.3.0" measurement taken there is
  circular.
- **Impact**: when dating a consumer-side regression, verify the installed
  package is a release before treating it as one.
- **Confidence**: High.
