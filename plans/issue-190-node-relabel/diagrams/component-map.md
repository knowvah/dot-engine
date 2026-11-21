# Component map: modules T1 touches

```plantuml
@startuml
title Issue #190: modules touched (bold = modified)
package "src/common" {
  [**nodeinit.ts**\ninitNodeFromLabel] as NI
  [**poly-init.ts**\nmakeNodeLabel / buildNodeLabel / polyInit] as PI
  [record.ts\nrecordMakeLabel] as RC
  [htmltable*.ts\nsize warnings] as HT
}
package "src/gvc" {
  [device.ts\nrender] as DV
  [**rerender-relabel.test.ts**] as T
}
[**src/async/collect.ts**\n(@see only)] as CO
[**docs/process-statics.md**] as DOC
NI --> PI : makeNodeLabel (every layout)
NI --> RC : record shapes (unchanged)
DV --> PI : polyInit -> buildNodeLabel (guarded)
PI --> HT : makeAnyLabel -> HTML sizing
T --> NI : no-free relayouts
T --> DV : renders
CO ..> PI : mirrors font lookups
DOC ..> HT : rows cite #190
@enduml
```
