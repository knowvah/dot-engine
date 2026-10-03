# Batch 2a: parse errors, registry, C-port sites A

All depend only on T1; write-sets are disjoint from each other and from batch 2b, so
2a and 2b may run as six parallel agents.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T2 | `ParseError`/`HtmlParseError` extend base; `parse()` arg check | typescript-pro (sonnet) | `src/parser/index.ts`, `src/parser/index.test.ts`, `src/common/htmltable-types.ts`, `src/common/htmltable-types.test.ts` | T1 | [x] |
| T3 | `GvcContext` registry: usage errors + `UNKNOWN_LAYOUT` | typescript-pro (sonnet) | `src/gvc/context.ts`, `src/gvc/context.test.ts` | T1 | [x] |
| T4 | C-port throw sites, group A (14) | typescript-pro (sonnet) | `src/layout/neato/cdt-surface.ts`, `src/layout/neato/multispline-router.ts`, `src/vpsc/Solver.ts`, `src/ortho/ortho-parallel.ts`, `src/ortho/trap-query.ts`, `src/errors.cport-a.test.ts` | T1 | [x] |

| T4b | Port GTS behaviour at cdt-surface 401/485 + missing g_asserts (owner option B) | executor | `src/layout/neato/cdt-surface.ts`, `src/layout/neato/cdt-surface.crossing.test.ts`, `src/layout/neato/cdt-surface.branch.test.ts` | T4 | [x] |

Specs: [T2](T2-parse-errors.md) · [T3](T3-registry.md) · [T4](T4-cport-sites-a.md) · [T4b](T4b-cdt-faithful.md)

T4 and T5 both append rows to `../reclassification.md`. To avoid concurrent writes,
**the executor (not the agents) appends those rows** from each agent's returned table.
