# Architecture decisions (locked 2026-10-22)

Approved by the user ("approve all recommendations"). A task that needs to contradict one
stops (stop condition 4).

## AD-1: commits unsigned and local; user re-signs at the end
- **Context:** every dot-engine commit is SSH-signed with a YubiKey that needs a PIN plus a
  touch; an agent shell cannot answer the PIN, and a signing `git commit` hangs.
- **Decision:** commit with `git -c commit.gpgsign=false`; never push or open a PR. T14 hands
  the user the re-sign command.
- **Consequences:** one interruption at the end instead of one per task.

## AD-2: one branch, one PR, merge commit
- **Decision:** branch `chore/post-16-1-followups-3`, one commit per task, one PR merged as a
  merge commit (task SHAs survive for the journal).

## AD-3: diagnosis budget
- **Decision:** ~2 h per item/site, then park with mechanism / origin / causal chain / ruled
  out / next instrument, and continue the mission.
- **Consequences:** a parked item is a valid outcome; an undiagnosed one is not.

## AD-4: C process-level state is scoped to one public render call
- **Context:** native runs one graph per `dot` process; `emit_once_reset` runs only in
  `gvFreeContext` (`lib/gvc/gvcontext.c:70`), and RNG states, sequence counters and
  once-only warning flags are file statics. The port keeps module statics across calls,
  which makes output depend on earlier renders (item 42).
- **Decision:** new `src/common/render-state.ts`: modules owning C-process state register a
  reset; every public render entry calls `resetRenderState()` first. `renderSvg` already
  builds a fresh context per call, so per-context state agrees. Caller-installed hooks
  (`setTextMeasurer`, `setImageSizer`, `setImageResolver`) are never reset.
- **Consequences:** render output is a pure function of its input; once-only warnings
  (37, 41) print once per render, as one native run does.

## AD-5: one stderr writer
- **Context:** C prints every agerr message through `default_usererrf`
  (`lib/cgraph/agerror.c:65`), which writes each control character that is not white space
  as `\ooo`. The port has 44 `console.warn/error` sites in 28 files plus `consoleLine`.
- **Decision:** new `src/common/agerr.ts` ports `agerror.c:out` + `default_usererrf`
  (`Error: `/`Warning: ` prefix, AGPREV continuation, escaping). Every console site whose C
  counterpart is agerr/agwarningf/agerrorf routes through it; `fprintf(stderr)` sites stay
  raw. `StderrLines`/`consoleLine` sit on top of it.
- **Consequences:** one escaping rule; T10/T11 warnings use it.

## AD-6: FMA evidence bar (item 29)
- **Decision:** fuse a site only when the 16.1 disassembly (or an instrumented native build
  in a scratch copy) shows `fmadd`/`fmsub`/`fnmsub` for that exact expression. One commit per
  site; an output change is accepted only toward the oracle. `arrowEndClip`'s non-fusion
  difference from `arrows.c` is ported in the same task (T7).
- **Consequences:** latent mis-ports close; software `fma` in hot paths is speed-gated.

## AD-7: HTML items port C exactly
- **Decision:** items 35 and 40 port C's behaviour even where SVG changes. Any SVG change
  needs the survey and engine walks with 0 regressions. Native-matching warnings go on the
  golden "logs nothing" allow-lists.

## AD-8: item 31 fix bar
- **Context:** native times out on 1864 (`oracle-error`), so no output oracle exists.
- **Decision:** measure peak heap per phase. Fix an allocation pattern C does not have
  (copies, string building, retained intermediates) at its origin. If C's own algorithm
  needs the memory, park as irreducible with the measurement.

## AD-9: item 30 closes as documented-irreducible
- **Decision:** no code. A known-divergences entry (+ 23 locales) states the mechanism found
  in item 17 (macOS libm `sin` 1 ulp off V8 at `shapes.c:2329`), unless one exists.

## AD-10: item 25 is ported without an observable input
- **Decision:** port `neatoinit.c:1280-1287` (`maxiter` via `atoi`; MAJOR 200, SGD 30, else
  `100·n`) with unit tests pinning each mode; the survey and walks guard regressions.
