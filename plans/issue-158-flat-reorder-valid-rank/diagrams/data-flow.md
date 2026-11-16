# Data flow: flat_reorder after valid_rank

```plantuml
@startuml
start
:mincross → flat_reorder(g), per rank r;
:clear MARK; walk the rank right to left\n(left to right when flipped);
repeat
  if (no constraining flat edge?) then (yes)
    :push v;
  elseif (unmarked and no constraining in-edge?) then (yes)
    :postorder(v);
  else (no)
    :valid_rank = false; break;
    note right: new in 16.1.1 (T1)
  endif
repeat while (more nodes?)
if (valid_rank and temprank non-empty?) then (yes)
  :reorder rank from temprank;
  :reverse right-to-left non-constraint flat edges;
else (no)
  :leave mincross's order and the flat edges;
endif
:GD_rank(Root)[r].valid = false;
stop
@enduml
```

Downstream, `dot_splines_` routes each run of equal flat edges with
`make_flat_edge`; edge `i` of the run (edgecmp order, seq within a run) gets the
`(i+1)`-th route out (T3).
