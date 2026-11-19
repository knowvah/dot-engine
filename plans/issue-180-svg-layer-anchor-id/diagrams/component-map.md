# Component map: issue #180

The modules T1 touches (bold) and the ones that only read the id.

```plantuml
@startuml
package "src/gvc" {
  [**job.ts**\nRenderJob.objId: layer prefix (AD-1)] as job
  [device.ts\nanchors, HTML anchor ids] as dev
  [anchor.ts\nresolveObjAnchor / resolveEdgeAnchor] as anc
  [first-layer.ts\nlayerNum] as fl
}
package "src/render" {
  [svg-id.ts\nsvgNodeId / svgEdgeId /\nsvgClusterId / svgGraphId] as id
  [**svg-cluster.ts / svg-graph.ts /\nsvg-helpers.ts**\ngroup ids: explicit prefix removed] as grp
  [**svg-layer-id.test.ts**\n(new)] as t
}
package "src/common" {
  [poly-gencode.ts\nnode anchor, gradient obj.id] as pg
}
fl --> job : layerNum, layerIDs
id --> job : objId
grp --> id : group id
dev --> id : anchor / HTML ids
dev --> anc : obj.id
pg --> id : node id
t --> grp : svg probes
t --> job : objId cases
@enduml
