# Component map: modules T1 touches

```plantuml
@startuml
title viewport consumers (head)
package "src/gvc" {
  [viewport.ts\nJobViewport, jobViewport,\nsetupPageClip, setupPageSize] as VP
  [job.ts\nRenderJob.view] as JOB
  [device.ts\nrender()] as DEV
  [emit-xdot.ts\ndeviceClip] as DC
  [emit-walk.ts\nedgeShown] as EW
  [emit-gates.ts\nemitEdgeComments] as EG
}
package "src/render" {
  [svg-graph.ts\nemitSvgTag] as SVG
  [map.ts\nbuildMapCtx, writePlain] as MAP
}
package "src/xdot" {
  [strtod.ts\nscanStrtod] as STR
}
VP --> STR : %lf scan
DEV --> VP : jobViewport (Z, view)
DEV --> DC : job.clip
DC --> VP : setupPageClip
DEV --> JOB : sets view
SVG --> JOB : reads view, dpi
MAP --> VP : jobViewport, setupPageClip/Size
EW --> EG : gate passed
@enduml
```
