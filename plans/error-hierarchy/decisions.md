# Architecture decisions (pre-made, locked)

Approved by the owner 2026-10-02. Each choice was checked against primary sources
for TypeScript/JavaScript idiom (sources at the bottom); the owner's constraint is
**no non-idiomatic or uncommon choices**, and everything must stay TS 7 compatible.

## ADR-1: Abstract base `DotEngineError`

- **Context:** `ParseError`, `HtmlParseError` and `RenderError` each extend `Error`
  directly; a consumer cannot catch "any dot-engine failure" by class.
- **Decision:** `export abstract class DotEngineError extends Error implements GvError`.
  Constructor `(message: string, options?: ErrorOptions)` calls
  `super(message, options)`. Every subclass sets a **hard-coded** `this.name = 'X'`
  in its constructor (never `this.constructor.name`, which minifiers break).
  No `Object.setPrototypeOf` (only needed for ES5 targets, which TS 6/7 removed). No
  `Error.captureStackTrace` (non-standard).
- **Meaning:** `instanceof DotEngineError` = "dot-engine failed on this input": bad
  input, a fatal error Graphviz itself would report, or a dot-engine bug.
- **Consequences:** `new DotEngineError()` is a compile error. `instanceof` works
  within one bundle; ADR-6 covers cross-bundle checks.

## ADR-2: Erasable, TS 7-friendly syntax in new and changed code

- **Decision:** explicit `readonly` fields assigned in the constructor. **No**
  parameter properties, **no** `enum`s (both fail TS `erasableSyntaxOnly`). Codes are
  string-literal unions. **Never** redeclare `message` or `cause` as class fields:
  with `useDefineForClassFields` (ES2022 default) a field would reset them after
  `super()`. Use `ErrorOptions` from `lib.es2022.error.d.ts`; `cause` is `unknown`.
- **Consequences:** turning on `erasableSyntaxOnly` repo-wide is a separate mission
  (7 files use enums, 4 use parameter properties). Existing `readonly type = 'syntax'`
  style initialisers on error classes stay as they are.

## ADR-3: Caller mistakes throw standard errors with Node's codes and classes

| Situation | Class | `code` |
|---|---|---|
| wrong type, `null`, missing required arg | `TypeError` | `ERR_INVALID_ARG_TYPE` |
| unknown engine/format name passed as an argument | `TypeError` | `ERR_INVALID_ARG_VALUE` |
| numeric argument outside its range | `RangeError` | `ERR_OUT_OF_RANGE` |
| call in the wrong state (`getLayout` before layout) | `Error` | `ERR_INVALID_STATE` |

- `name` stays the standard `TypeError` / `RangeError` / `Error`, as in Node.
- Internal subclasses (not exported as values) carry a typed `readonly code`;
  `UsageErrorCode` is exported as a type. Messages name the parameter and what was
  received.
- `TypeError` for an unknown enum-like value follows Node (`ERR_INVALID_ARG_VALUE` is
  a TypeError) and WebIDL (invalid enum argument → TypeError), not the core-ECMAScript
  `RangeError` used by `normalize`/`Intl`.
- Usage errors are **not** `DotEngineError`s and not `GvError`s.

## ADR-4: Every library-originated throw is a `DotEngineError`

C never throws; each `throw` in the port translates a C run that ends in failure.

| C behaviour at the site | Thrown class | `type` / `code` |
|---|---|---|
| `assert` / uncaught C++ `throw` / port-scaffolding invariant | `InternalError` (new) | `render` / `INTERNAL_ERROR` |
| `agerr…` then `graphviz_exit(EXIT_FAILURE)` | `RenderError` | `render` / `RENDER_ERROR` |
| graph `layout="…"` attribute names no registered engine | `RenderError` | `semantic` / `UNKNOWN_LAYOUT` (new) |
| foreign throw reaching a public boundary (JS `TypeError` from a bug, stack overflow) | `InternalError` with `{ cause: err }` | `render` / `INTERNAL_ERROR` |

- At C-port sites **only the thrown class changes**: same condition, same position,
  same message, so control flow and output are identical.
- `RenderError` must therefore accept `type` `semantic` for `UNKNOWN_LAYOUT`; T1
  decides the exact constructor shape within ADR-2.
- `InternalError.friendlyMessage` says it is a dot-engine bug and asks for a report.

## ADR-4a: `UNSUPPORTED_FEATURE` for unported features (approved 2026-10-02)

- **Context:** some port throws fire because the graph requests a Graphviz feature
  the port has not implemented (sfdp `smoothing=`/`rotation=`, fdp overlap modes,
  special shapes). C would honour the request, so this is neither a dot-engine bug
  (`InternalError`) nor a Graphviz error (`RENDER_ERROR`).
- **Decision:** `RenderError` with new code `UNSUPPORTED_FEATURE`, type `semantic`;
  friendly text says the graph uses a Graphviz feature dot-engine does not support
  yet. T1 adds the code; T5 uses it.
- **Consequences:** consumers can tell "your graph uses something we lack" from "we
  broke".

## ADR-5: Validate arguments before the `try`

- Each public entry point checks its own arguments before its `try` block. Usage
  errors raised deeper (the `GvcContext` registry) are re-thrown **unchanged** by the
  boundary `catch`; `GvError`s are re-thrown unchanged; anything else becomes
  `InternalError` with `{ cause }`.
- `tryRenderSvg` contract becomes: **returns** (never throws) for any DOT input;
  **throws** usage errors. Same split as zod `parse`/`safeParse`.

## ADR-6: One exported type guard, no brand symbol

- The three `isGvErrorLike` copies (`src/index.ts`, `src/render/public.ts`,
  `src/render/xdot-public.ts`) collapse into one exported
  `isGvError(e: unknown): e is GvError` (checks string `type` and `code`). This keeps
  the structured-errors ADR-2 "branch on `.code`" and works across duplicate bundles.
  No `Symbol.for` brand or `Symbol.hasInstance` (less common). No `Error.isError`
  (ES2026, not in lib es2022).

## ADR-7: Ships as 2.0.0; TS 7 type-check is a gate

- T8's commit carries a `BREAKING CHANGE:` footer. **Amended 2026-10-02 (owner):**
  2.0 also includes the follow-on unported-features mission, so this branch is the
  2.0 integration branch and is not merged to main at mission end. One final PR
  (`feat!:` title) releases 2.0.0 exactly once.
  README, API guide and `plans/structured-errors/decisions.md` are updated in-mission.
- `npm run typecheck:ts7` (tsgo) is a mission gate beside `npm run typecheck`.
- **Rollback (owner acknowledged 2026-10-02):** reversible until npm publishes 2.0.0;
  after that irreversible in practice: fix forward (2.0.x) or deprecate. The mission
  never publishes; publishing follows the owner's merge.
- **Follow-ups (out of scope):** move `typecheck:ts7` from the dev preview to TS 7 GA
  (typedoc stays on TS 6: TS 7.0 has no compiler API until 7.1); a separate
  `erasableSyntaxOnly` mission.

## Sources (retrieved 2026-10-02)

- Node errors: https://nodejs.org/api/errors.html (class per code; "use error.code").
- TS 7.0: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- TS 6.0: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- MDN `Error.cause`, `RangeError`, `Error.captureStackTrace`.
- WebIDL invalid-enum TypeError: https://lists.w3.org/Archives/Public/public-script-coord/2014JanMar/0093.html
