<!-- SPDX-License-Identifier: EPL-2.0 -->
# T7: Classify the registry and choose the mirror pilot sites

## Context

`test/corpus/failure-sites.json` (T4) holds one row per C failure site and
port throw, mostly `unclassified`. D6 defines the ladder, and D3/D4 bound
what a "better" error may change: only owned surfaces, and a new code only
when a consumer would branch on it.

## Task

1. For every `unclassified` row, read the C function and the port symbol.
   Use Serena or `ast-grep`; read only the function, never whole files.
   Set `class` and write a one-line `note`:
   - `mirror`: C fails, and correctly (invalid input, resource limit,
     unsupported feature). Note *what input reaches it*, or "invariant only".
   - `graceful`: C crashes or has undefined behaviour here and the port
     renders sanely. The note gives the evidence.
   - `upstream-fix`: C output is wrong but deterministic. The note gives the
     mechanism, or labels it a hypothesis.
   - `port-bug`: the port fails where C survives. The note gives the C
     behaviour, the port behaviour and a repro input.
   - `not-ported` and `port-only` from the scanner stay as they are unless
     they are wrong.
2. Any C logic bug that seems to need a port change is `upstream-fix` with
   status `proposed`, and **no** `src/` change (stop 14 is satisfied by
   recording it).
3. Write `plans/graceful-failure/batch-4/mirror-sites.md`: **at most 6**
   `mirror` sites, preferring sites that user input can reach. It is a table
   with these columns:
   - row id;
   - `src` file;
   - symbol;
   - code (an existing `GvErrorCode`, or a proposed new one with the
     consumer decision it enables);
   - new `message`;
   - context fields (for example `{ node: string }`);
   - triggering DOT input;
   - test file.
   - Across all rows, at most 10 distinct files including tests. **This
     table is T9's write-set.**
   - Exclude any site where the change would alter oracle-compared output
     (stop 13). Thrown-error text is not oracle-compared; `agerr` text is.
4. List up to 5 extra `graceful` or `upstream-fix` candidates with
   instrumented mechanisms as `proposed` in the registry, for a future run.
   Batch 5 files only T10–T13.

## Write-set

`test/corpus/failure-sites.json`, `plans/graceful-failure/batch-4/mirror-sites.md`.

## Read-set

- `plans/graceful-failure/decisions.md` (D3, D4, D6)
- `src/errors.ts:20-90` (codes and friendly messages)
- C functions and port symbols named by each row, by symbol only

## Acceptance criteria

- Given the registry, when T7 finishes, then 0 rows are `unclassified`, and
  the failure-sites fitness test passes.
- Given each `port-bug` row, when read, then its note gives the C
  behaviour, the port behaviour and a repro input.
- Given each proposed new `GvErrorCode` in `mirror-sites.md`, when read,
  then the consumer decision it enables is stated. Without one, the row
  uses an existing code.
- Given `mirror-sites.md`, when counted, then there are at most 6 sites and
  at most 10 files.

## Observability

The journal records the per-class counts.

## Rollback

Reversible.

## Commit

`test(corpus): classify failure sites and pick mirror pilot`
