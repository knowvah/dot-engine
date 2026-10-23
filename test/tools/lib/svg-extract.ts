// SPDX-License-Identifier: EPL-2.0
// Pure SVG extraction and comparison for the parity probe.

/** Numeric tolerance of the parity probe (same as test/golden XDOT_TOLERANCE). */
export const PROBE_TOLERANCE = 0.01;

export interface TextSpan {
  readonly text: string;
  readonly x: string | null;
  readonly y: string | null;
}

export interface NodeShape {
  /** First of points / d / cx on the node's first shape element. */
  readonly key: string;
  readonly rx: string | null;
  readonly ry: string | null;
}

const TEXT_RE = /<text([^>]*)>([^<]*)</g;
const SHAPE_RE = /<g id="node\d+" class="node">[\s\S]*?<(?:polygon|ellipse|path)([^>]*)>/g;
const KEY_RE = /\s(?:points|d|cx)="([^"]*)"/;

function attr(tag: string, name: string): string | null {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null;
}

/** Every `<text>` span with its content and x/y attributes. */
export function extractTextSpans(svg: string): TextSpan[] {
  return [...svg.matchAll(TEXT_RE)].map((m) => ({
    text: m[2] ?? '',
    x: attr(m[1] ?? '', 'x'),
    y: attr(m[1] ?? '', 'y'),
  }));
}

/** The first shape of every node group (polygon points, path d, or ellipse cx/rx/ry). */
export function extractNodeShapes(svg: string): NodeShape[] {
  const out: NodeShape[] = [];
  for (const m of svg.matchAll(SHAPE_RE)) {
    const tag = m[1] ?? '';
    const key = KEY_RE.exec(tag)?.[1];
    if (key === undefined) continue;
    out.push({ key, rx: attr(tag, 'rx'), ry: attr(tag, 'ry') });
  }
  return out;
}

/** Equal as numbers within `tol`, else equal as strings (null = absent). */
export function closeValue(a: string | null, b: string | null, tol: number): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  const x = Number(a);
  const y = Number(b);
  return Number.isFinite(x) && Number.isFinite(y) && a.trim() !== '' && b.trim() !== '' && Math.abs(x - y) <= tol;
}

function sameLength<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length;
}

export function textSpansMatch(a: readonly TextSpan[], b: readonly TextSpan[], tol = PROBE_TOLERANCE): boolean {
  return (
    sameLength(a, b) &&
    a.every((s, i) => {
      const t = b[i]!;
      return s.text === t.text && closeValue(s.x, t.x, tol) && closeValue(s.y, t.y, tol);
    })
  );
}

export function nodeShapesMatch(a: readonly NodeShape[], b: readonly NodeShape[], tol = PROBE_TOLERANCE): boolean {
  return (
    sameLength(a, b) &&
    a.every((s, i) => {
      const t = b[i]!;
      return s.key === t.key && closeValue(s.rx, t.rx, tol) && closeValue(s.ry, t.ry, tol);
    })
  );
}

/** True when some element of `svg` carries the attribute `baseline-shift` more than once. */
export function hasDuplicateBaselineShift(svg: string): boolean {
  for (const m of svg.matchAll(/<[a-zA-Z][^>]*>/g)) {
    if (m[0].split('baseline-shift=').length > 2) return true;
  }
  return false;
}
