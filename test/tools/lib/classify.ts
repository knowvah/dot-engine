// SPDX-License-Identifier: EPL-2.0
// Failure-class assignment for fuzz rows.
import { hasDuplicateBaselineShift } from './svg-extract.js';

export interface FuzzRow {
  readonly lbl: string;
  readonly svgOk: boolean;
  readonly nErr: readonly string[];
  readonly pErr: readonly string[];
  /** Native SVG of the case (recorded by the fuzz drivers for failing rows). */
  readonly nSvg?: string;
}

export const CLASS_DUP_BASELINE_SHIFT = 'dup-baseline-shift';
const STYLE_BR = /<(b|i|u|o|s|sub|sup|font)\b[^>]*>(?:(?!<\/\1>)[\s\S])*<br/i;

/** Lines present on one side only (multiset difference, both directions). */
export function unmatchedLines(nErr: readonly string[], pErr: readonly string[]): string[] {
  const rest = [...pErr];
  const missing: string[] = [];
  for (const l of nErr) {
    const i = rest.indexOf(l);
    if (i >= 0) rest.splice(i, 1);
    else missing.push(l);
  }
  return [...missing, ...rest];
}

const STDERR_CLASSES: readonly (readonly [(l: string) => boolean, string])[] = [
  [(l) => /COMPARE THREW/.test(l), 'compare-throw'],
  [(l) => /is not a known color/.test(l), '37-unknown-color'],
  [(l) => /no value for width/.test(l), '41-width'],
  [(l) => /invalid token|not well-formed|undefined entity/.test(l), '40-invalid-token'],
  [(l) => /[^\x00-\x7f]/.test(l) && /sides/.test(l), 'A5-sides-nonascii'],
];

export function classifyLine(l: string): string {
  return STDERR_CLASSES.find(([test]) => test(l))?.[1] ?? `stderr:${l.slice(0, 50)}`;
}

/** SVG-mismatch class: native duplicate baseline-shift first (item 65), then 35, else other. */
export function classifySvg(r: FuzzRow): string {
  if (r.nSvg !== undefined && hasDuplicateBaselineShift(r.nSvg)) return CLASS_DUP_BASELINE_SHIFT;
  return STYLE_BR.test(r.lbl) ? 'svg(35-br-in-style?)' : 'svg-other';
}

export function classes(r: FuzzRow): string[] {
  const c = new Set<string>();
  for (const l of unmatchedLines(r.nErr, r.pErr)) c.add(classifyLine(l));
  if (!r.svgOk) c.add(classifySvg(r));
  return [...c];
}

const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Narrow a parsed JSONL value (no schema library in this repo) to a FuzzRow. */
export function parseFuzzRow(line: string): FuzzRow {
  const v: unknown = JSON.parse(line);
  const r = v as Record<string, unknown> | null;
  if (r === null || typeof r !== 'object' || typeof r.lbl !== 'string' || typeof r.svgOk !== 'boolean' || !isStrings(r.nErr) || !isStrings(r.pErr)) {
    throw new Error(`not a fuzz row: ${line.slice(0, 80)}`);
  }
  return { lbl: r.lbl, svgOk: r.svgOk, nErr: r.nErr, pErr: r.pErr, ...(typeof r.nSvg === 'string' ? { nSvg: r.nSvg } : {}) };
}

/** Class -> count over JSONL text of fuzz rows. */
export function tallyRows(jsonl: string): { bad: number; classes: Record<string, number> } {
  const rows = jsonl
    .split('\n')
    .filter(Boolean)
    .map(parseFuzzRow);
  const tally: Record<string, number> = {};
  for (const r of rows) for (const k of classes(r)) tally[k] = (tally[k] ?? 0) + 1;
  return { bad: rows.length, classes: tally };
}
