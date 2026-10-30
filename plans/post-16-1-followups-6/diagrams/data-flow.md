# Data flow

## Item 90: missing-image warnings, current versus target

Current: the warning pair is emitted from render-time `polyInit`, so `-Tjson` prints it
twice. Target (AD-1): emitted once from the layout-time `poly_init` port.

```plantuml
@startuml
actor Caller
participant "layout\n(commonInitNode)" as L
participant "render\n(device.ts)" as R
participant "polyInit" as P
participant "json collectDrawLookup" as J
participant "agerr" as E
Caller -> L : layout(g)
L -> E : image pair (target: once, here)
Caller -> R : render(g, json)
R -> P : per node (binding only in target)
P -> E : image pair (current: 1st copy)
R -> J : beginGraph
J -> R : nested render(g, xdot)
R -> P : per node
P -> E : image pair (current: 2nd copy)
@enduml
```

## Item 91: node image drawn (target, AD-2 to AD-4)

```plantuml
@startuml
participant "poly_gencode\n(poly-gencode.ts)" as PG
participant "gvrender_usershape\n(render-usershape.ts)" as RU
participant "sizer / resolver\n(usershape.ts)" as US
participant "renderer\n(svg / xdot)" as R
PG -> PG : peripheries drawn (filled on ring 0)
PG -> RU : name, innermost ring AF, filled, imagescale, imagepos
RU -> US : supplied? intrinsic px
US --> RU : w, h (or miss: return, draw nothing)
RU -> RU : size at job dpi, scale, position,\ndevice transform, LL/UR swap
RU -> R : usershape(name, box)
R --> PG : <image> or I op written
PG -> PG : filled = 0
@enduml
```
