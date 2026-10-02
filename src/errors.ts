// SPDX-License-Identifier: EPL-2.0

/**
 * Public structured-error contract for @knowvah/dot-engine.
 *
 * Consumers branch on the stable `code` / `type` fields; the
 * `code -> friendlyMessage` map is the single seam a future i18n library
 * replaces. This module is a runtime leaf: the only project import is the
 * type-only `Expectation`, which is erased at compile time.
 *
 * @see plans/structured-errors/decisions.md
 */

import type { Expectation } from './parser/dot.js';

/** Stable public alias of peggy's expectation union (SYNTAX_* errors only). */
export type GvExpectation = Expectation;

/** Coarse classification of where an error originated. */
export type GvErrorType = 'syntax' | 'semantic' | 'render';

/** Closed union of stable error codes — each is an i18n key. */
export type GvErrorCode =
  | 'SYNTAX_ERROR' // peggy parse failure (token found)
  | 'SYNTAX_UNEXPECTED_EOF' // peggy parse failure, found === null
  | 'EDGE_OP_DIRECTED_IN_UNDIRECTED' // '->' used in an undirected graph
  | 'EDGE_OP_UNDIRECTED_IN_DIRECTED' // '--' used in a digraph
  | 'HTML_PARSE_ERROR' // HTML-like label parse failure
  | 'RENDER_ERROR' // known layout/render-stage failure
  | 'INTERNAL_ERROR' // dot-engine bug (assert / invariant / foreign throw)
  | 'UNKNOWN_LAYOUT' // graph layout="..." names no registered engine
  | 'UNSUPPORTED_FEATURE' // graph uses a Graphviz feature not yet ported
  | 'GENERIC_ERROR'; // catch-all fallback

/** Structured error contract shared by every error source. */
export interface GvError {
  type: GvErrorType;
  /** Stable i18n key. */
  code: GvErrorCode;
  /** Concise technical text we own (may diverge from C). */
  message: string;
  /** Approachable, non-localized English (delivery). */
  friendlyMessage: string;
  /** Real error position; the highest-value field. */
  location?: { line: number; column: number; offset?: number };
  /** Peggy's discriminated union, passed through unmapped; SYNTAX_* only. */
  expected?: GvExpectation[];
}

/** Result of a result-style render: `svg` XOR `errors` for v1. */
export interface RenderResult {
  /** Present on success. */
  svg?: string;
  /** Present on failure; length <= 1 (first failure only) for v1. */
  errors?: GvError[];
}

/**
 * Central `code -> friendlyMessage` map. Non-localized, approachable English.
 * This is the seam a future i18n library replaces.
 */
export const FRIENDLY_MESSAGES: Record<GvErrorCode, string> = {
  SYNTAX_ERROR: 'There is a syntax error in the DOT source.',
  SYNTAX_UNEXPECTED_EOF:
    'The DOT source ended unexpectedly — a bracket or statement may be unclosed.',
  EDGE_OP_DIRECTED_IN_UNDIRECTED:
    "A directed edge '->' was used in an undirected graph; use '--' instead.",
  EDGE_OP_UNDIRECTED_IN_DIRECTED:
    "An undirected edge '--' was used in a directed graph; use '->' instead.",
  HTML_PARSE_ERROR: 'An HTML-like label could not be parsed.',
  RENDER_ERROR: 'The graph could not be laid out or rendered.',
  INTERNAL_ERROR:
    'dot-engine hit an internal bug while processing the graph. Please report it with the DOT source that triggered it.',
  UNKNOWN_LAYOUT: 'The graph names a layout engine that is not available.',
  UNSUPPORTED_FEATURE:
    'The graph uses a Graphviz feature that dot-engine does not support yet.',
  GENERIC_ERROR: 'An unexpected error occurred while rendering the graph.',
};

/**
 * Look up the approachable English message for a code. The single seam a
 * future i18n library replaces.
 */
export function friendlyMessageFor(code: GvErrorCode): string {
  return FRIENDLY_MESSAGES[code];
}

/** Codes a {@link RenderError} types as `semantic` rather than `render`. */
const SEMANTIC_RENDER_CODES: ReadonlySet<GvErrorCode> = new Set<GvErrorCode>([
  'UNKNOWN_LAYOUT',
  'UNSUPPORTED_FEATURE',
]);

/**
 * Abstract base of every library-originated error: `instanceof
 * DotEngineError` means dot-engine failed on this input (bad input, a fatal
 * error Graphviz itself would report, or a dot-engine bug). Each subclass
 * sets a hard-coded `name`.
 */
export abstract class DotEngineError extends Error implements GvError {
  abstract readonly type: GvErrorType;
  abstract readonly code: GvErrorCode;
  abstract readonly friendlyMessage: string;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

/** A dot-engine bug: failed assertion, broken invariant or foreign throw. */
export class InternalError extends DotEngineError {
  readonly type = 'render';
  readonly code = 'INTERNAL_ERROR';
  readonly friendlyMessage = friendlyMessageFor('INTERNAL_ERROR');

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InternalError';
  }
}

/**
 * Error thrown for known layout/render-stage failures. `type` is `semantic`
 * for `UNKNOWN_LAYOUT` / `UNSUPPORTED_FEATURE`, otherwise `render`.
 */
export class RenderError extends DotEngineError {
  readonly type: GvErrorType;
  readonly code: GvErrorCode;
  readonly friendlyMessage: string;

  constructor(
    message: string,
    code: GvErrorCode = 'RENDER_ERROR',
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'RenderError';
    this.code = code;
    this.type = SEMANTIC_RENDER_CODES.has(code) ? 'semantic' : 'render';
    this.friendlyMessage = friendlyMessageFor(code);
  }
}

/** Guard shared by every boundary: structural check, works across bundles. */
export function isGvError(e: unknown): e is GvError {
  if (typeof e !== 'object' || e === null) return false;
  const c = e as { type?: unknown; code?: unknown };
  return typeof c.type === 'string' && typeof c.code === 'string';
}

// ── Usage errors (caller mistakes; not DotEngineError, not GvError) ─────────

/** Node-style codes carried by caller-mistake errors. */
export type UsageErrorCode =
  | 'ERR_INVALID_ARG_TYPE'
  | 'ERR_INVALID_ARG_VALUE'
  | 'ERR_OUT_OF_RANGE'
  | 'ERR_INVALID_STATE';

/** TypeError carrying a usage code; `name` stays `TypeError`. */
export class UsageTypeError extends TypeError {
  readonly code: UsageErrorCode;

  constructor(message: string, code: UsageErrorCode) {
    super(message);
    this.code = code;
  }
}

/** RangeError carrying a usage code; `name` stays `RangeError`. */
export class UsageRangeError extends RangeError {
  readonly code: UsageErrorCode;

  constructor(message: string, code: UsageErrorCode) {
    super(message);
    this.code = code;
  }
}

/** Error carrying a usage code; `name` stays `Error`. */
export class UsageStateError extends Error {
  readonly code: UsageErrorCode;

  constructor(message: string, code: UsageErrorCode) {
    super(message);
    this.code = code;
  }
}

/** Short description of a received value for usage-error messages. */
function describeReceived(v: unknown): string {
  if (v === null || v === undefined) return String(v);
  switch (typeof v) {
    case 'string':
      return `string ${JSON.stringify(v)}`;
    case 'number':
    case 'boolean':
    case 'bigint':
      return `${typeof v} ${String(v)}`;
    case 'function':
      return 'a function';
    case 'symbol':
      return 'a symbol';
    default: {
      const ctor = (v as { constructor?: { name?: unknown } }).constructor;
      return typeof ctor?.name === 'string' && ctor.name !== ''
        ? `an instance of ${ctor.name}`
        : 'an object';
    }
  }
}

/** Wrong type, `null` or a missing required argument. */
export function invalidArgType(
  param: string,
  expected: string,
  actual: unknown,
): TypeError {
  return new UsageTypeError(
    `The "${param}" argument must be of type ${expected}. Received ${describeReceived(actual)}`,
    'ERR_INVALID_ARG_TYPE',
  );
}

/** Unknown engine/format name (or other enum-like value) as an argument. */
export function invalidArgValue(
  param: string,
  value: unknown,
  allowed: readonly string[],
): TypeError {
  return new UsageTypeError(
    `The argument "${param}" is invalid. Received ${JSON.stringify(value)}; allowed: ${allowed.join(', ')}`,
    'ERR_INVALID_ARG_VALUE',
  );
}

/** Numeric argument outside its range. */
export function outOfRange(
  param: string,
  range: string,
  value: number,
): RangeError {
  return new UsageRangeError(
    `The value of "${param}" is out of range. It must be ${range}. Received ${String(value)}`,
    'ERR_OUT_OF_RANGE',
  );
}

/** Call made in the wrong state (e.g. `getLayout` before layout). */
export function invalidState(message: string): Error {
  return new UsageStateError(message, 'ERR_INVALID_STATE');
}

/** True for errors built by the usage-error factories. */
export function isUsageError(e: unknown): boolean {
  return (
    e instanceof UsageTypeError ||
    e instanceof UsageRangeError ||
    e instanceof UsageStateError
  );
}

// ── Public-boundary catch (shared by every entry point; not re-exported) ────

/** Message of any thrown value. */
export function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Boundary `catch` (ADR-5): usage errors and {@link GvError}s re-surface
 * unchanged; anything else is a dot-engine bug and becomes an
 * {@link InternalError} keeping the original as `cause`.
 */
export function rethrowAtBoundary(err: unknown): never {
  if (isUsageError(err) || isGvError(err)) throw err;
  throw new InternalError(messageOf(err), { cause: err });
}
