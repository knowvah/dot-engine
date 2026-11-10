# Data flow: a no-free relayout and the per-render resets

Layout 2 runs on the records layout 1 left, but every registered static starts
again at its reset value. An S static is one whose reset value meets a stale
record field (here `Cmark` against `ND_mark`).

```plantuml
@startuml
participant Caller
participant "GvcContext.layout" as L
participant "resetRenderState" as R
participant "layout-reset.ts" as LR
participant "engine (dot)" as E
database "records (g.root.info, n.info)" as Rec

Caller -> L : layout(g) #1
L -> R : run 23 modules' resets
L -> E : lay out
E -> Rec : write ND_mark, ranks, splines
Caller -> L : layout(g) #2 (no freeLayout)
L -> R : statics back to reset values
L -> LR : layoutWasFreed(g)? no: keep records
L -> E : lay out
E -> Rec : read stale fields
note right of E
  S: static (reset) compared with a stale field
  M: static assigned before any read
  N: static reads no record
end note
@enduml
```
