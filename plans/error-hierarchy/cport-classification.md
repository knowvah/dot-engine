# C-port throw-site classification rules (T4, T5)

C never throws. Every `throw new Error(...)` in a ported file translates something C
does, and ADR-4 maps it by what C does at that point. Classify **each site against
its C source** before changing it.

## Procedure per site

1. Find the C origin via the file's or function's `@see` tag (C source at
   `~/git/graphviz/lib/`). Read the C at that point.
2. Classify:

| C at the site | New throw |
|---|---|
| `assert(...)` / `assert(0)` / `UNREACHABLE()` | `new InternalError(<same message>)` |
| C++ `throw std::runtime_error` / `throw "..."` not caught on that path | `new InternalError(<same message>)` |
| `agerr…(...)` / `agerrorf(...)` then `graphviz_exit(EXIT_FAILURE)` / `exit(1)` | `new RenderError(<same message>, 'RENDER_ERROR')` |
| no C counterpart, **triggered by a graph attribute/shape the port has not implemented** (C would honour it): e.g. sfdp `smoothing=`/`rotation=`, fdp overlap modes, special shapes | `new RenderError(<same message>, 'UNSUPPORTED_FEATURE')` (ADR-4a) |
| no C counterpart: port scaffolding / own invariant ("not yet registered", "missing rdata", "unreachable" default) | `new InternalError(<same message>)` |
| C **continues** (returns NULL/-1, logs a warning and carries on, falls back) while the port throws | **STOP** (README stop condition 5). Journal the site and C reference; change nothing. |

3. Change **only** the constructor at the throw: same condition, same position, same
   message string. No reordering, no new branches (stop condition 6).
4. Add or extend the `@see` on the enclosing function if the C reference was missing.
5. Return one table row per site for `../reclassification.md`:
   `| file:line | C file:line | C behaviour | Error | InternalError/RenderError | Tn |`

## Tests

One test file per task (`src/errors.cport-a.test.ts` / `src/errors.cport-b.test.ts`).
Where a site can be driven with a small input or a direct call of the exported
function, assert the thrown class and `code`. Where it cannot (deep invariant),
skip it and journal "not triggerable: <reason>". Do **not** add exports to production
files just to reach a site.
