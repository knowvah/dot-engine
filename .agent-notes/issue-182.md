# issue-182 mission — observations (2026-11-17)

## Observation: `agnameof` hands every anonymous graph the same buffer, and `fillMap` keys on it
- **Context**: porting `fillMap`'s `Two clusters named <s> - the second will be ignored` (#182).
- **Finding**: `agnameof` prints an anonymous graph's `%<id>` into one `static char buf[32]`
  (`lib/cgraph/id.c:161-164`). `fillMap` stores the returned pointer as the map key
  (`lib/common/utils.c:1505`, `ip->name = s`). After the first anonymous cluster is inserted, every
  later anonymous cluster's `dtmatch` compares the buffer with itself and warns, printing its own
  `%N`. Native 16.1.1: `2475_2` (805 anonymous `cluster=true` subgraphs) warns 804 times;
  `plans/issue-182-dup-cluster-warn/harness/probes/anon.gv` (3) warns for `%7` and `%13`.
  The port models it with a flag (`anonKeyed`, `src/common/clust-map.ts`).
- **Impact**: any C code that keeps `agnameof`'s result past the next `agnameof` call (a map key, a
  saved pointer) behaves as if all anonymous graphs had one name. A source-named `"%x"` is stored
  by cgraph and is not aliased (#194).
- **Confidence**: High (native stderr in `harness/native/`, survey rows in `harness/results/`)

## Observation: native fdp segfaults on some runs of a duplicate-cluster input
- **Context**: capturing native fdp stderr for the probes and the survey.
- **Finding**: 16.1.1 `-Kfdp` dies on SIGSEGV on some runs of an input with two clusters of one
  name: 6 of 30 on `probes/dup.gv`, 4 of 30 on `probes/dupc.gv`, every run of `probes/dup3c.gv`
  (planning counts); in the survey, five of five on corpus `2239` and `2717`. The fillMap
  warnings are written before the crash, so stderr is complete and stdout is empty. Native fdp
  stdout on `2475_2` also differs from run to run (four md5s in four runs).
- **Impact**: retry a crashed native fdp run before reading its stdout; compare stderr only when
  it keeps crashing; never call native fdp on these inputs from a test.
- **Confidence**: High

## Observation: the smoke bytediff compares stderr too
- **Context**: gate 5 of a fix that only adds a stderr line.
- **Finding**: `test/tools/bd-job.ts` writes the render output, then `\n--stderr--\n` and every
  console line, and `bytediff.ts` compares the whole text. A stderr-only fix therefore shows as
  changed outputs (here 5: `graphs-b7` under fdp, one per format), each with stdout untouched.
- **Impact**: a brief for a warning-only change must not promise "0 changed outputs"; split each
  saved pair in `<out>.json.d/` at `--stderr--` and judge stdout and stderr against native apart.
- **Confidence**: High

## Observation: what the issue harness `compare.mjs` does and does not show
- **Context**: steps 4 and 6 of T1.
- **Finding**: its `base`/`head` columns count native lines missing from each side; they do not
  say that head stdout equals base stdout. Its child captures only what goes through `agseterrf`,
  so lines the port writes with `console.warn` (pathplan's `shortest.c` messages) never reach the
  stderr verdict, and parse messages say `input` where native names the file. A row can be `DIFF`
  for those reasons alone. `harness/survey-run.mjs` adds the direct head-against-base column.
- **Impact**: read a `DIFF` stderr row by diffing the two stderrs before blaming the port.
- **Confidence**: High

## Observation: three cluster inputs the port does not finish under fdp in 90 s
- **Context**: survey set A.
- **Finding**: `share/examples/world.gv`, `2108.dot` and `2621.dot` under `-Kfdp` exceed a 90 s
  cap on base and head (`world.gv` also under dot at 300 s; native exceeds 60 s on `world.gv`
  and `2621`). Warnings printed at fdp init are still observable with an `agseterrf` function
  that writes to fd 2 at once (`writeSync(2, s)`), since the child otherwise prints only at exit.
- **Impact**: a survey that needs a finished port render cannot judge these rows.
- **Confidence**: High (timings from one run each)
