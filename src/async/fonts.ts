// SPDX-License-Identifier: EPL-2.0
import { canvasFont } from '../common/css-font.js';
import type { FontRequest } from './collect.js';

/** A font that could not be made available before measuring. */
export type FontIssue = { face: string; reason: 'failed' | 'timeout' };

/** Structural subset of `FontFaceSet`; the real object satisfies it. */
export interface FontSetLike {
  load(font: string): Promise<readonly { status?: string }[]>;
}

type Outcome = FontIssue['reason'] | 'ok';

async function settle(set: FontSetLike, face: string): Promise<Outcome> {
  try {
    const faces = await set.load(face);
    return faces.some((f) => f.status === 'error') ? 'failed' : 'ok';
  } catch {
    // A rejected load is reported as a `failed` issue, not rethrown.
    return 'failed';
  }
}

function toIssues(faces: readonly string[], outcomes: readonly Outcome[]): FontIssue[] {
  const issues: FontIssue[] = [];
  faces.forEach((face, i) => {
    const reason = outcomes[i];
    if (reason === undefined || reason === 'ok') return;
    console.warn(`dot-engine: font "${face}" ${reason}`);
    issues.push({ face, reason });
  });
  return issues;
}

/**
 * Loads every distinct CSS font the requests map to (in parallel, sharing one
 * deadline) so canvas measurement sees real faces rather than fallbacks.
 * Resolves with one {@link FontIssue} per face that failed or timed out;
 * never rejects. An undefined `fontSet` yields `[]` immediately.
 */
export async function loadFonts(
  fontSet: FontSetLike | undefined,
  fonts: readonly FontRequest[],
  timeoutMs: number,
): Promise<FontIssue[]> {
  if (fontSet === undefined) return [];
  const faces = [...new Set(fonts.map((f) => canvasFont(f.fontname, f.fontsize, f.flags)))];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<Outcome>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
  });
  try {
    const outcomes = await Promise.all(
      faces.map((face) => Promise.race([settle(fontSet, face), deadline])),
    );
    return toIssues(faces, outcomes);
  } finally {
    clearTimeout(timer);
  }
}
