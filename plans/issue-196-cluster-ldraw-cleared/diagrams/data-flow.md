# Data flow: a labelled cluster's `_ldraw_`, render to output

Head (proposed). On the base, the pink steps record, carry and print `_ldraw_`
only when the label buffer is non-empty, so a stored string survives.

```plantuml
@startuml
title emit_clusters -> xdot_end_cluster -> agwrite / json (head)
start
:emit_begin_cluster .. emit_end_cluster\n(an invisible cluster, or a "\\n" label: no text span drawn);
:CLABEL buffer = "";
#pink:endCluster: GD_label set -> draws[sg].ldraw = ""\n(gvrender_core_dot.c:285);
#pink:renderedDraws: ldraw = recorded ?? stored;
fork
  #pink:clusterAttrs -> clusterLdraw:\nheld value only; skip on the root's own "";
  :xdot / dot text: _ldraw_="";
fork again
  #pink:attachClusterDraws / attachRootDraws:\nsg.attrs._ldraw_ = "";
  :json: overlay and attrs hold "" -> emitAttrs skips it;
end fork
stop
@enduml
```
