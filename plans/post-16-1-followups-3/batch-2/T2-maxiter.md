# T2: `MaxIter` per layout mode (item 25, AD-10)

**Context:** `neatoinit.c:1280-1287` sets `MaxIter` from `maxiter` (`atoi`), else 200 for
`MODE_MAJOR` (`DFLT_ITERATIONS`), 30 for `MODE_SGD`, else `100 * agnnodes(g)` (KK, IPSEP,
HIER). The port's majorization path (`src/layout/neato/init.ts:332`,
`runMajorization`) uses `lateDouble(maxiter, DFLT_ITERATIONS, 0)` for every mode, so ipsep
and hier cap at 200 where C allows `100·n`. KK already does `100·n` (`kk.ts:37`). No
corpus input is known to need more than 200 iterations.

**Task:** compute `maxi` per mode as C does, including `atoi` semantics (`maxiter=""` or a
non-numeric prefix → 0, trailing junk ignored, no fraction). Check SGD's reader too
(`sgd.ts`) and `start.ts:118` (`MaxIter < 0` early return) agree with the same parse.

**Write-set:** `src/layout/neato/init.ts` (+ test). If SGD's or `start.ts`'s parse must
change, stop 1 (journal and stop; do not widen silently).
**Read-set:** `src/layout/neato/init.ts:320-345`, `src/layout/neato/start.ts:110-125`,
`src/layout/neato/kk.ts:30-60`, `~/git/graphviz/lib/neatogen/neatoinit.c:1270-1300`.

**Acceptance criteria:**
- *Given* `mode=ipsep` (and `mode=hier`) with no `maxiter`, *when* majorization runs on n
  nodes, *then* `maxi` is `100·n`.
- *Given* `mode=major`, *then* 200; `maxiter=7` → 7; `maxiter=""` → 0; `maxiter="12x"` → 12.
- *Given* byte-identity over every neato/fdp-path corpus id with `mode=ipsep|hier`, *then*
  identical, or each change moves toward native (else revert, stop 5).

**Observability:** N/A. **Rollback:** reversible.
