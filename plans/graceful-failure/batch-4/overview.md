<!-- SPDX-License-Identifier: EPL-2.0 -->
# Batch 4: dot-engine issues and the mirror pilot

T8 and T9 run in parallel.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T8 | File dot-engine GitHub issues (the warnings channel and port bugs) | general-purpose | `plans/graceful-failure/github-issues.md` | T7 | [x] |
| T9 | Structured, contextual throws at the T7 mirror sites | typescript-pro | `src/errors.ts`, `src/errors.test.ts`, and exactly the files listed in `mirror-sites.md` | T7 | [x] |

`mirror-sites.md` is written by T7 into this directory. Gates: 1–6 (T9's
targeted sweep).
