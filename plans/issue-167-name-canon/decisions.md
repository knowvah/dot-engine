# Decisions: issue #167

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on 2026-11-10.
Nobody confirmed these. Each names the rejected options and the evidence so the maintainer
can audit it. Every "trial" below is a throwaway edit made at planning and reverted.

### AD-1: `xdotId` delegates to `agstrcanon`

- **Decision:** in `src/render/dot/xdot-ops.ts`, `xdotId` returns `agstrcanon(s)`, with the
  padding of AD-3 for non-html names. Callers in `agwrite.ts` stay as they are. Rewrite the
  doc comment: the "over-quoting is harmless" and "only `"` is escaped" claims go.
- **Rejected:** (a) call `agstrcanon` at the seven sites in `agwrite.ts`: that file is 513
  lines, past the 500-line write hook, and the padding would have to be repeated at each.
  (b) Add wrapping only and keep the regexes: the same bypass also gets keywords, non-ascii,
  `\"` and `-.` wrong. (c) `agstrcanonText`: C passes `chk=true` (`write.c:254`), so a
  node or subgraph name with the html flag prints `<...>` (see evidence).
- **Evidence:** `write_nodename` and `write_hdr` both go `write_canonstr` →
  `_write_canonstr(chk=true)` → `agstrcanon` (`lib/cgraph/write.c:254,353,523`). On the
  base, `harness/` is 2 of 14 byte-equal to native; with the trial, 14 of 14, and all
  13,463 unit tests still pass. `Max_outputline` is already in force:
  `agstrcanonText` reads `maxOutputline()`, and `withLinelength` wraps the whole write
  (`agwrite.ts:80`).

### AD-2: the root graph's name loses the html flag in the parser

- **Decision:** `src/parser/builder.ts:478` builds the root with the marker stripped from
  `ast.id` (`isHtmlValue` / `htmlValueContent`). Node and subgraph names keep it.
- **Mechanism:** the lexer interns html strings with `agstrdup_html(ctx->G, ...)`
  (`lib/cgraph/scan.l:233`). For the root's name `G` is still NULL, so the string is in the
  global dictionary. `agopen` → `idmap` → `agstrdup(g, str)` (`lib/cgraph/id.c:52`,
  `refstr.c:401-415`) looks in the new graph's dictionary, finds no html ref with that
  pointer, and makes plain text. Later names are interned in `G`'s own dictionary and keep
  the flag.
- **Rejected:** strip inside `writeHdr`: the marker would still reach every other reader
  of the root's `g.name`, and the file is over the write limit.
- **Evidence:** native prints `digraph <h g> {` as `digraph "h g" {` and `subgraph <hs> {`
  as `subgraph <hs> {`. The port printed `digraph "\x01h g" {`.

### AD-3: keep the odd-trailing-backslash padding

- **Decision:** a non-html name whose trailing backslash run is odd gets one more backslash
  before `agstrcanon`, as `xdotId` does today. An html name is never padded: C prints
  `<a\>` verbatim and it reparses.
- **Rejected:** remove the padding to match C byte for byte. C would then print `"a\"`,
  which does not reparse. The DOT lexer cannot produce such a name, so only the
  programmatic API reaches this. The divergence is existing and documented, and #167 does
  not ask to change it.
- **Evidence:** `src/render/dot/xdot-ops.test.ts` pins the padding; it passes under the
  trial.

### AD-4: only `-Tdot`/`-Txdot` names are in scope

- **Decision:** two defects seen at planning are filed as follow-ups, drafts in
  [follow-ups.md](follow-ups.md): attribute names printed raw, and html-marked node and
  subgraph names reaching other readers. Both reproduce on the base and neither is needed
  for #167's done-condition.
- **Rejected:** widening the mission: the second one changes cluster detection and
  layout, a separate diagnosis.

### AD-5: native refs live in `harness/out/`, made by `harness/regen.sh`

- **Decision:** seven fixtures, each `-Tdot` and `-Txdot` under `dot`: 14 refs generated at
  planning with the 16.1.0 oracle and `GVBINDIR=/tmp/ghl`. The new test reads fixtures and
  refs as UTF-8, so `cnt` counts real bytes for the long Cyrillic name.
- **Rejected:** hand-written expected strings; the refs must come from native.

### AD-6: `.claude/settings.autonomous.json` is left alone

The queue driver supplies its own settings, and this brief adds no tool the existing file
lacks.

## Baseline

On `022695a2`, clean tree: `npm run typecheck` exit 0; `npm test` 570 files, 13,463 tests,
all passing. The project has no lint script; `tsc` is the bar.

## Operational readiness (auto-confirmed)

- **Observability:** N/A, a library serializer with no service surface.
- **Rollback:** Reversible, by reverting the one commit.
- **Scalability:** `agstrcanonText` costs one `TextEncoder` call per name; it already runs
  on every draw string.
- **On-call:** N/A.
- **Compatibility:** `-Tdot`/`-Txdot` bytes change only toward native. `Graph.name` of a
  root declared with an html-like name loses the internal marker, which matches `agnameof`.
