# T4: built-in SVG scrubber (ADR-6)

## Context
README "Security": output embeds attacker-controlled hrefs/stylesheets when DOT is
untrusted; the library has zero runtime deps, so `renderSvgInto` (T6) uses this
scrubber unless the caller sanitizes or opts in to `trusted`.

## Task
`scrubSvgDocument(doc: Document): void` mutating a document parsed from the SVG
(DOM Level 2 APIs only, so xmldom works in tests and browsers in production):
remove `<script>`, `<foreignObject>`; remove `<set>`/`<animate>`/`<animateMotion>`/
`<animateTransform>` whose `attributeName` is `href`/`xlink:href` (case-insensitive);
remove every attribute whose name starts with `on` (case-insensitive); remove
`href`/`xlink:href` values that, after stripping ASCII whitespace/control chars and
lowercasing, start with `javascript:` or `vbscript:`, or start with `data:` unless
the element is `<image>` and the value starts with `data:image/`; remove
`xml-stylesheet` processing instructions. Also expose
`scrubSvgString(svg: string, parser: { parseFromString }, serializer): string` for tests.
If a vector's handling is unclear, stop (README stop 6).

## Write-set
`src/async/sanitize.ts`, `src/async/sanitize.test.ts` (new).

## Interface contract (consumed by T6)
`export function scrubSvgDocument(doc: Document): void`.

## Acceptance criteria
- Given `<a xlink:href=" JaVa\tScript:alert(1)">`, then the href is removed, element kept.
- Given `onclick`/`ONLOAD` attributes and a `<script>`, then all removed.
- Given an inlined `<image xlink:href="data:image/png;base64,...">`, then kept; given
  `<a href="data:text/html,...">`, then removed.
- Given `<?xml-stylesheet href="x.css"?>` and `<set attributeName="href" to="javascript:…">`, then removed.
- Given a real `renderSvg` output with no hostile content (golden inputs incl.
  inlineImages), then no element or attribute is removed.

## Shared rules

Read the repo `CLAUDE.md`, `../decisions.md`, `../conventions.md` and
`../DESIGN.md` first. Scratch files go in the executor scratchpad under
`<task-id>/`. Write-set only; stop and report on anything else (README stop
conditions). Observability: N/A. Rollback: Reversible.
