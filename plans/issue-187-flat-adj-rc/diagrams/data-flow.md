# Data flow: the aux rc, C and head

C's path, which the head follows. A non-zero rc returns at every step. The
head adds the port-only `null` (declined) on the flat routers, which only
ever means "try the next router".

```plantuml
@startuml
start
:make_flat_adj_edges
(makeFlatAdjEdges);
if (aux dot_mincross r != 0?) then (yes)
  :return r;
  stop
elseif (aux dot_position rc != 0?) then (yes)
  :return rc
(e.g. #162 edge too long);
  stop
elseif (aux dot_splines_ rc != 0?) then (yes)
  :return rc;
  stop
else (no)
  :postprocess, copy splines,
  cleanupCloneGraph; return 0;
endif
:make_flat_edge returns it
(routeFaithfulSidePort → routeFlatEdge:
 number | null);
:dot_splines_ group loop
(routeLoneEdge → dispatchEdgeGroup →
 routeEdgeGroups);
if (rc != 0?) then (yes)
  :return rc: no vnode labels, normalize,
  port labels, State, EdgeLabelsDone;
  :dotLayout: skip compound edges and
  dotneato_postprocess;
  stop
else (no)
  :next group; finalize; return 0;
  stop
endif
@enduml
```

The base differed at two points. `makeFlatAdjEdges` returned `1`, and
`routeFaithfulSidePort` mapped any non-zero result to `false`, so
`routeFlatEdge` fell through to `makeAdjFlatNoPortEdge` and the box-corridor
router, and the group loop never saw a failure.
