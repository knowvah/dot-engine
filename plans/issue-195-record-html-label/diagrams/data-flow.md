# Data flow: a record node's label, attribute to output

Head (proposed). On the base, the pink steps are a plain-text `makeLabel`
(measured whole, `html` false) and field labels with `html` false.

```plantuml
@startuml
title common_init_node -> record_init -> gen_fields / write_plain (head)
start
:label attr value s (html-like: marker + markup);
#pink:makeRecordLabel(s) = make_label is_record branch\n(labels.c:119,139-144): raw text, html = marked && non-empty,\nno measuring;
:recordInit -> recParseOrFallback -> parseReclbl;
if (lbl.html?) then (yes)
  :'<' and '>' are text (shapes.c:3399,3406);
else (no)
  :'<'...'>' is a port name;
endif
#pink:recFlushText: makeAnyLabel(field text, lbl.html)\n(shapes.c:3444) -> html field label, HTML layout;
:sizeReclbl / resizeReclbl / posReclbl -> ND_width, ND_height;
fork
  #pink:genFields: lp.pos = field centre;\nrenderOneLabel (emit_label, shapes.c:3837)\n-> emit_html_label -> _ldraw_;
fork again
  #pink:plainNodeLabel: lbl.html -> "<" + attr + ">"\n(output.c:153-158);
end fork
stop
@enduml
```
