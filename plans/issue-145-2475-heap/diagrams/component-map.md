# Component map

```plantuml
@startuml
title issue #145: touched components
package "src (T3, conditional, representation-only)" {
  [renderSvg\nsrc/index.ts] --> [dotLayoutPipeline\nsrc/layout/dot/index.ts] : layout
  [dotLayoutPipeline\nsrc/layout/dot/index.ts] --> [phase structures\n(named by T2)] : builds
  [renderSvg\nsrc/index.ts] --> [svg device\nsrc/render] : render
}
package "test/corpus (T4, T5)" {
  [survey.ts] --> [portEnv + PORT_HEAP_MB] : env per id
  [survey.ts] --> [render-one.ts] : spawn
}
package "docs (T5)" {
  [known-divergences.md] : new section if C-faithful
}
[render-one.ts] --> [renderSvg\nsrc/index.ts] : calls
@enduml
```
