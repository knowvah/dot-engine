# Batch 3: survey heap cap, full render, documentation, squash

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T4 | Per-id heap cap mechanism in the survey, with tests | executor | `test/corpus/survey.ts`, `test/corpus/survey.test.ts` | T2 (T3 if it ran) | [x] |
| T5 | Full `2475_1` render, cap value, known-divergences entry, gates, squash | executor | see T5 | T4 | [x] |

Sequential: T5 sets the cap's value from the full render, and the full render uses T4's
env function.

**Interface T4 → T5:** `portEnv(id: string, env: NodeJS.ProcessEnv): NodeJS.ProcessEnv`
(name is push-forward) and `PORT_HEAP_MB: Readonly<Record<string, number>>` in
`survey.ts`; T5 fills the `2475_1` value.
