# Decisions: issue #129

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-10. Nobody confirmed these; each one names the rejected options and the
evidence so the maintainer can audit it.

### AD-1: drop the `\n` at the call site, not in the agerr writer

- **Decision:** remove the trailing `\n` from `ZERO_LENGTH_MESSAGE`
  (`src/layout/neato/conjgrad-mkernel.ts:28`).
- **Rejected:** have `agerrorf` strip a trailing `\n` itself. That reverses the
  documented contract at `src/common/agerr.ts:8-10` ("the port strips C's trailing
  `\n` at every call site") and would change every agerr site's behaviour at once.
- **Evidence:** part 11 T5 (`bbd0b48d`) fixed `conjgrad.ts:209,326` this way; the
  issue body prescribes it.

### AD-2: keep the module-local constant

- **Decision:** `ZERO_LENGTH_MESSAGE` stays in `conjgrad-mkernel.ts`.
- **Rejected:** share one constant with `conjgrad.ts`. C repeats the literal at
  `conjgrad.c:65,141,217`; the port keeps C's shape, and a shared export adds an
  import edge for a one-line string. The tests already pin the text at each site.

### AD-3: the test mirrors `conjgrad.test.ts`

- **Decision:** `conjgrad-mkernel.test.ts` asserts (a) `console.error` is called
  exactly once with `Error: conjugate_gradient: unexpected length 0 vector`, and
  (b) an `agseterrf` sink receives `['Error', ': ', '<text>\n']`, with
  `agseterrf(null)` in `afterEach`.
- **Rejected:** change only the string in the existing `toHaveBeenCalledWith`
  (line 70). That does not catch a second, blank console line or the double
  newline a sink gets, which are the reported defect.

## Baseline

On `35f98bb0`, 2026-11-10 during planning: `npm run typecheck` exit 0;
`npm test` exit 0, 557 files, 12729 tests passed. No lint script exists in
`package.json`; typecheck is the static gate.

## Rollback

Reversible: revert the one commit. No data, API or output-format change; only a
stderr line on an underflow path.
