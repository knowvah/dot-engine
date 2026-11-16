# issue-150 mission — observations (2026-11-16)

## Observation: `2108` sits at the edge of bytediff's 120 s cap
- **Context**: gate 6 of #150 ran `test/tools/bytediff.ts` on 19 ids (dot; svg, xdot, plain) with
  the default 5 lanes and `BD_CAP_MS=120000`, at a load average of 12 to 19.
- **Finding**: the three `2108` jobs capped: plain and svg `TIMEOUT` on the base and `ok` on the
  head, xdot `TIMEOUT` on both. Nothing in the change reaches `2108` differently (55679
  `updateBbBz` calls, none past depth 10). One `2108` render takes about 96 s in the port with two
  processes running (base 96.56 s, head 95.72 s, same bytes). A lane runs the base first, while
  the other lanes are still busy, and the head after the short jobs have drained, so the base
  side crosses the cap first. `BD_CAP_MS=270000 BD_LANES=2` on `2108` alone: identical, 0 capped.
- **Impact**: a one-sided cap on `2108` (or any id that renders in more than about 80 s) is a
  timing artifact until an isolated run says otherwise. Give such ids their own bytediff run
  with a higher cap and fewer lanes. Native 16.1.1 renders `2108` `-Tplain` in 11.5 s.
- **Confidence**: High
