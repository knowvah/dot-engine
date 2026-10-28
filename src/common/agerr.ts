// SPDX-License-Identifier: EPL-2.0

/**
 * The one stderr writer for messages C prints through cgraph's agerr family
 * (`agerr`, `agerrorf`, `agwarningf`, `AGPREV` continuations). Sites whose C
 * counterpart is `fprintf(stderr)`/`fputs`/`printf` do not use it.
 *
 * Partial lines (AD-7): the port strips C's trailing `\n` at every call site,
 * so `agerr`/`agerrorf`/`agwarningf` always finish a line. A site whose C
 * message has no trailing `\n` (`emit.c:parseSegs`) opts in with
 * {@link agerrPartial}: the text is held, and the next `agerr*` message is
 * appended to it (its own prefix included, as C's `out` writes it) and the
 * joined line printed on the held line's channel. A held line is flushed on
 * its own by {@link agerrLineOn}/{@link agerrFinished} and by render-state
 * reset.
 */

import { registerRenderState } from './render-state.js';

/** `agerrlevel_t` as the port uses it: AGERR, AGWARN, AGPREV. */
export type AgerrLevel = 'error' | 'warning' | 'prev';

/** The console channel a line goes to. */
export type AgerrChannel = 'warn' | 'error';

const PREFIX_ERROR = 'Error';
const PREFIX_WARNING = 'Warning';
const PREFIX_SEP = ': ';
const DEL = 0x7f;
const LAST_CNTRL = 0x1f;
const WHITESPACE = new Set([0x09, 0x0a, 0x0b, 0x0c, 0x0d]);
const OCTAL_WIDTH = 3;
const OCTAL_RADIX = 8;

/**
 * The level of the last non-AGPREV message, which AGPREV continues: C's
 * `agerrno`, zero-initialised, i.e. AGWARN. Reset per render (AD-4).
 * @see lib/cgraph/agerror.c:agerrno
 */
let lastLevel: 'error' | 'warning' = 'warning';

/**
 * The held partial line and its channel (one slot: stderr has one cursor).
 * Cleared by {@link flushPending}; reset per render.
 */
const pending: { line: string | null; channel: AgerrChannel } = { line: null, channel: 'warn' };

registerRenderState(() => {
  flushPending();
  lastLevel = 'warning';
});

/**
 * `default_usererrf`: every character that `gv_iscntrl(c) && !gv_isspace(c)`
 * (0x00-0x1F except `\t\n\v\f\r`, and 0x7F) is written as `\ooo`.
 * @see lib/cgraph/agerror.c:default_usererrf
 */
export function escapeControl(message: string): string {
  let out = '';
  for (const ch of message) {
    const c = ch.codePointAt(0)!;
    if ((c <= LAST_CNTRL || c === DEL) && !WHITESPACE.has(c)) {
      out += `\\${c.toString(OCTAL_RADIX).padStart(OCTAL_WIDTH, '0')}`;
    } else out += ch;
  }
  return out;
}

/**
 * Write one already-assembled stderr line (prefix included) on a console
 * channel, escaped as `default_usererrf` would.
 */
export function agerrLineOn(channel: AgerrChannel, line: string): void {
  flushPending();
  writeLine(channel, line);
}

/** Print a held partial line, if any, as its own line. */
function flushPending(): void {
  if (pending.line === null) return;
  const { line, channel } = pending;
  pending.line = null;
  writeLine(channel, line);
}

function writeLine(channel: AgerrChannel, line: string): void {
  if (channel === 'warn') console.warn(escapeControl(line));
  else console.error(escapeControl(line));
}

/** The text `out` writes for one message: prefix (none for AGPREV) + body. */
function assemble(level: AgerrLevel, msg: string): string {
  if (level === 'prev') return msg;
  const prefix = level === 'error' ? PREFIX_ERROR : PREFIX_WARNING;
  return `${prefix}${PREFIX_SEP}${msg}`;
}

/** Console channel of a message; AGPREV continues the previous level's. */
function channelOf(level: AgerrLevel): AgerrChannel {
  const eff = level === 'prev' ? lastLevel : level;
  return eff === 'warning' ? 'warn' : 'error';
}

/**
 * Shared body of `agerr`/`agerrPartial`: record the level, assemble the text,
 * join it onto a held line (which fixes the channel), then hold or print.
 */
function emit(level: AgerrLevel, msg: string, channel: AgerrChannel | undefined, hold: boolean): void {
  const target = channel ?? channelOf(level);
  if (level !== 'prev') lastLevel = level;
  const text = assemble(level, msg);
  if (pending.line === null) {
    pending.channel = target;
    pending.line = text;
  } else pending.line += text;
  if (!hold) flushPending();
}

/**
 * The part of C's `agerr(level, ...)` that is not formatting: the `Error: `/
 * `Warning: ` prefix (none for AGPREV), escaping, and the console channel
 * (`console.warn` for warnings, `console.error` otherwise; AGPREV continues
 * the previous level's channel). Finishes the line, joining a held partial.
 * @see lib/cgraph/agerror.c:out
 */
export function agerr(level: AgerrLevel, msg: string, channel?: AgerrChannel): void {
  emit(level, msg, channel, false);
}

/**
 * `agerr` for a C message with no trailing `\n`: the line stays open and the
 * next `agerr*` message continues it. The channel follows this (first)
 * message's level unless `channel` is given.
 * @see lib/cgraph/agerror.c:out
 */
export function agerrPartial(level: AgerrLevel, msg: string, channel?: AgerrChannel): void {
  emit(level, msg, channel, true);
}

/** @see lib/cgraph/agerror.c:agerrorf */
export const agerrorf = (msg: string, channel?: AgerrChannel): void => agerr('error', msg, channel);

/**
 * @see lib/cgraph/agerror.c:agwarningf
 * `channel` overrides the console channel for sites that have always written
 * their warning on `console.error`.
 */
export const agwarningf = (msg: string, channel?: AgerrChannel): void =>
  agerr('warning', msg, channel);

/**
 * A finished line whose prefix is already part of the text. The channel
 * follows the prefix (`Warning` -> `console.warn`) unless `channel` is given.
 */
export function agerrFinished(line: string, channel?: AgerrChannel): void {
  agerrLineOn(channel ?? (line.startsWith(PREFIX_WARNING) ? 'warn' : 'error'), line);
}
