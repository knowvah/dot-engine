# T1 — fault-acceptance helper

## Context

dot-engine (TypeScript port of graphviz) keeps accepted-divergence registries
under `test/corpus/`. Today every registry can only accept a `diverged` walk
row. This mission lets the engines/json/map registries also accept a
`port-error` or `timeout` row (needed for A10: `2784` throws
`Map maximum size exceeded`). T1 adds the shared types and the one rule that
decides whether an entry accepts a row; T2 (staleness), T3 (engine report
join) and T4 (json/map walkers) all call it — none may re-implement it.

## Task

In `test/corpus/accepted-class.ts` (Node-only dev infra) add, TDD-first in
`accepted-class.test.ts`:

```ts
/** Verdict a registry entry declares; absent `verdict` field ⇒ 'diverged'. */
export type DeclaredVerdict = 'diverged' | 'port-error' | 'timeout';

/** Optional fault-acceptance fields on a per-id registry entry (AD-1). */
export interface FaultAcceptance {
  verdict?: 'port-error' | 'timeout';
  /** Required for verdict 'port-error' (case-sensitive substring, AD-7). */
  errIncludes?: string;
}

/** A walk row's raw outcome, normalized across walkers (T2 builds these). */
export interface RawOutcome {
  outcome: 'pass' | 'diverged' | 'accepted' | 'port-error' | 'timeout' | 'oracle-error';
  /** Every error text on the row (map: one per format); [] when none. */
  errs: string[];
}

export function declaredVerdict(e: FaultAcceptance): DeclaredVerdict;
/** True iff `e` accepts a row with this RAW outcome (pre-acceptance:
 *  'diverged' | 'port-error' | 'timeout'; any other outcome ⇒ false). */
export function acceptsOutcome(e: FaultAcceptance, o: RawOutcome): boolean;
/** null when valid, else a one-line reason (AD-1 field rules). */
export function validateFaultFields(e: FaultAcceptance): string | null;
```

Rules: `diverged` accepts `diverged`; `port-error` accepts `port-error` iff
`errs` is non-empty and **every** entry contains `errIncludes`; `timeout`
accepts `timeout`. Validation: `port-error` requires a non-empty
`errIncludes`; `errIncludes` without `verdict: 'port-error'` is invalid; an
unknown `verdict` string is invalid. Also widen `FormatAcceptedRegistry`'s
`divergences` element type with `FaultAcceptance` fields.

## Write-set

- `test/corpus/accepted-class.ts`
- `test/corpus/accepted-class.test.ts`

## Read-set

- `test/corpus/accepted-class.ts` (whole, 80 lines)
- `test/corpus/accepted-class.test.ts:1-40` (style, fixtures)
- `../decisions.md#ad-1`, `#ad-7`

## Acceptance criteria

- Given an entry with no `verdict`, when the outcome is `diverged`, then
  `acceptsOutcome` is true; for `port-error` it is false.
- Given `{verdict:'port-error', errIncludes:'Map maximum size exceeded'}`,
  when `errs` is `['Map maximum size exceeded']` or both map formats carry it,
  then true; when any err lacks the substring or `errs` is empty, false.
- Given `{verdict:'port-error'}` without `errIncludes`, when validated, then a
  reason string is returned; `{verdict:'timeout', errIncludes:'x'}` and
  `{errIncludes:'x'}` are also invalid; `{}` and a well-formed port-error
  entry return null.
- Given `{verdict:'timeout'}`, when the outcome is `timeout`, then true;
  `diverged` ⇒ false.

## Quality bar

TS strict, no `any`; SPDX header kept; ≥90% branch coverage of the new code;
existing `accepted-class.test.ts` cases untouched and green;
`npm run typecheck` and `npx vitest run test/corpus` exit 0.

## Observability

N/A — no new observable operations.

## Rollback

Reversible — additive exports; revert the commit.

## Commit

`test(corpus): add fault-acceptance rule for accepted registries`
