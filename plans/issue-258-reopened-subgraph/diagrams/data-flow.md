# Data flow: opening a named subgraph (after T1)

C's `agsubg` returns the subgraph the parent already holds; T1 makes
`processSubgraph` do the same. On the base, the `found` branch did not exist:
every opening built a new `Graph` and replaced the old one.

```plantuml
@startuml
start
:subgraph p { body } in scope graph;
if (graph.subgraphs.get("p")?) then (found: re-open)
  :buildGraph(body, prior);
  note right: no new seq, snapshot or seeding\n(agsubg -> agfindsubg_by_id)
  :return prior;
else (new name)
  :new Graph, assignSubgSeq;
  :graphDefaultsSnapshot = effective parent attrs;
  note right: agmakeattrs copy, once
  :buildGraph(body, sg);
  :seed GRAPH_INHERIT_SEED_KEYS;
  :graph.subgraphs.set("p", sg);
endif
if (subgraph was an edge endpoint?) then (yes)
  :after every endpoint resolves:\nexpand to sg.nodes sorted by id;
  note right: endedge / edgerhs walk agfstnode(subg)
endif
stop
@enduml
```
