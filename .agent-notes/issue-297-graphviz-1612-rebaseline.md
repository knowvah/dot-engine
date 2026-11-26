<!-- SPDX-License-Identifier: EPL-2.0 -->
# Issue #297 — graphviz 16.1.2 re-baseline: harness observations

## Observation: every walk's roster is `parity.json`'s conformant set
- **Context**: Classifying why 53 ids "entered" and 18 "left" all 33 format and engine tables.
- **Finding**: `dot-walk.ts`, `json-walk.ts`, `map-walk.ts`, `plain-walk.ts`, `xdot-walk.ts` and `engine-walk.ts` take their ids from the committed `parity.json` conformant rows. A stale `parity.json` makes every other registry stale, and an id that becomes an oracle error on dot leaves every engine table even when the engine still renders it.
- **Impact**: Re-run the dot survey and commit it before any other walk; read "entered/left" rows as roster effects before looking for a port or native change.
- **Confidence**: High

## Observation: native failures are cached and sticky, timeouts included
- **Context**: Rows flipped to oracle-error under machine load and stayed that way on re-walk.
- **Finding**: `oracle-env.ts` records a failed native render in `~/.cache/dot-engine/oracle/failures/<version>/<engine>/<format>/<id>.json` and replays it. A timeout taken under load (`timedOut: true`, ms just over `capMs`) is replayed as an oracle error until the file is removed. Rare nondeterministic native draws are cached the same way.
- **Impact**: Before re-walking a suspect row, move its failure record aside and run at concurrency 1. `2783`, `2784` and `1652` take 180–410 s natively against the 300 s format-walk cap, so their rows depend on load.
- **Confidence**: High

## Observation: attribution needs the instrumented pristine build
- **Context**: `attribute-divergence.ts` returned `harness-error` for every id.
- **Finding**: It reads `GVTS_POS_DUMP` output, which only the pristine build (`~/git/graphviz-16.1.2`) has; the carried build lacks it. Its default `GVBINDIR` is the dot-only dir. Working invocation: `DOT_BIN=$HOME/git/graphviz-16.1.2/build/cmd/dot/dot GVBINDIR=/tmp/ghl1612-all`. The oracle-error classifier works with the carried build and the all-engine dir. Tracked in #317.
- **Impact**: Set both variables explicitly until #317 fixes the defaults.
- **Confidence**: High

## Observation: walks run native from the repo root
- **Context**: Five image-label inputs (`1879`, `2619`, `2821_*`) became render skips on 16.1.2.
- **Finding**: No walk passes `cwd` to the native spawn, so images named relative to the input are not found; 16.1.1 rendered without the image, 16.1.2 writes nothing. The port's old verdicts matched the image-less render. Tracked in #314.
- **Impact**: A conformant verdict on an image input compares against an image-less native render.
- **Confidence**: High

## Observation: golden svg refs carried the pristine build's version stamp
- **Context**: Regenerating goldens changed line 4 of 314 refs only.
- **Finding**: The 16.1.1 refs were captured with pristine 16.1.1 (`20261109.2225`), before ADR-0003 made the carried build the oracle. `draw-replay-a13.svg`'s fill can come out as unset-memory bytes from the generator on either version (A13); hand runs give `fill=""`.
- **Impact**: A stamp-only diff in refs is expected after an oracle rebuild; check A13's ref for non-UTF-8 bytes after regenerating.
- **Confidence**: High
