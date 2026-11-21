# Data flow: where `lost` is written and read (base)

This is the base. On the head every `lost := true` box and the clear are
gone, the skip tests only `routedThisPass`, and each writer still returns
with no spline installed.

```plantuml
@startuml
start
:beginRoutingPass
clears lost on every edge;
:collectRankEdges
(NORMAL + splineMerge nodes; C dot_splines_ 281-320);
:edgecmp groups (dispatchEdgeGroup);
if (group kind?) then (flat)
  :routeFlatGroup:
  each deduped original once;
  :routeLoneEdge(O);
elseif (cross-rank, one original,\nnot a merge run) then (lone)
  :routeLoneEdge(O);
elseif (merge-bounded run) then (entry)
  :routeEntryRun
  (never reads lost);
  stop
else (parallel, >1 original)
  :routeParallelEdgeGroup;
  if (base lost?) then (yes)
    :lost := true on every member
    (splines-route.ts:393);
  endif
  stop
endif
if (routedThisPass(O) or O.lost?) then (skip: 0 fires measured)
  stop
endif
:routeOneEdge -> routers;
if (routesplines fails?) then (yes)
  :lost := true on O
  (6 writer sites);
endif
stop
@enduml
```
