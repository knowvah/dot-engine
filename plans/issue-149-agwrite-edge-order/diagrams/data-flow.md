# Data flow: `write_body`, 16.1.0 (port today) against 16.1.1

```plantuml
@startuml
title write_body for one graph or subgraph g
start
:write_subgs(g)\n(each child body flushes its own edges first);
while (next node n in AGSEQ order?) is (yes)
  if (write_node_test(g, n)) then (yes)
    :write_node(n);
  endif
  while (next out-edge e of n in g?) is (yes)
    :write the head node if needed (unchanged);
    if (16.1.0: edge_last_written[e] < preorder[g]) then (yes)
      :write_edge(e) now, right after its tail\n(re-declared bare in a later scope);
    endif
    note right
      16.1.1 instead:
      if !edges_done[AGSEQ(e)]
        edges_todo.insert(AGSEQ(e), e)
    end note
  endwhile (no)
endwhile (no)
:16.1.1 write_edges: edges_todo in ascending AGSEQ,\nwrite_edge(e), edges_done[AGSEQ(e)] = true, then clear;
stop
@enduml
```

So 16.1.1 has two effects: within a body, edges follow every node, in creation
order; across bodies, an edge is written only in the first body that reaches
it.
