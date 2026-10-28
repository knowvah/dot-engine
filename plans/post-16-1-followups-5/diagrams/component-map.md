# Component map

Components each task touches (task IDs on the components) and the part-3/part-4
primitives this mission extends: `agerr` (T1 → T11), `render-state` (T2), `attr-get`
(T9 → T16), `conjgrad-mkernel` (T15), `first-layer` (T12).

```plantuml
@startuml
skinparam componentStyle rectangle
package "Primitives" {
  [agerr.ts (T1)] as AG
  [render-state.ts /\nlayout-state.ts (T2)] as RS
  [fma.ts (T3)] as FMA
  [cgraph-ops agNameOf (T4)] as NM
  [attr-get.ts] as ATG
}
package "Style / colour" {
  [style-resolve styleTokens (T5)\nfindStopColor (T11)] as ST
  [gvrender-set-style (T5)] as GSS
  [multicolor parseSegs (T11)] as MC
  [color-resolve (T11)] as CR
  [htmltable-emit-fill (T11)] as HF
}
package "Render loop" {
  [device.ts edges (T5)\nlayers (T12) · cluster (T16)] as DEV
  [device-cluster (T9, T16)] as CLU
  [layers.ts / first-layer.ts (T12)] as LAY
  [json.ts (T7)] as JS
}
package "Labels / images" {
  [htmltable-lex-attvalue (T8)] as LEX
  [htmltable / make-label (T14)] as HT
  [poly-sizing / poly-init (T14)] as PS
  [usershape (T14)] as US
}
package "Layout" {
  [postproc translateDrawing (T2)] as PP
  [engine cleanup ×7 (T13)] as CLN
  [neato init / edge-len /\nmake-graph-data (T10)] as NI
  [stress-kernel /\nconjgrad-mkernel (T15)] as SK
}
package "Docs" {
  [errors.md ×24 (T6)] as DOC
}
MC --> AG : partial line
ST --> MC
HF --> MC
CR --> AG
GSS --> ST : tokens
DEV --> GSS
DEV --> LAY
CLU --> ATG : snapshot
DEV --> CLU
PP --> RS : State
NI --> NM : agNameOf
NI --> SK : opts (checkExp)
SK --> FMA
HT --> US
PS --> US
@enduml
```
