# Survey: what the change reaches, and how it was chosen

## Reach

The change runs for every record or Mrecord node, under every engine:

1. `recordMakeLabel` no longer measures the record label. Output changes only
   where measuring printed something (a warning). The measured spans were
   never drawn: fields carry their own labels.
2. Field labels are html when the record's value is html-like and non-empty.
   This changes only html records.
3. `genFields` emits through `renderOneLabel`. For a text field it draws the
   same spans as `renderLabel` did (smoke and survey: no text-field diff).
4. `plainNodeLabel` tests `lbl.html`. For a non-record node, `lbl.html` is set
   exactly when `u.kind` is `'html'` (`makeHtmlLabelTo` clears `html` on
   failure), so only html records change.

## Probes (`probes/`, matrix in `probe.ts`)

Chosen by path: the issue's repro and its `shape=record` twin; html text
fields with nesting and font tags (`text-fields`, `font`); html whitespace and
the hard-space escape (`spaces`); rankdir=LR flip (`lr`); empty html values
(`empty`, labels.c:119); an html field that fails to parse (`unknown-elem`,
the case `record.branch.test.ts:257` mis-pinned); table `PORT`s and edges
(`table-port`); xlabel and edge label beside an html record (`xlabel`); a raw
tab in a text record and in an html record (`ctl-218`, `ctl-html`); #218's
corpus input (`b545-218`, a copy of `graphs/b545.gv`); and a text record with
ports next to an html one (`plain-mix`, control for the plain branch).

Out of scope, reported but not counted: `oos-bad-format` (#269, #287),
`oos-bad-field` (#288), `oos-html-subst` (#287) and `oos-name-default` (#289).
Each differs on base and prototype for a reason named in decisions.md AD-3.
`oos-bad-format`'s three `-Tdot` rows equalled native on base by accident and
differ on the prototype until #287 (decisions.md AD-1 consequences).

Planning results (`results/probe-prototype.tsv`): 210 in-scope rows, base 0
equal to native (168 stdout, 42 stderr only), prototype 210.

## Corpus (gate 6)

`survey-ids.txt`: every manifest id whose input contains `record`
(case-insensitive) and whose status is `applicable`, a superset of the inputs
with a record node. That is 81 ids. Three more contain `record` but are
quarantined `oracle-crash` (`tree-doc-dotguide-structs`,
`tree-doc-infosrc-record`, `tree-graphs-directed-structs`): native crashes on
them, so there is nothing to compare, and bytediff refuses non-applicable ids. Each runs under `dot,osage`, except `1864` (14 MB, every node an
html Mrecord), which runs under `osage` only. Under dot, native fails on it
(`oracle-error` in `parity.json`), as the issue says. Only `1864` puts an
html label on a record; the other ids with html labels (`894589`,
`graphs-ports`, the two `ports_dot`) put them on non-record nodes.

Command (after the smoke run, load ≤ 12):

```
BD_ENGINES=dot,osage BD_FORMATS=svg,xdot,json,plain,cmapx,dot BD_CAP_MS=300000 \
  npx tsx test/tools/bytediff.ts <base.mjs> <head.mjs> \
  plans/issue-195-record-html-label/harness/survey-ids.txt <out.json>
```

Results and the native classification of every diff: journal row 3.
