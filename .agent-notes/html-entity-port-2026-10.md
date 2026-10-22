## Observation: plain-object lookups keyed by label text hit Object.prototype
- **Context**: Porting `utils.c:htmlEntity` (follow-up 39).
- **Finding**: `HTML_ENTITIES[name]` on a plain object returned `Object.prototype.valueOf` for `&valueOf;`; `String.fromCodePoint(fn)` threw and the label rendered nothing. Any table keyed by user text needs `Object.hasOwn` (or a `Map`).
- **Impact**: Check every `Record<string, …>` lookup on input-derived keys when touching it.
- **Confidence**: High

## Observation: plain labels and HTML labels decode entities by different rules
- **Context**: Same task.
- **Finding**: Plain labels and tooltips use `htmlEntity` (`X` hex allowed, at most 6 decimal or 5 hex digits, `&#;` consumes `#;` and keeps `&`, no `apos`, names must end within 8 chars). HTML text uses scanEntity then expat (`apos` valid, `&#X` an invalid token, any digit count). The port now has `htmlEntityUTF8` and `decodeTextRefs` for them. Do not merge the two.
- **Impact**: Entity changes must be probed against native in both label kinds.
- **Confidence**: High

## Observation: pooled-worker byte diffs show history-dependent output
- **Context**: main vs branch byte-identity run with resident worker threads.
- **Finding**: 8 of 680 outputs differed between bundles and were identical in fresh processes. Use one process per job (as item 34 did), or treat pooled diffs as unconfirmed until re-run in isolation. Root cause not found (follow-up 42).
- **Impact**: Byte-identity harnesses.
- **Confidence**: High (effect); Unknown (mechanism)
