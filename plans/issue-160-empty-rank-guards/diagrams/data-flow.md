# Data flow: where an empty rank is read

```plantuml
@startuml
start
:dot_position(g);
:create_aux_edges → make_LR_constraints;
if (rank[i].v[0] == NULL?) then (yes)
  :skip rank i (d49e3a529);
else (no)
  :LR aux edges for rank i;
endif
:set_ycoords: walk r = maxrank-1 .. minrank;
if (rank[r].n > 0 and rank[r+1].v[0] != NULL?) then (yes)
  :y(rank[r].v[0]) = y(rank[r+1].v[0]) + delta;
else (no)
  :leave y (9fca64d0f);
endif
:set_aspect → rec_bb → dot_compute_bb;
:UR.y from the first rank in minrank..maxrank\nwith n > 0 and v[0] (8e06a6261);
:dot_splines_ → self-loop sizey;
if (r == maxrank or rank[r+1] empty?) then (yes)
  :rank above if r > 0 and it has v[0], else ND_ht\n(ca3353d80, 1a77ac9df);
elseif (r == minrank or rank[r-1] empty?) then (yes)
  :n.y - y(rank[r+1].v[0]);
else (no)
  :min(up, down);
endif
stop
@enduml
```

An empty rank reaches these sites today through rank-set deletion
(`2759`: `already in a rankset, deleted from cluster`). After #159 it also
comes from abomination's rank -1 when no flat label vnode fills it.
