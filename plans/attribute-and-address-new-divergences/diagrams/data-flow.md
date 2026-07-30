<!-- SPDX-License-Identifier: EPL-2.0 -->
# Data flow — how a diverged row earns a verdict

## The dependency chain this mission executes

```mermaid
flowchart TD
    T1["T1 · scale engine-walk budget<br/>(90s cap → cost-scaled)"]
    T2["T2 · resume-walk xdot<br/>905 → 910 rows per engine"]
    T3["T3 · attribution<br/>inject oracle positions"]
    T4["T4 · verify on json surface<br/>compareJson at ±0.5"]
    T5["T5 · re-walk json/map<br/>class absorbs verified ids"]
    T6["T6 · diagnose + maybe fix<br/>CONDITIONAL"]
    T7["T7 · dashboards + gates"]

    T1 -->|"heavy ids can now render,<br/>so they get a real status"| T2
    T2 -->|"(engine, id, status)<br/>work list"| T3
    T3 -->|"drift-exonerated"| T4
    T3 -->|"not-cleared"| T6
    T4 -->|"transferVerified: true"| T5
    T4 -->|"transferVerified: false"| T6
    T5 --> T7
    T6 -->|"tier 1/2 fix, or tier 3 escalation"| T7
```

## Why T1 gates everything

```mermaid
flowchart LR
    R["port render<br/>2621 ≈ 20.6 min (dot)"]
    C{"exceeds the<br/>90s hard cap?"}
    TO["status: timeout"]
    DV["status: diverged"]
    A["attribute-divergence.ts<br/>filters status === 'diverged'"]
    X["never attributed<br/>→ row stuck forever"]
    OK["verdict earned"]

    R --> C
    C -->|yes| TO --> A --> X
    C -->|"no (after T1)"| DV --> A --> OK
```

## The attribution experiment itself

```mermaid
sequenceDiagram
    participant H as attribute-divergence.ts
    participant O as native dot (oracle)
    participant P as port (render-one-xdot)
    participant C as compareXdot

    H->>O: -K<engine> -Txdot, GVTS_POS_DUMP=1
    O-->>H: xdot on stdout
    O-->>H: GVTS_POS / GVTS_BB / GVTS_CLUST_BB on stderr
    Note over H: keep ALL THREE prefixes.<br/>Dropping GVTS_CLUST_BB fabricates<br/>cluster-polygon diffs.
    H->>P: render with GVTS_POS_INJECT=<dump>
    P-->>H: port xdot from the ORACLE's positions
    H->>C: compare(port, oracle, tolerance)
    C-->>H: injectedDiffs
    Note over H: 0 ⇒ drift-exonerated:<br/>everything downstream of the<br/>solver is faithful.<br/>>0 ⇒ not-cleared ⇒ T6.
```

T4 repeats this identical flow with `-Tjson` / `render-one-json.ts` /
`compareJson`, which is what turns inherited evidence into earned evidence.
