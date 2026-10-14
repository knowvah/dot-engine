# Batch 3 — close the ratchet, then the ledgers and docs

Sequential. T12 empties `known-failing.json` (fix, or accept with a comparison
page). T13 then brings registries, `known-divergences.md`, CLAUDE.md and the ADR
in line with the final state.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T12 | Residual ratchet: diagnose every remaining entry + survey residue; fix or accept | debugger (model: opus) | `src/**` per diagnosis (journal each file), tests, `known-failing.json`, `comparisons/*` | T7–T11 | [x] |
| T13 | Registries, known-divergences.md, CLAUDE.md oracle line, ADR 0001 | documentation-engineer | `test/corpus/accepted-divergences*.json`, `docs/known-divergences.md`, `CLAUDE.md`, `docs/adr/0001-graphviz-16.1-oracle.md`, registry tests | T12 | [x] |

Specs: [T12](T12-residual-ratchet.md) · [T13](T13-registries-docs.md)
