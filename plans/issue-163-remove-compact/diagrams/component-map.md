# Component map: files #163 touches

```plantuml
@startuml
title #163 write-set (port) and the C it mirrors
package "src/layout/dot" {
  [rank.ts\ndotRank (unchanged)] as R
  [rank-dot2.ts\ndot2Rank, compileEdgeItem] as R2
  [rank-dot2.branch.test.ts\n(+ optional rank-dot2.compact.test.ts)] as T
}
package "test/golden" {
  [known-failing.json\ngoldens: []] as KF
  [suite.test.ts / xdot-suite.test.ts\n(unchanged)] as GS
  [refs/, refs-xdot/ dot-newrank-compact-*\n(unchanged, = 16.1.1)] as REF
}
R --> R2 : newrank=true calls dot2Rank
T --> R2 : red tests (Xg edge, ranks)
GS --> KF : test.fails for listed ids
GS --> REF : compares port output
note bottom of R2
  C: lib/dotgen/rank.c compile_edges, dot2_rank
  (16.1.1; upstream d5061e47c, 731f7c560)
end note
@enduml
```
