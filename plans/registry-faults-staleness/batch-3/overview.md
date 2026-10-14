# Batch 3 — A10 into the registries, re-stage, regenerate

One task, after all of batch 2 has landed (it exercises T2's staleness test,
T3's engine join and T4's walker change together). The only oracle work in
the mission happens here, and it must be cache hits (STOP 5).

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T5](T5-a10-restage.md) | Add A10 entries; re-walk six 2784 json/map rows; regenerate dashboards | typescript-pro (or orchestrator) | registries ×3, `json-parity-circo.*`, `map-parity-{circo,twopi,neato,fdp,sfdp}.*`, affected `PARITY*.md` | T2, T3, T4 | [x] |
