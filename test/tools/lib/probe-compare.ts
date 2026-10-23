// SPDX-License-Identifier: EPL-2.0
// Pure native-vs-port comparison of one probe case.
import { normalizeStderrLines } from './stderr.js';
import {
  extractNodeShapes,
  extractTextSpans,
  nodeShapesMatch,
  textSpansMatch,
} from './svg-extract.js';

export interface ProbeVerdict {
  readonly text: boolean;
  readonly poly: boolean;
  readonly stderr: boolean;
  readonly same: boolean;
}

/** Text content + x/y, node shape key + rx/ry, and stderr lines (both sides stdin-stripped). */
export function compareProbe(nativeSvg: string, portSvg: string, nativeErr: string, portErr: string): ProbeVerdict {
  const text = textSpansMatch(extractTextSpans(nativeSvg), extractTextSpans(portSvg));
  const poly = nodeShapesMatch(extractNodeShapes(nativeSvg), extractNodeShapes(portSvg));
  const stderr =
    JSON.stringify(normalizeStderrLines(nativeErr)) === JSON.stringify(normalizeStderrLines(portErr));
  return { text, poly, stderr, same: text && poly && stderr };
}

const MAX_LABEL = 70;

export function formatVerdict(v: ProbeVerdict, label: string): string {
  const ok = (b: boolean): string => (b ? 'ok' : 'X');
  const short = label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL - 3)}...` : label;
  return `${v.same ? 'SAME' : 'DIFF'} text:${ok(v.text)} poly:${ok(v.poly)} stderr:${ok(v.stderr)} | ${short}`;
}
