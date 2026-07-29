<!-- SPDX-License-Identifier: EPL-2.0 -->

# Suspect components

```mermaid
graph TD
    subgraph port [dot-engine]
        ERC[layout/dot/edge-route-chain.ts<br/>chain routing]
        SRS[layout/dot/edge-route-faithful.ts<br/>faithful routesplines port]
        SR[layout/dot/splines-route.ts<br/>groups / install]
        PP[pathplan/route.ts<br/>fitter]
        CLIP[common/splines-clip.ts<br/>clip_and_install]
    end
    subgraph native [graphviz C - spec]
        DSC[dotgen/dotsplines.c<br/>+ GV_XDUMP]
        RSC[common/routespl.c<br/>+ GV_XDUMP]
        SPC[common/splines.c]
    end
    DSC -. spec for .-> ERC
    DSC -. spec for .-> SR
    RSC -. spec for .-> SRS
    RSC -. spec for .-> PP
    SPC -. spec for .-> CLIP
    REG[test/corpus/accepted-divergences.json<br/>+ docs/known-divergences.md]:::alt
    classDef alt stroke-dasharray: 5 5
```

T6a writes land in the port boxes the RCA names; T6b writes land in `REG`.
Input `2621.dot` traits that shape suspicion: rankdir=BT (frame maps),
newrank=true (aux-edge ranking — see memory `newrank-minlen0-aux-edge-calloc`),
clusters (corridor windows), huge fan-in/fan-out rows (long-edge chains —
memory `long-edge-undersegment-done`, `hub-fanin-b100`).
