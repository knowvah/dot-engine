<!-- SPDX-License-Identifier: EPL-2.0 -->

# Errors and exceptions

dot-engine throws two kinds of error. Which kind you catch tells you who needs to
change something.

## Two families, one rule

| Family | How to recognise it | Meaning | Who acts |
|--------|---------------------|---------|----------|
| dot-engine failure | `err instanceof DotEngineError` | dot-engine failed on this input: bad DOT, a fatal error Graphviz itself would report, an unsupported Graphviz feature, or a dot-engine bug | The DOT author, or a bug report |
| Usage error | standard `TypeError` / `RangeError` / `Error` with `err.code` starting `ERR_` | The call was wrong: bad argument type, unknown engine or format name, wrong call order | The calling code |

Branch on `.code`, not on message text. Messages may change between releases;
codes are stable.

Usage errors are not `DotEngineError`s and do not implement `GvError`. Their
`name` stays `TypeError`, `RangeError` or `Error`, as in Node.js.

## Class reference

All four classes below extend `DotEngineError` and implement the `GvError` shape
(`type`, `code`, `message`, `friendlyMessage`, optional `location` and
`expected`).

### `DotEngineError` (abstract)

The common base. `instanceof DotEngineError` is true for every error dot-engine
raises about its input. It cannot be constructed directly. `type`, `code` and
`friendlyMessage` are defined by the subclasses.

### `ParseError`

| Item | Value |
|------|-------|
| Thrown when | The DOT source is not valid, or uses the wrong edge operator for the graph kind |
| `type` | `syntax` |
| Codes | `SYNTAX_ERROR`, `SYNTAX_UNEXPECTED_EOF`, `EDGE_OP_DIRECTED_IN_UNDIRECTED`, `EDGE_OP_UNDIRECTED_IN_DIRECTED`, `GENERIC_ERROR` |
| Fields | `location` (`{ line, column, offset? }`), `expected` (parser expectations; `SYNTAX_*` only), `line` and `column` getters |
| Caller action | Fix the DOT source. Show `location` and `friendlyMessage` to the author |

`GENERIC_ERROR` on a `ParseError` means the source nests so deeply that the
parser ran out of stack.

### `HtmlParseError`

| Item | Value |
|------|-------|
| Thrown when | Never reaches a caller today (see below) |
| `type` | `semantic` |
| Codes | `HTML_PARSE_ERROR` |
| Fields | `tag` (the offending token). No `location` or `expected` |
| Caller action | None. To find a bad label, compare the rendered output with what you expected |

The HTML-like label parser raises `HtmlParseError` for an unknown element, a
malformed attribute, or a misplaced `<TABLE>`, `<HR>` or `<VR>`. The layout
stage catches it and gives the label no content, as Graphviz does: the graph
still renders, with an empty label. No public function propagates it.

`HtmlParseError` is not exported from the package root. If one ever does
reach you, `err instanceof DotEngineError && err.code === 'HTML_PARSE_ERROR'`
identifies it.

### `RenderError`

| Item | Value |
|------|-------|
| Thrown when | Layout or rendering fails in a way Graphviz itself would report, the graph names an unavailable layout engine, or the graph uses a Graphviz feature dot-engine has not ported |
| `type` | `render` for `RENDER_ERROR`; `semantic` for `UNKNOWN_LAYOUT` and `UNSUPPORTED_FEATURE` |
| Codes | `RENDER_ERROR`, `UNKNOWN_LAYOUT`, `UNSUPPORTED_FEATURE` |
| Fields | `cause` when the failure wrapped another error. No `location` |
| Caller action | `RENDER_ERROR`: change the graph. `UNKNOWN_LAYOUT`: fix the `layout=` attribute. `UNSUPPORTED_FEATURE`: avoid the feature (for example, sfdp with `rotation=45`) |

### `InternalError`

| Item | Value |
|------|-------|
| Thrown when | An assertion or invariant inside dot-engine fails, or a non-dot-engine error escapes the layout or render pipeline |
| `type` | `render` |
| Codes | `INTERNAL_ERROR` |
| Fields | `cause` (the original error, when one was wrapped) |
| Caller action | Report a bug with the DOT source that triggered it |

Nothing the DOT author can change will reliably avoid an `InternalError`.

## Code reference

### `GvErrorCode`

| Code | Class | `type` | Meaning | Typical cause | Caller action | Raised by |
|------|-------|--------|---------|---------------|---------------|-----------|
| `SYNTAX_ERROR` | `ParseError` | `syntax` | Unexpected token | Typo, missing `;` or `}` | Fix DOT at `location` | `parse`, `renderSvg` |
| `SYNTAX_UNEXPECTED_EOF` | `ParseError` | `syntax` | Source ended mid-statement | Unclosed `{`, `[` or string | Fix DOT at `location` | `parse`, `renderSvg` |
| `EDGE_OP_DIRECTED_IN_UNDIRECTED` | `ParseError` | `syntax` | `->` in an undirected graph | `graph { a -> b }` | Use `--` | `parse`, `renderSvg` |
| `EDGE_OP_UNDIRECTED_IN_DIRECTED` | `ParseError` | `syntax` | `--` in a digraph | `digraph { a -- b }` | Use `->` | `parse`, `renderSvg` |
| `GENERIC_ERROR` | `ParseError` | `syntax` | Source too deeply nested to parse | Pathologically nested subgraphs | Flatten the DOT | `parse`, `renderSvg` |
| `HTML_PARSE_ERROR` | `HtmlParseError` | `semantic` | Malformed HTML-like label | Unknown element, bad attribute | None: the label renders empty | None (caught internally) |
| `RENDER_ERROR` | `RenderError` | `render` | A fatal layout or render error Graphviz would also report | Malformed input for a layout stage | Change the graph | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNKNOWN_LAYOUT` | `RenderError` | `semantic` | The graph's `layout=` attribute names no registered engine | `layout="foo"` | Fix the attribute | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `UNSUPPORTED_FEATURE` | `RenderError` | `semantic` | The graph requests a Graphviz feature dot-engine has not ported | sfdp with `rotation=45` | Avoid the feature | `renderSvg`, `render`, `getDrawOps`, `GvcContext.layout` |
| `INTERNAL_ERROR` | `InternalError` | `render` | dot-engine bug | Failed assertion, foreign throw | Report a bug | `renderSvg`, `render`, `getDrawOps`, builder methods, `GvcContext.layout` (unwrapped) |

### `UsageErrorCode`

| Code | Class | Meaning | Typical cause | Caller action | Raised by |
|------|-------|---------|---------------|---------------|-----------|
| `ERR_INVALID_ARG_TYPE` | `TypeError` | Wrong type, `null`, or a missing required argument | `renderSvg(undefined, 'dot')`, `getLayout(null)` | Fix the call | Every public function that takes arguments |
| `ERR_INVALID_ARG_VALUE` | `TypeError` | Right type, unknown value | Unregistered engine or format name; `getLayout(g, { yAxis: 'other' })` | Use a registered name or an allowed value | `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps`, `getLayout`, `GvcContext.layout`, `freeLayout`, `bestRenderer`, `renderWithContext` |
| `ERR_OUT_OF_RANGE` | `RangeError` | Numeric argument outside its range | Reserved | Fix the call | No public function raises it today |
| `ERR_INVALID_STATE` | `Error` | Call made in the wrong state | `getLayout` before layout | Lay out first (`render(g, ...)` or `ctx.layout`) | `getLayout` |

An unregistered engine argument is rejected even when the DOT source sets a valid
`layout=` attribute. The argument is checked first.

## Per-function reference

"Usage" means `TypeError` with `ERR_INVALID_ARG_TYPE`, unless a row names another
code.

| Function | Can throw |
|----------|-----------|
| `renderSvg(dotSource, engine)` | Usage (`dotSource` or `engine` not a string); `TypeError` `ERR_INVALID_ARG_VALUE` (engine not registered); `ParseError`; `RenderError`; `InternalError` |
| `tryRenderSvg(dotSource, engine)` | Usage (`dotSource` or `engine` not a string); `TypeError` `ERR_INVALID_ARG_VALUE` (engine not registered). Nothing else: every DOT-input failure is returned in `errors` |
| `parse(dotSource)` | `TypeError` `ERR_INVALID_ARG_TYPE` (`dotSource` not a string); `ParseError` |
| `render(g, format, opts?)` | Usage (`g`, `format` or `opts` wrong type); `TypeError` `ERR_INVALID_ARG_VALUE` (engine or format not registered); `RenderError`; `InternalError` |
| `getDrawOps(g, opts?)` | Usage (`g` or `opts` wrong type); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.engine` not registered); `RenderError`; `ParseError` (the intermediate xdot could not be re-parsed: a dot-engine bug); `InternalError` |
| `createGraph(opts?)` and builder methods (`addNode`, `addEdge`, `addSubgraph`, `setAttr`, ...) | Usage (wrong argument types, including attribute values that are not strings); `InternalError` (the graph model failed to create a node or subgraph) |
| `addEdge(g, tail, head, name?)` (from `/api`) | Usage (non-object `g`, `tail` or `head`; non-string `name`) |
| `getLayout(g, opts?)` | Usage (`g` or `opts` not an object); `TypeError` `ERR_INVALID_ARG_VALUE` (`opts.yAxis` not `'up'` or `'down'`); `Error` `ERR_INVALID_STATE` (graph not laid out) |
| `new GvcContext(measurer, options?)` | Usage (`measurer` has no `measure` function; `options` not an object) |
| `ctx.register(plugin)` | Usage (not a renderer plugin or layout engine) |
| `ctx.layout(g, engine)` | Usage (`g` not an object, `engine` not a string); `TypeError` `ERR_INVALID_ARG_VALUE` (engine not registered); `RenderError` `UNKNOWN_LAYOUT`. Engine failures propagate unwrapped |
| `ctx.freeLayout(g, engine)` | Usage; `TypeError` `ERR_INVALID_ARG_VALUE` (engine not registered). Engine failures propagate unwrapped |
| `ctx.bestRenderer(format)` | Usage (`format` not a string); `TypeError` `ERR_INVALID_ARG_VALUE` (no renderer for `format`) |
| `renderWithContext(ctx, g, format, inlineImages?)` | Usage (`ctx` not a `GvcContext`, `g` not an object, `format` not a string); `TypeError` `ERR_INVALID_ARG_VALUE` (no renderer for `format`). Render failures propagate unwrapped |
| `setImageSizer(sizer)` | Usage (not a function or `null`) |
| `setImageResolver(fn)` | Usage (not a function or `null`) |
| `setTextMeasurer(measurer)` | Usage (not a `TextMeasurer` or `undefined`) |

### Which functions wrap foreign throws

| Functions | Behaviour on an unexpected (non-dot-engine) throw |
|-----------|---------------------------------------------------|
| `renderSvg`, `tryRenderSvg`, `render`, `getDrawOps` | Wrapped as `InternalError`; `cause` is the original error |
| `renderWithContext` and every `GvcContext` method | **Not wrapped.** An engine bug reaches the caller as whatever the engine threw, for example a plain `TypeError` with no `code` |

If you use `GvcContext` directly, treat an error that is neither a
`DotEngineError` nor a usage error as a dot-engine bug.

## `tryRenderSvg` or `renderSvg`

| | `renderSvg` | `tryRenderSvg` |
|---|-------------|----------------|
| Bad DOT or layout failure | Throws a `DotEngineError` | Returns `{ errors: [one] }` |
| Bad arguments | Throws a usage error | Throws a usage error |
| Error value | An `Error` with a stack and `cause` | Plain data: `type`, `code`, `message`, `friendlyMessage`, plus `location` / `expected` when present |
| Use when | Failure should abort the caller | You branch on `code`, or send the error across `postMessage` or into a log |

`tryRenderSvg` never throws for any DOT input. It throws only when the arguments
themselves are invalid, which is a bug in the calling code. The error objects it
returns carry no `cause` and no stack trace.

## Wrapped failures and `cause`

When `renderSvg`, `render` or `getDrawOps` catches an error that dot-engine did
not raise, it throws an `InternalError` whose `cause` is the original error. The
`message` is the original message.

`cause` is non-enumerable, so `JSON.stringify(err)` omits it. Walk the chain
explicitly when you log (see the last example below).

## Cross-bundle checks

`instanceof DotEngineError` works within one copy of the library. If two copies
can be loaded (duplicate bundles, a plugin host), use `isGvError(e)`. It checks
for a string `type` and `code` and works across copies. It also accepts the plain
objects `tryRenderSvg` returns.

## Examples

Separate the two families:

```ts
import { renderSvg, DotEngineError, ParseError } from '@knowvah/dot-engine';

function renderOrExplain(dot: string): string {
  try {
    return renderSvg(dot, 'dot');
  } catch (err: unknown) {
    if (err instanceof ParseError) {
      const { line, column } = err.location;
      return `DOT error at ${line}:${column}: ${err.friendlyMessage}`;
    }
    if (err instanceof DotEngineError) {
      return `${err.code}: ${err.friendlyMessage}`;
    }
    // A usage error: the call was wrong. Do not swallow it.
    throw err;
  }
}
```

Handle a `tryRenderSvg` result:

```ts
import { tryRenderSvg } from '@knowvah/dot-engine';

const result = tryRenderSvg('digraph { a ->', 'dot');
if (result.svg !== undefined) {
  console.log(result.svg.length);
} else {
  const [first] = result.errors ?? [];
  console.error(first?.code, first?.location);
}
```

Log an `InternalError` with its cause:

```ts
import { InternalError } from '@knowvah/dot-engine';

function describeChain(err: unknown): string[] {
  const lines: string[] = [];
  let current: unknown = err;
  while (current instanceof Error) {
    lines.push(`${current.name}: ${current.message}`);
    current = current.cause;
  }
  return lines;
}

export function logFailure(err: unknown): void {
  if (err instanceof InternalError) {
    // Report this: it is a dot-engine bug. `cause` is the original error.
    console.error(describeChain(err).join(' <- '));
  }
}
```

## See also

- [API reference (curated)](/guide/api) for each function's signature.
- [Types](/guide/types) for the `GvError` and `RenderResult` shapes.
- [Generated API (TypeDoc)](/reference/) for the full `GvErrorCode` and `UsageErrorCode` unions.
