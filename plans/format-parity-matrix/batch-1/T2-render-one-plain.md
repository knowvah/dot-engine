<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Plain subprocess renderer

## Context
The walkers render the port in an isolated, group-killed subprocess (so a hang
or OOM on one input can't wedge the sweep). Mirror `render-one-json.ts` for the
`plain` / `plain-ext` formats with an engine argument.

## Task
CLI: `tsx render-one-plain.ts <file> <engine> <plain|plain-ext>`. Read the DOT
file, `render(parse(decode(buf)), fmt, { engine })`, write the plain text to
stdout, exit 0; on failure exit nonzero with the error on stderr.

## Write-set
- `test/corpus/render-one-plain.ts` (create)

## Read-set
- `test/corpus/render-one-json.ts` — copy its subprocess/decode/kill scaffold.
- `src/render/public.ts` — `render` signature + `OutputFormat`.

## Interface contract (consumed by T5)
CLI process: argv `[file, engine, format]` → stdout = plain text · nonzero exit
on port error. No stdout parsing assumptions beyond "raw format bytes".

## Acceptance criteria
- Given a valid DOT file + `dot` + `plain`, then stdout is the plain rendering,
  exit 0.
- Given `plain-ext`, then stdout is the plain-ext rendering.
- Given an unparseable file, then nonzero exit, error on stderr, no stdout.
- Given `circo` as engine, then the graph is laid out with circo before emit.

## Observability / rollback
N/A. Reversible.

## Quality bar
`tsc --noEmit` clean. Smoke: renders `test/corpus` id `121` for `dot` non-empty.
