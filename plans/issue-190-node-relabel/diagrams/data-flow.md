# Data flow: where a node label is made

Base: the layout-time call is guarded, so a no-free relayout keeps the label.

```plantuml
@startuml
title Base: node label on layout and render
start
:ctx.layout(g) (no freeLayout before);
:commonInitNode -> initNodeFromLabel;
if (shape is record?) then (yes)
  :recordMakeLabel (always);
else (no)
  :buildNodeLabel;
  if (n.info.label set?) then (yes)
    #pink:return: stale label kept;
  else (no)
    :makeAnyLabel -> n.info.label;
  endif
endif
:polySize from label.dimen;
:render -> polyInit -> buildNodeLabel (guard keeps layout's label);
stop
@enduml
```

Head: layout always makes the label, as `common_init_node` does. Only the
render-time call is guarded.

```plantuml
@startuml
title Head: node label on layout and render
start
:ctx.layout(g);
:commonInitNode -> initNodeFromLabel;
if (shape is record?) then (yes)
  :recordMakeLabel (always);
else (no)
  #palegreen:makeNodeLabel (always) -> n.info.label;
endif
:polySize from label.dimen;
:render -> polyInit -> buildNodeLabel;
if (n.info.label set?) then (yes, layout made it)
  :keep (C has no render-time make_label);
else (no: layout had no measurer)
  :makeNodeLabel;
endif
stop
@enduml
```
