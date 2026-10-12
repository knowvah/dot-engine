// SPDX-License-Identifier: EPL-2.0

/**
 * plantuml-ts issue 31: inputs whose spline routing fails in graphviz
 * (`Pshortestpath failed`, edge "lost"). Native `dot -Tsvg` prints the errors
 * to stderr, still writes the SVG and exits 1. The port has no exit status; it
 * must produce the same SVG, lose the same edges and report the same routing
 * failures through its `console.warn` channel (`agerrorf` in C).
 * `refs/pt-issue-31-<label>.stderr` is the captured native stderr.
 *
 * @see lib/common/routespl.c:routesplines (Pshortestpath failure)
 * @see lib/common/postproc.c:map_edge ("lost %s %s edge")
 */

import { afterEach, describe, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderSvg } from '../../src/index.js';
import { ptIssueTest } from '../helpers/known-failing.js';
import { compareSvg } from './compare.js';

const LABELS = ['inline', 'zuduxu', 'rubebe'] as const;

const LOST_EDGE_LINE = /^(?:Error: )?(lost .+ edge)$/;
const ROUTING_FAILURE = 'in routesplines, Pshortestpath failed';

function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
}

interface Diagnostics {
  /** `lost <tail> <head> edge` lines, in emission order. */
  lost: string[];
  /** Number of `in routesplines, Pshortestpath failed` reports. */
  routingFailures: number;
}

/** Pure: classify a stream of diagnostic lines (native stderr or port warnings). */
function classify(lines: readonly string[]): Diagnostics {
  const lost: string[] = [];
  let routingFailures = 0;
  for (const line of lines) {
    const m = LOST_EDGE_LINE.exec(line);
    if (m?.[1] !== undefined) lost.push(m[1]);
    else if (line.endsWith(ROUTING_FAILURE)) routingFailures += 1;
  }
  return { lost, routingFailures };
}

function nativeDiagnostics(id: string): Diagnostics {
  return classify(read(`refs/${id}.stderr`).split('\n'));
}

describe('plantuml-ts issue 31: routing failures', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function render(id: string): { svg: string; port: Diagnostics } {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const svg = renderSvg(read(`inputs/${id}.dot`), 'dot');
    const port = classify(warn.mock.calls.map((c) => String(c[0])));
    return { svg, port };
  }

  for (const label of LABELS) {
    const id = `pt-issue-31-${label}`;

    ptIssueTest(`31-${label}`, `${id} SVG matches the native oracle`, () => {
      const { svg } = render(id);
      const { pass, diffs } = compareSvg(svg, read(`refs/${id}.svg`), 'deterministic');
      expect(diffs.slice(0, 3)).toEqual([]);
      expect(pass).toBe(true);
    });

    ptIssueTest(`31-${label}-lost`, `${id} loses the same edges as native`, () => {
      const native = nativeDiagnostics(id);
      expect(native.lost.length).toBeGreaterThan(0);
      expect([...render(id).port.lost].sort()).toEqual([...native.lost].sort());
    });

    ptIssueTest(`31-${label}-warnings`, `${id} reports the native Pshortestpath failure count`, () => {
      const native = nativeDiagnostics(id);
      expect(native.routingFailures).toBeGreaterThan(0);
      expect(render(id).port.routingFailures).toBe(native.routingFailures);
    });
  }
});
