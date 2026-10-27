# T1: agerr partial-line buffer (AD-7)

**Context:** `lib/cgraph/agerror.c:out` writes each message to stderr as given; a message
without a trailing `\n` (e.g. `emit.c:parseSegs` `"Total size > 1 in \"%s\" color spec "`)
is continued by the next message on the same line. `src/common/agerr.ts` (`agerr`,
`agwarningf`, `agerrorf`, `agerrFinished`, `agerrLineOn`) prints one console line per call,
so items 75/77/82 cannot reproduce native's joined lines.

**Task:** (1) `agerr.ts` keeps a pending partial line per channel: a message whose text does
not end in `\n` is stored (prefix applied as now) instead of printed; the next message on
that channel is appended to it and the whole line printed, with that message's own
prefix included exactly as C's `out` would produce (`…color spec Warning: red;0.6 is not a
known color.`). An AGPREV (`'prev'`) message appends with no prefix. (2) Register a
`registerRenderState` reset that flushes any pending line. (3) Existing callers that pass
text without `\n` and expect a finished line: audit every `agerr*` call site (grep
`agwarningf(\|agerrorf(\|agerr(`); the port strips C's `\n` everywhere today, so the new
rule applies only to callers that opt in by passing C's newline-less text. Choose the opt-in
form that keeps every current call site unchanged (e.g. a trailing-`\n` convention is the
default and a `partial` flag or explicit `agerrPartial` marks the exception), state it in
the module doc, and journal it. (4) Tests: joined line equality; flush on reset; channel
follows the first message's level.

**Write-set:** `src/common/agerr.ts`, `src/common/agerr.test.ts`.
**Read-set:** `lib/cgraph/agerror.c:out` + `agerr`; `src/common/render-state.ts`;
`$BASE/native/75*`, `77*`, `82*`.

**Interface output:** the opt-in form for a partial message (name it in the hand-back); a
held line is printed before the next message on the same channel; `resetRenderState()`
flushes.

**Acceptance criteria:**
- *Given* a partial `Total size > 1 in "x" color spec ` then `red;0.6 is not a known
  color.`, *when* both are warnings, *then* `console.warn` receives one line equal to
  `$BASE/native/75.stderr`'s line.
- *Given* a held partial line and no further message, *when* render state resets, *then*
  the line is printed exactly once.
- *Given* the corpus, *then* bytediff (console included) is identical and the golden
  "logs nothing" gates are unchanged.

**Observability:** N/A. **Rollback:** reversible.
