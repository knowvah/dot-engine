# T4: per-id heap cap in the survey

## Context

[decisions.md](../decisions.md) AD-6. `portSvg` (`test/corpus/survey.ts:384-396`) spawns
`tsx render-one.ts` with `process.env`; it does not know the id. The caller is at
`survey.ts:523-524`. Planning probe: `NODE_OPTIONS=--max-old-space-size=12000` raised
tsx's child heap limit from 4,192 MB to 12,096 MB.

## Steps

1. **Red:** in `test/corpus/survey.test.ts`, tests for the pure env builder:
   - an id in the map gets `NODE_OPTIONS` ending in `--max-old-space-size=<MB>`;
   - an existing `NODE_OPTIONS` (for example `--stack-size=65500`) is kept, space-joined;
   - an id not in the map gets an env equal to the input, and the input is not mutated;
   - the map holds exactly one id, `2475_1`.
2. **Green:** export `PORT_HEAP_MB` and the builder; `portSvg` takes the id and passes the
   built env to `spawnCapture`. Put a placeholder value for `2475_1` (journal it); T5
   replaces it. The comment above the map states native's peak (8,410 MB RSS, 1,411.9 s,
   16.1.0, 2026-11-10), the formula from AD-6, and that this is the only id.
3. Gates 1, 2 and 4. Commit `test(T4): add a per-id heap cap to the survey`.

## Write-set

`test/corpus/survey.ts`, `test/corpus/survey.test.ts`,
`plans/issue-145-2475-heap/decision-journal.md`.

## Read-set

`test/corpus/survey.ts:270-400,500-560`, `test/corpus/survey.test.ts` (existing pattern).

## Acceptance criteria

- Given id `2475_1`, when the env is built, then `NODE_OPTIONS` contains
  `--max-old-space-size=<PORT_HEAP_MB['2475_1']>` after any existing options.
- Given any other id, when the env is built, then it deep-equals the input env.
- Given the survey, when it renders any id, then `portSvg` uses the built env.

## Observability / rollback

Observability: the survey's start banner already prints budgets; add the capped ids to it
if it fits in one line (push-forward). Rollback: reversible; test infrastructure only.
