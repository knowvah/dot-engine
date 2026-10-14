<!-- SPDX-License-Identifier: EPL-2.0 -->

# ADR-0001: Re-pin the oracle to graphviz 16.1.0

## Status

Accepted (graphviz 16.1 sync mission).

## Context

The port's conformance oracle was graphviz 15.0.0-82 (`dot -V` reports
15.1.0~dev), built natively at `~/git/graphviz`. Graphviz 16.1.0 changed
observable behaviour, so the pin had to move and every change had to be ported
(the C source is the specification). The oracle build must also be
reproducible by the port: text sizes in particular must not depend on the
fonts installed on the machine.

Behaviour changes ported from 16.1.0:

- HTML table border and rules are emitted before the cells (`f0d07786b`).
- The ortho failure chain (`3c01aaeb4` ... `8fd4b59ef`): see AD-6 below.
- The `svgid` graph attribute (`f25f2048b`).
- xdot gradient stop counts follow `strtoul` semantics.
- sfdp `pcp_rotate`: the LTO-inlined FMA pattern (`630465f82`).
- neato `initItem` d2i clamp (`13e5f6ce8`).
- The parser accepts `node a = [...]` attribute macro names, with C's warning
  (grammar.y `optmacroname`).
- `postaction` removal (`41e482146`): no port change.

## Decision

1. **Oracle = graphviz 16.1.0.** `~/git/graphviz`, local branch
   `oracle/16.1.0` = tag 16.1.0 plus one env-gated `GVTS_POS_DUMP`
   instrumentation commit. It is re-created as a merge whose second parent is
   the 16.1.0 release-notes commit `f94064dce`, so `gen_version.py` reports a
   stable `16.1.0`. The branch is never pushed. Binary:
   `~/git/graphviz/build/cmd/dot/dot` with `GVBINDIR=/tmp/ghl`. Our build and
   headless homebrew 16.1.0 produced identical output on the plantuml-ts issue
   repros, so homebrew is a valid cross-check (never the oracle).
2. **Headless oracle (AD-10).** `/tmp/ghl` holds only the core and
   `dot_layout` plugins, so text is sized by `estimate_textspan_size`. Pango
   was rejected: its sizes depend on the machine's installed fonts and cannot
   be reproduced in the browser port. Real-font sizing belongs to the port's
   pluggable `TextMeasurer`.
3. **Two oracles.** The 15.x reference build stays at `~/git/graphviz-15`
   (branch `oracle/15-gvts` = `9d6e3abfd` + the same instrumentation,
   headless dir `/tmp/ghl15`). It lets any 16.1 delta be bisected against the
   previous behaviour.
4. **Ratchet (AD-4).** `test/golden/known-failing.json` with
   `test/helpers/known-failing.ts`: listed tests run as `test.fails`, and the
   list may only shrink. Re-capturing references at 16.1 made 51 ids fail (8
   goldens, 43 tracker cases); the list is now empty.
5. **Ortho failure (AD-6, consumer-visible).** When `orthoEdges` fails,
   `dot_splines_` returns its failure and `dot_layout` skips
   `dotneato_postprocess`. Native still exits 0 and writes an SVG with
   untranslated coordinates and no edges. The port mirrors that: no new API,
   no exception, the output is the same untranslated, edge-less drawing.
   Callers who relied on the 15.x result for such graphs see different output.

## Alternatives

- **Pango-enabled oracle:** rejected (decision 2).
- **Homebrew 16.1.0 as the oracle:** rejected; ABI mismatch and no
  instrumentation hooks. Kept as a cross-check.
- **Throw on ortho failure:** rejected; it diverges from native, which exits 0
  with output. The faithful-port rule applies.

## Consequences

- References, goldens and registries are re-baselined against 16.1.0.
- The oracle depends on two local, unpushed branches that must be rebuilt per
  machine.
- Ortho-failure graphs now render without edges instead of routing them.

## Rollback

Point `DOT_BIN` / `GVBINDIR` at the 15.x build (`~/git/graphviz-15`,
`/tmp/ghl15`), or check out `oracle/15-gvts` and rebuild, then revert the
mission's merge commit.
