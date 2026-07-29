<!-- SPDX-License-Identifier: EPL-2.0 -->

# Sentinel pipeline (per file)

```mermaid
sequenceDiagram
    participant F as file text
    participant S as scrub.mjs
    S->>F: swap "git/graphviz-ts" → ⟦P1⟧, "plans/graphviz-ts-port" → ⟦P2⟧
    S->>F: "graphviz-ts/" → "@knowvah/dot-engine/"   (specifier rule first)
    S->>F: "graphviz-ts" | "graphviz-TS" → "dot-engine"
    S->>F: restore ⟦P1⟧ ⟦P2⟧
    S-->>S: count replacements; dry-run = report only, no write
```
