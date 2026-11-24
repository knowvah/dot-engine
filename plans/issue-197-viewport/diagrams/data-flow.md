# Data flow: `viewport=` to the page and the emit gates

Head (proposed). On the base, the pink steps derive view and focus from the
bb and never read `viewport`, and the map renderer draws every edge.

```plantuml
@startuml
title render(): init_job_viewport -> setup_page -> emit (head)
start
:job.bb = GD_bb; job.pad (init_job_pad);
#pink:initJobViewport(bb, size, pad):\nsz = (UR+pad)-(LL-pad); Z = size= fit;\nview = Z*sz; focus = bb centre;
#pink:applyViewportAttr(vp, g):\nsscanf W,H,Z,'node' | W,H,Z,node | W,H,Z,x,y\n(each value read overrides its field);
fork
  #pink:setupPageClip(vp): job.clip =\nfocus +- (view/zoom)/2;
  :node_in_box gate (emit-gates.ts);
  #pink:edgeShown: edge_in_box && edge_in_layer\n(emit.c:3005);
  :renderers draw only what passed;
fork again
  #pink:job.view, job.scale = Z*dpi/72;
  :svg width/height/viewBox = view*dpi/72 (+margin);
fork again
  #pink:buildMapCtx(vp): pageBox, translation;
  :cmapx/imap coords;
fork again
  #pink:writePlain: graph scale = Z;
end fork
stop
@enduml
```
