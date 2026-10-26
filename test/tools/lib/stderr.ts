// SPDX-License-Identifier: EPL-2.0
// Stderr normalisation for native-vs-port comparison.

/**
 * AD-10: the native CLI reading stdin prefixes lexer errors with `<stdin>: `
 * (lib/cgraph/scan.l:157, InputFile set); the port mirrors agmemread, which leaves
 * InputFile unset and never prints it.
 */
export const STDIN_PREFIX = '<stdin>: ';

export function stripStdinPrefix(line: string): string {
  return line.startsWith(STDIN_PREFIX) ? line.slice(STDIN_PREFIX.length) : line;
}

/** Non-empty stderr lines with the leading `<stdin>: ` stripped from each. */
export function normalizeStderrLines(text: string): string[] {
  return text
    .split('\n')
    .filter((l) => l.length > 0)
    .map(stripStdinPrefix);
}
