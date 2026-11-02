# Component map

The components each task touches, labelled with task IDs, and the existing seams they
reuse: `src/vpsc/` (VPSC solver), `compute-hierarchy.ts` (part 4),
`resolveFillColorName` (part-5 T11), `render-usershape.ts` (part-6 T4).

```plantuml
@startuml
skinparam componentStyle rectangle
package "neato ipsep" {
  [init.ts solveStress\n(dispatch, T10)] as INIT
  [start.ts guards\n(ipsep guard removed, T10)] as START
  [ipsep-opts.ts\ncluster_map + options (T8)] as OPTS
  [stress-cola.ts\nstress_majorization_cola (T8)] as COLA
  [stress-models.ts · circuit · matinv · lu\n(T7)] as MODELS
  [quad-prog-vpsc(-overlap).ts\n(T5)] as QPV
  [vpsc-adjust.ts\n(calls removeoverlaps, T5)] as VADJ
  [stress-kernel.ts\nkD kernel (T1; cola removed T10)] as SK
  [src/vpsc Solver / IncVPSC] as VPSC
}
package "shapes and images" {
  [shapes.ts bindShape / userShape\n(T2, safefile T9)] as SH
  [poly-init.ts\n(usershape keying, T2)] as PI
  [safefile.ts (T9)] as SF
  [graph-init.ts Gvimagepath (T9)] as GI
  [usershape.ts\nFT_NULL (T6) · unsafe (T9)] as US
  [image-type.ts imagetype (T6)] as IT
  [render-usershape.ts\ngvloadimage warning (T6)] as RU
}
package "render" {
  [poly-gencode.ts point fill (T3)] as PG
  [arrow-fill site (T0 names, T3)] as AF
  [color-resolve.ts\nresolveFillColorName] as CR
  [svg.ts usershape\nrotation (T4)] as SVG
  [json.ts collectDrawLookup\n(json target, T6)] as JS
}
INIT --> START : assertSupported
INIT --> OPTS : ipsepOptions(mg, g)
INIT --> COLA : MODE_IPSEP
COLA --> MODELS : subset / circuit Dij
COLA --> QPV : initCMajVPSC / solve
COLA --> SK : shared fused CG only
QPV --> VPSC : variables, constraints
VADJ --> QPV : removeoverlaps
PI --> SH : bound usershape flag
SH --> SF : safefile(shapefile)
US --> SF : null → "unsafe"
SF --> GI : reads imagepath
US --> IT : resolver bytes
RU --> IT : stringtype:target
JS --> RU : nested render, json target
RU --> SVG : <image>
PG --> CR : cut at ':'
AF --> CR : edge fillcolor
@enduml
```
