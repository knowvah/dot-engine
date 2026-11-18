# Component map: issue #242

The builder seeds every inherited graph attribute (green). Two writers learn to
skip seeded keys (green). Layout and render readers change no code; they read
the inherited value through `attrs` from now on.

```plantuml
@startuml
package "src/parser" {
  [builder.ts\nprocessSubgraph seeding loop] as B #LightGreen
  [builder-inherit.test.ts (new)] as T #LightGreen
}
package "src/model" {
  [graph.ts\nattrs · seededAttrs · graphDefaultsSnapshot] as G
  [cgraph-ops.ts\nagGraphAttr · localGraphAttrs (new)] as O #LightGreen
}
package "src/render" {
  [dot/attrs.ts\ngraphInputParts · echoGraphAttr] as W #LightGreen
  [json.ts\ncluster correlation] as J #LightGreen
}
package "src/layout" {
  [dot mincross\norderedEdges] as L
  [pack projection\nprojectOne] as P
}
B --> G : seeds every snapshot key, marks seededAttrs
T --> B : parse + render probes
O --> G : reads attrs minus seededAttrs
W --> G : skips seededAttrs when printing
J --> O : copies local attrs of the xdot re-parse
L --> O : agGraphAttr(cluster, "ordering")
P --> G : copies attrs (seeded values travel)
@enduml
```
