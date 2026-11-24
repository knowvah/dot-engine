# Batch 1

One task, run by the executor itself. The fix is one argument; its test is
red until the fix lands, so splitting them would leave a red commit.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-plain-pad.md) | `writePlain` fits with `job.pad`; fixture test on 16 probes × dot, neato × plain, plain-ext; gates; squash | executor | `src/render/map.ts`, `src/render/plain-pad.test.ts` | — | [x] |
