# Component map

Components each task touches (task IDs on the components) and the part-5 seams they
reuse: `usershape.ts` sizing (part 5 T14), `resolveFillColorName` (part 5 T11),
`conjgrad-mkernel.ts` (part 5 T15).

```plantuml
@startuml
skinparam componentStyle rectangle
package "Layout" {
  [nodeinit.ts commonInitNode\n(poly_init warnings, T1)] as NI
  [poly-init.ts polyInit\n(render-time, warning-free, T1)] as PI
  [stress-kernel.ts COLA_OPS (T3)] as SK
  [conjgrad-mkernel.ts] as CG
}
package "Images" {
  [usershape.ts\nsizer / resolver] as US
  [render-usershape.ts\ngvrender_usershape (T4, new)] as RU
}
package "Render" {
  [device.ts render] as DEV
  [poly-gencode.ts\nfill (T2) · usershape_p (T4)] as PG
  [device-cluster.ts fill (T2)] as CLU
  [htmltable-emit.ts emitHtmlImg (T4)] as HE
  [color-resolve.ts\nresolveFillColorName] as CR
  [json.ts collectDrawLookup] as JS
}
package "Renderers" {
  [svg.ts usershape\n(core_loadimage_svg)] as SVG
  [dot.ts xdot usershape\n(core_loadimage_xdot, T4)] as XD
}
package "Docs" {
  [guide browser / images / api\n+ 23 locales (T5)] as DOC
}
NI --> US : sizes image= / warns once
DEV --> PI : binds shapes per render
JS --> DEV : nested xdot render
DEV --> PG : emits nodes
DEV --> CLU : emits clusters
PG --> CR : empty fill name
CLU --> CR : empty fill name
PG --> RU : node image
HE --> RU : HTML IMG
RU --> US : found? size at job dpi
RU --> SVG : <image>
RU --> XD : I op
SK --> CG : fused CG; rightMult per T3 verdict
DOC ..> US : documents unit and dpi
@enduml
```
