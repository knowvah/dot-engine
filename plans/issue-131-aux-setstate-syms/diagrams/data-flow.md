# Data flow: aux init and the passes that see its labels (after the change)

```plantuml
@startuml
start
:makeFlatAdjEdges(g, edges, cnt, et);
:buildFlatAux: cloneGraph + cloneNode/cloneEdge\n(attrs copied, all edge/node attrs declared);
#palegreen:dotInitNodeEdge(auxg, AUX_INIT_SYMS)\nconstr/minlen/group/headlabel/taillabel/xlabel/nodeXlabel = false;
partition "per node" {
  :commonInitNode(n, auxg, {nodeXlabel:false});
  #palegreen:initNodeXLabel skipped\n(no ND_xlabel, no NODE_XLABEL);
}
partition "per edge" {
  :dotInitEdge(e, syms);
  :initEdgeLabels(e, auxg, m, syms);
  :label made (E_label stays bound);
  #palegreen:xlabel / head_label / tail_label skipped\n(no EDGE_XLABEL / HEAD_LABEL / TAIL_LABEL);
}
:dotRank / dotMincross / dotPosition (aux);
:dotSplines_(auxg)\nplacePortLabels: loops find no head/tail labels (AD-3);
:gvPostprocess(auxg)\naddXLabels: has_labels has no xlabel/port-label bits;
:copyFlatSplines + edge label pos back to g;
:cleanupCloneGraph(auxg)\n(test snapshot taken here);
stop
@enduml
```

Green steps change in this mission. Before it, the skipped steps made labels C
never makes in the aux, and `addXLabels` and the aux bounding box saw them.
