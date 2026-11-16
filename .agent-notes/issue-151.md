# issue-151: comparing a port render with native on huge-coordinate inputs

## Observation: Python's json makes equal doubles look different
- **Context**: structural json comparison of the head bundle against native
  16.1.1 on the 277x family (coordinates near 7e17).
- **Finding**: native writes `728600938806190464.000`; the port's `-Tjson`
  writes the same double as `728600938806190500`. Python's `json.loads` reads
  the first as a float and the second as an exact int, and `int != float`
  there, so every large coordinate is reported as a difference. Parsing both
  sides with `parse_int=float` (or comparing in JS) removes them.
- **Impact**: a structural json check written in Python reports false diffs on
  any input whose coordinates exceed 2^53.
- **Confidence**: High

## Observation: the port prints `syntax ambiguity` warnings too
- **Context**: stderr comparison through `test/tools/bd-job.ts`.
- **Finding**: both sides print `Warning: syntax ambiguity - badly delimited
  number …`. Native names the file (`in line 9 of /…/2773.dot`), the port
  reads a string and says `in line 9 of input`. With the file name normalised
  to `input`, the lines are equal and in the same position; dropping them from
  one side only shows up as extra port lines.
- **Impact**: normalise the name, or drop the lines from both sides.
- **Confidence**: High
