# Batch 2: unported features (parallel, one agent per engine area)

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T5 | sfdp: loud `quadtree=none\|fast`, `label_scheme>0` | typescript-pro (sonnet) | `src/layout/sfdp/init.ts`, `src/layout/sfdp/spring-driver.ts` (added by owner 2026-10-02), `src/layout/sfdp/fidelity.test.ts` | batch 1 | [x] |
| T6 | neato init: port `start=regular`; loud `start=self`, `model=subset\|circuit`, `mode=hier\|ipsep` | typescript-pro (sonnet) | `src/layout/neato/init.ts` (shrink only), `src/layout/neato/start.ts`, `src/layout/neato/start.fidelity.test.ts`, `src/layout/neato/init.fidelity.test.ts`, `src/layout/neato/init.branch.test.ts` (owner-approved 2026-10-02) | batch 1 | [x] |
| T7 | neato: loud `overlap=voronoi` | typescript-pro (sonnet) | `src/layout/neato/fdp-adjust.ts`, `src/layout/neato/overlap-voronoi.test.ts` | batch 1 | [x] |
| T8 | fdp: port the `fdpSplines` dispatch; loud `splines=compound` | typescript-pro (sonnet) | `src/layout/fdp/index.ts`, `src/layout/fdp/splines-dispatch.test.ts` | batch 1 | [x] |

Each loud-check commit is `feat(<engine>)!:` with a `BREAKING CHANGE:` footer naming
the attributes. Then the corpus gate (batch-2 allowed list).
