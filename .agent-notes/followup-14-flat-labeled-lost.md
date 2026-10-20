## Observation: "handled" without spl or lost re-enters the routeDotEdges backstop
- **Context**: Post-16.1 follow-up 14 (2470/2796/2471 printed routing failures 2x native).
- **Finding**: `routeLoneEdge` (edge-route.ts) skips an edge only when `spl !== undefined`
  or `lost === true`. Any router that returns "handled" after a routesplines failure
  without setting `lost` gets routed again by the post-loop `routeDotEdges` sweep.
  `makeFlatLabeledEdge`'s pn == 0 branch was the last such site. `lost` has no other
  reader, so setting it changes stderr only.
- **Impact**: Any new router branch that consumes an edge without installing a spline
  must set `e.info.lost = true`.
- **Confidence**: High (stack traces; byte-identity over 950 dot ids).

## Observation: survey verdicts ignore warning counts
- **Context**: Deciding whether a stderr-only fix needs the 3 h survey.
- **Finding**: `test/corpus/survey.ts` reads the port's stderr only for an `errored`
  verdict (`portErrMsg`, on nonzero exit); conformance compares the SVG. A change that
  is SVG byte-identical and keeps exit status cannot move a survey verdict.
- **Impact**: For stderr-only fixes, byte-identity (SVG + console) is the deciding gate.
- **Confidence**: High (read survey.ts:360-405).
