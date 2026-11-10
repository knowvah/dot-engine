# Data flow: where a json0 node's pos, width and height come from

Proposed state (after T1). Before T1, the json0 branch called `printNum` on
`coord`/`info.width`/`info.height` instead of `nodeLayoutAttrs`.

```plantuml
@startuml
participant "Json0Renderer.endGraph" as r
participant "buildJson / buildNodeObject" as b
participant "write-back.ts\nnodeLayoutAttrs (new export)" as f
participant "write-back.ts\nattachAttrs / attachNode" as a
r -> b : buildJson(g, false) (no draw lookup)
b -> f : node n
f --> b : pos (nodePosRaw), height, width at %.5g
b --> r : json0 text with the values
r -> a : later(): attach after the write (AD-12)
a -> f : node n
f --> a : same strings, stored in n.attrs
@enduml
```
