# dot-engine — Claude Code Instructions

## Mission

A faithful TypeScript port of [Graphviz](https://gitlab.com/graphviz/graphviz).
The C source at `~/git/graphviz` is the **canonical specification**. The port is
consumed as a library and must run in a browser (no Node.js-only APIs).

Keep the `plans/` contents — they are the archaeology of this effort.

## The C Source Is Sacred

Decades of user-reported bugs and layout quirks are encoded in the C. Rules:

- **Do not optimize or simplify algorithms.** If the C looks redundant or odd,
  preserve it exactly — the oddity is almost certainly load-bearing.
- **Port every branch.** Special cases exist because someone hit them.
- **Keep function boundaries.** Split or merge only where TypeScript forces it
  (e.g., no pointer arithmetic).
- **Do not reorder logic.** Side-effect order is often intentional; note any
  deviation explicitly.
- **Port the tests too.** Every C test encodes a known correct behavior.

When in doubt, read the C. Still in doubt: keep the C behavior and document the
question. On any divergence, instrument the C and dump actual values before
hypothesizing — the default stance is "my port differs — find where."

Carve-out ([ADR-0003](docs/adr/0003-upstream-fix-forward.md)): only a fix whose
upstream MR has been filed, and which is carried in
`test/corpus/oracle-patches/`, may change port behaviour. Until then keep the
C behavior. The maintainer reads every line and files every MR.

## Verification

- Oracle = the **carried build**: graphviz 16.1.2 plus
  `test/corpus/oracle-patches/*.patch`, binary
  `/Users/scottseely/git/sseely/graphviz-carried-1612/build/cmd/dot/dot` with
  `GVBINDIR=/tmp/ghl1612-carried` for dot and `/tmp/ghl1612-carried-all` for
  the other engines, built by `test/corpus/build-carried-oracle.sh` (never
  WASM; homebrew dot is only a cross-check, never the oracle — ABI mismatch).
  Locations live in `test/corpus/oracle-paths.mjs`. See
  `docs/adr/0004-graphviz-16.1.2-oracle.md` (the version) and
  `docs/adr/0003-upstream-fix-forward.md` (the carried patches). Pristine
  16.1.2, `~/git/graphviz-16.1.2/build/cmd/dot/dot` (branch `oracle/16.1.2`,
  `GVBINDIR=/tmp/ghl1612` and `/tmp/ghl1612-all`), is the bisect build for a
  suspected patch effect, and the build attribution runs against. The 16.1.1
  builds are kept only for bisecting a 16.1.1 → 16.1.2 change: carried
  `~/git/sseely/graphviz-carried` (`/tmp/ghl1611-carried`,
  `/tmp/ghl1611-carried-all`) and pristine `~/git/graphviz-16.1.1`
  (`/tmp/ghl1611`, `/tmp/ghl1611-all`). The 16.1.0 build
  `~/git/graphviz/build/cmd/dot/dot` (`GVBINDIR=/tmp/ghl`) and the 15.x
  build `~/git/graphviz-15` (`GVBINDIR=/tmp/ghl15`) are older references.
- Conformance bar = xdot/SVG comparison at 0.01 tolerance (deterministic
  engines). Byte-exactness is not required; structural match is progress.
- Gates before any commit: `tsc --noEmit` clean, `npm test` green, golden
  cross-product monotonic, corpus sweep with **0 regressions**.
- Gate before opening a PR: `npm run codeql:gate` exits 0. It runs GitHub's
  two CodeQL checks locally on the committed HEAD: code scanning (same 4
  languages and suites) and Code Quality (javascript, python). A false
  positive goes in `.github/codeql/dismissed.json` (rule, path, message,
  reason) only with the maintainer's agreement; never change code just to
  silence a finding.
- Sweep discipline: never edit `src/` while a sweep runs (it reads live
  source). Resume-style sweeps skip once-passing ids and hide regressions —
  run a fresh (deleted-JSONL) sweep before committing routing changes.
- Journal every fix in `plans/decision-journal.md`.

## Translation Rules

| C concept                | TypeScript                                     |
| ------------------------ | ---------------------------------------------- |
| `int`/`long`, `double`   | `number` (mind precision > 2^53)               |
| `char *` string / buffer | `string` / `Uint8Array`                        |
| `struct`                 | `interface` (prefer) or `class`                |
| `void *`                 | `unknown` or a typed union                     |
| `FILE *`                 | abstract `Writer` interface                    |
| Pointer arithmetic       | array + index, or `DataView` for packed binary |
| `NULL`                   | `null` (prefer over `undefined` for pointers)  |
| `#define` / function ptr | `const` / typed function type                  |

Hazards proven in this port: C `calloc` zeroes fields — an optional TS field
left `undefined` inverts `!= 0` guards (coerce `?? 0`); C `int` assignment
truncates; `round()` is half-away-from-zero, not `Math.round`.

- **Browser-safe only**: no Node built-ins, no `process.env` in library code,
  ES modules only. If the C reads a file, take the data as a parameter.
- **Memory**: mirror the C's mutation contract; avoid GC pressure in hot loops
  (reuse objects / typed arrays).
- **Naming**: `snake_case` → `camelCase`, macros → `UPPER_SNAKE_CASE`; keep
  names recognizable (`agnode` → `agNode`). Every ported symbol carries
  `/** @see cgraph/graph.c:agopen */`.
- **YAGNI, strictly**: no new patterns, options, or "improved APIs" the C does
  not have. Idiomatic wrappers are a separate layer.

## C Source Map (`~/git/graphviz/lib/`)

`cgraph` core graph · `dotgen` dot · `neatogen` neato/fdp · `circogen` circo ·
`osage` osage · `sfdpgen` sfdp · `pathplan` edge routing · `common` shared
render/labels · `gvc` context/pipeline · `cdt` containers · `ast` strings

## Quality Bar

- TypeScript strict mode; no `any` except documented C-interop boundaries.
- 90% line/branch/function coverage per `testing.md`; ported C tests must pass.
- Bundles for the browser (esbuild/vite) with zero Node shims.
- A mission/batch with any quarantined or excluded case is not complete until
  its comparison page exists and is referenced in the decision journal.

## License

EPL-2.0 (same as upstream). Every source file carries
`// SPDX-License-Identifier: EPL-2.0`. No dependencies incompatible with
EPL-2.0 (e.g., GPL-3.0-only).
