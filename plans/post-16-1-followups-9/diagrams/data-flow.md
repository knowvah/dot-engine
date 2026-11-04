# Data flow: part 9

How a root attribute reaches a neato solver after T2. Before T2, the component's `attrs` is empty, so the solver reads `undefined`
and uses its default.

```plantuml
@startuml
actor Caller
participant "neato/index.ts" as N
participant "pack/ccomps.ts\npccomps" as P
participant "solver\ninit, kk, sgd, stress" as S
Caller -> N : render(graph with maxiter=3)
N -> P : pccomps(root, "_neato_cc")
P -> P : buildSubgraph, then copy root attrs\n(agsubg / agmakeattrs)
P --> N : components named _neato_cc0, ...
loop each component
  N -> S : solve(component)
  S -> S : component.attrs.get("maxiter") gives "3"
  S --> N : positions
end
N --> Caller : packed layout, equal to native at 0.01
@enduml
```

How T8 separates address order from a real difference.

```plantuml
@startuml
start
:Copy lib/vpsc to scratch;
:Order Blocks by creation index;
:Run dir1 n40 across environments;
if (Output repeats exactly?) then (yes)
  if (Port matches at 0.01?) then (yes)
    :Heap-address cause proven\nCommit fixture and test;
  else (no)
    :Trace both sides to the first divergence;
    :Park after about 2 h with the artifact;
  endif
else (no)
  :Another source of variance\nDiagnose;
endif
stop
@enduml
```
