# Data flow: where an odd `ranksep` comes from and where it is read

The repro path: a labelled graph with a flat-adjacent group in `rankdir=LR`.

```plantuml
@startuml
title ranksep from the attribute to the end box (current, port)
participant "graph-init.ts\nparseSepAttrs" as GI
participant "rank.ts:171\nedgelabel_ranks" as ER
participant "splines-flat.ts:72\naux graph copy" as AUX
participant "rank.ts:171\n(aux) edgelabel_ranks" as ER2
participant "splines-path-begin/end\nbeginPath / endPath" as BP
participant "routesplines\nsplinefits" as RS

GI -> ER : ranksep = POINTS(0.5) = 36
ER -> ER : (36 + 1) / 2 = 18 (floor)
ER -> AUX : ranksep 18
AUX -> ER2 : aux has labels
ER2 -> ER2 : (18 + 1) / 2 = 9 (floor)
ER2 -> BP : ranksep 9 (odd)
BP -> BP : end box UR.y = y + ht/2 + 9/2
note right of BP
  C: 9/2 = 4 (int)
  port: 4.5 (float), the defect
end note
BP -> RS : box 0 is 0.5 taller
RS -> RS : first tangent accepted\n(native halves it)
@enduml
```

The sibling, `position-aux.ts:201`, reads `nodesep` the same way, but
`ED_minlen` is even whenever it is reached (decisions.md, AD-2).
