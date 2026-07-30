<!-- SPDX-License-Identifier: EPL-2.0 -->
# Component map — harnesses, artifacts, and who writes what

```mermaid
flowchart TB
    subgraph src["src/ (the port) — touched ONLY by T6 tier 2"]
        PORT["layout + render"]
        HOOK["neato/splines.ts<br/>GVTS_POS_INJECT hook"]
    end

    subgraph oracle["external dependency"]
        DOT["~/git/graphviz/build/cmd/dot/dot<br/>GVBINDIR=/tmp/ghl<br/>+ session-local GVTS_POS_DUMP patch"]
    end

    subgraph walkers["test/corpus/ walkers"]
        EW["engine-walk.ts (xdot)<br/>T1 modifies"]
        JW["json-walk.ts"]
        MW["map-walk.ts"]
        SV["survey.ts (SVG)<br/>reference impl for T1"]
    end

    subgraph attrib["attribution"]
        AD["attribute-divergence.ts<br/>reads parity-&lt;engine&gt;.json<br/>status === 'diverged'"]
    end

    subgraph artifacts["committed artifacts"]
        PJ["parity.json<br/>UNIVERSE = conformant rows (910)"]
        PE["parity-{neato,fdp,sfdp}.json(l)<br/>T2 writes"]
        AT["attribution-*.json(l)<br/>T3 writes"]
        JP["json-parity-*.json(l)<br/>T5 writes"]
        MP["map-parity-sfdp.json(l)<br/>T5 writes"]
        PARITY["PARITY*.md<br/>T7 writes (sole writer)"]
    end

    subgraph accept["acceptance"]
        AC["accepted-class.ts<br/>computes membership"]
        REG["accepted-divergences-{json,map}.json<br/>NOT edited by this mission"]
    end

    DOT --> EW & JW & MW & AD
    PORT --> EW & JW & MW
    HOOK --> AD
    PJ -->|universe| EW & JW & MW
    EW --> PE
    PE -->|work list| AD
    AD --> AT
    AT -->|drift-exonerated| AC
    AC -->|accepted set| JW & MW
    REG -.->|per-id rows, union'd| AC
    JW --> JP
    MW --> MP
    PE & JP & MP & PJ --> PARITY
    SV -.->|budget pattern to mirror| EW
```

## The two facts this map exists to make obvious

1. **`parity.json` is the universe for every walker.** It defines which ids each
   track even attempts (`verdict === 'conformant'`, currently 910). That is why
   the 3 target ids were missing from the xdot tracks, and why clearing `1652`
   in PR #37 pulled it into every other track's backlog.
2. **`attribute-divergence.ts` reads `parity-<engine>.json`, not the json track.**
   Attribution is driven entirely by the **xdot** surface. Everything json/map
   accepts is inherited from that surface — which is precisely why D3 requires
   T4 to verify the transfer rather than assume it.

## Write-set ownership (no two tasks share a file)

| Artifact | Owner |
|---|---|
| `engine-walk.ts`, `engine-walk.test.ts` | T1 |
| `parity-{neato,fdp,sfdp}.json(l)` | T2 |
| `attribution-{neato,fdp,sfdp}.json(l)` | T3 |
| `evidence/json-transfer.md` | T4 |
| `json-parity-*.json(l)`, `map-parity-sfdp.json(l)` | T5 |
| `src/**` or `test/corpus/**` (conditional) | T6 |
| `PARITY*.md` | T7 |
| `accepted-divergences-{json,map}.json` | **nobody** — editing these is a stop |
