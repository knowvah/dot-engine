// SPDX-License-Identifier: EPL-2.0

/**
 * The one stderr writer for messages C prints through cgraph's agerr family
 * (`agerr`, `agerrorf`, `agwarningf`, `AGPREV` continuations). Sites whose C
 * counterpart is `fprintf(stderr)`/`fputs`/`printf` do not use it.
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

registerRenderState(() => {
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
  if (channel === 'warn') console.warn(escapeControl(line));
  else console.error(escapeControl(line));
}

/**
 * The part of C's `agerr(level, ...)` that is not formatting: the `Error: `/
 * `Warning: ` prefix (none for AGPREV), escaping, and the console channel
 * (`console.warn` for warnings, `console.error` otherwise; AGPREV continues
 * the previous level's channel).
 * @see lib/cgraph/agerror.c:out
 */
export function agerr(level: AgerrLevel, msg: string, channel?: AgerrChannel): void {
  if (level === 'prev') {
    agerrLineOn(channel ?? (lastLevel === 'warning' ? 'warn' : 'error'), msg);
    return;
  }
  lastLevel = level;
  const prefix = level === 'error' ? PREFIX_ERROR : PREFIX_WARNING;
  agerrLineOn(channel ?? (level === 'warning' ? 'warn' : 'error'), `${prefix}${PREFIX_SEP}${msg}`);
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
