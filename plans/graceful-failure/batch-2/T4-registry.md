<!-- SPDX-License-Identifier: EPL-2.0 -->
# T4: Generate the failure-site registry and add the fitness test

## Context

T3 built `test/tools/failure-sites/` (the scanner, its `FailureSiteRow`
contract, and the CLI). This task generates the committed registry and adds
the fitness test that keeps it complete (D5).

## Task

1. Run the CLI over `~/git/graphviz-16.1.1/lib` and `src/`, writing
   `test/corpus/failure-sites.json`.
2. Hand-seed 7 rows with `c.kind: 'native-crash'`. Each has
   `links.divergence` set to its `docs/known-divergences.md` anchor (or the
   GitHub issue), `port.behaviour: 'renders'`, and class `graceful`:
   - A13: `lib/common/emit.c#emit_background`, the freed fill colour;
   - the 5 items under "Native crashes and heap-address variation
     (part 10)":
     - `stress.c` directions,
     - `mode=hier dim=3` heap corruption,
     - fdp pointer comparisons in `fdpgen/layout.c`,
     - `xdotBB` with a NULL span in `neatoinit.c`,
     - neato on a subgraph;
   - #266: `lib/common/output.c#canon`, a use-after-free.
   For any item whose C site is not proven in the doc, say so in the note:
   "site not proven".
3. Write `test/corpus/failure-sites.test.ts` (vitest; write it first,
   red, then generate):
   - every `throw new (InternalError|RenderError|Error)(` in `src/**/*.ts`
     (excluding `*.test.ts`) has a row whose `port.file` + `port.symbol`
     match. The test re-scans `src/` with T3's `scanPort`;
   - row ids are unique, and no id contains a line number;
   - every row with `class` `graceful` or `upstream-fix` has a non-empty
     `note`.

## Write-set

`test/corpus/failure-sites.json`, `test/corpus/failure-sites.test.ts`.

## Read-set

- `test/tools/failure-sites/scan.ts` (exports only)
- `docs/known-divergences.md`: A13 (around line 1247) and part 10 (around
  line 1451)
- GitHub issue #266 (`gh issue view 266`)

## Acceptance criteria

- Given the scanner run, when the registry is written, then every port
  `throw new (Internal|Render)?Error` has a row.
- Given the 7 seeded rows, when loaded, then each has
  `c.kind: 'native-crash'` and `links.divergence`.
- Given a new unregistered throw added to `src/` (tested with a temporary
  fixture copy, not a real `src/` edit), when the fitness test runs, then
  it fails and names the file and symbol.
- Given ids keyed by function, when a C line shifts, then the ids are
  unchanged (unit-tested in T3; asserted here only as "no digits from
  `c.line` in the id").

## Observability

The registry's per-class counts are printed by the CLI and recorded in the
journal.

## Rollback

Reversible.

## Commit

`test(corpus): add failure-site registry and fitness test`
