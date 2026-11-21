<!-- SPDX-License-Identifier: EPL-2.0 -->
# Component map

```plantuml
@startuml
title Components touched by graceful-failure (proposed)
package "dot-engine" {
  [src/errors.ts\nGvError, codes] as ERR
  [mirror pilot sites\nsrc/**] as SITES
  [failure-site scanner\ntest/tools/failure-sites] as SCAN
  [registry + fitness test\ntest/corpus/failure-sites.*] as REG
  [oracle-paths.mjs] as PATHS
  [build-carried-oracle.sh] as BUILD
  [oracle-patches/\nmanifest.json] as PATCHES
  [corpus walkers\nsurvey, plain-walk, ...] as WALK
  [docs/adr/0003 +\nknown-divergences U-series] as DOCS
}
package "graphviz fork (GitLab)" {
  [carried/<slug> branches] as CB
  [fix/<slug> branches + issues] as FB
}
[pristine 16.1.1 oracle\n(read-only, bisect)] as PRIS
[carried oracle build\ngraphviz-carried] as CAR

SITES --> ERR : throws structured errors
SCAN --> REG : generates rows
REG --> SITES : fitness: every throw registered
CB --> PATCHES : format-patch
PATCHES --> BUILD : git am --3way
BUILD --> CAR : CMake build
PATHS --> CAR : ORACLE_* (default)
PATHS --> PRIS : ORACLE_PRISTINE_*
WALK --> PATHS : resolves oracle
FB --> DOCS : linked from divergences
REG --> DOCS : U-series rows
@enduml
```
