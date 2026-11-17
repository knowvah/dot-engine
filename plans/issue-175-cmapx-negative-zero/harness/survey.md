<!-- SPDX-License-Identifier: EPL-2.0 -->
# Planning survey: issue #175

Base `5993dc50` bundle against native 16.1.1, `node compare.mjs <base> - <files>`,
formats `cmapx,cmapx_np,imap,imap_np`, run on 2026-11-17.

**Selection.** Every corpus input under `~/git/graphviz-16.1.1/tests` that sets
`URL`, `href` or `tooltip` ([survey-ids.txt](survey-ids.txt), 41 files, from
`grep -rlE '\b(URL|href|tooltip)\s*=' --include=*.gv --include=*.dot`). Only
inputs with an anchor reach `map_output_shape` with an area. The 18 of them
under 60 kB ([survey-small.txt](survey-small.txt)) also run under neato and fdp.

**Partial.** The run stopped at 12 of 41 files under dot and 4 of 18 under
neato/fdp when the machine load reached 14 (another project's tests), per the
queue rules' limit of 12. Gate 6 runs the whole selection.

| input | engines | rows not byte-equal on base | cause |
|---|---|---|---|
| `1880.dot` | dot | cmapx, cmapx_np: 1 line | graph area `coords="0,-0,..."` (this issue) |
| `2258.dot` | dot, neato, fdp | cmapx 4 lines, cmapx_np 3 | graph area `-0` (this issue) and the `G2_` id prefix (#176) |

Every other row reached was byte-equal: `1425`, `1425_1`, `1447`, `1447_1`,
`1879`, `2413_1`, `2413_2`, `2497`, `2619_1`, `2619_2` under dot, `1425`,
`b155` and `1425_1` under neato and fdp. Expected after the fix: `1880.dot`
byte-equal; `2258.dot` keeps only the #176 lines (toward-native).
