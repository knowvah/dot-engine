// SPDX-License-Identifier: EPL-2.0
//
// mode=ipsep (neatoinit.c:majorization -> stress_majorization_cola) against
// native graphviz 16.1.0 `-Kneato -Txdot` output. Fixtures under
// __fixtures__/ipsep/ are the oracle's own output (GVBINDIR=ghl16-all), with
// `<case>.xdot.stderr` and the `-v` stress trace as `<case>.trace`. C has no
// ipsep tests, so these probes are the specification (part-7 AD-4).
//
// The 7 unconstrained probes must stay byte-identical (part-7 AD-2). The
// constrained probes are held to 0.01 once T10 wires stress_majorization_cola.
// @see lib/neatogen/neatoinit.c:majorization
// @see lib/neatogen/constrained_majorization_ipsep.c:stress_majorization_cola
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse, render } from '../../index.js';

const FIXTURES = new URL('./__fixtures__/ipsep/', import.meta.url);

/** No constraint options: the cola driver runs plain stress majorization. */
const UNCONSTRAINED = [
  'ipsep-grid', 'ipsep-k6', 'ipsep-rand', 'ipsep-rand-len', 'ipsep-tree', 'kd-ipsep', 'kd-ipsep-len',
] as const;

/** diredgeconstraints, overlap=ipsep|vpsc, clusters, models and start=self. */
const CONSTRAINED = [
  'big-dired', 'cluster', 'dired-hier', 'dired-hier-levelsgap', 'dired-hier-sep', 'dired-true',
  'len-dired', 'model-circuit', 'model-mds', 'model-mds-len', 'model-subset', 'overlap-ipsep',
  'overlap-vpsc', 'start-self', 'start-self-dired',
] as const;

const read = (name: string): string => readFileSync(new URL(name, FIXTURES), 'utf8');
const neatoXdot = (src: string): string => String(render(parse(src), 'xdot', { engine: 'neato' }));

describe('unconstrained ipsep probes are byte-identical to native', () => {
  it.each(UNCONSTRAINED)('%s', (id) => {
    expect(neatoXdot(read(`${id}.gv`))).toBe(read(`${id}.xdot`));
  });
});

describe('constrained ipsep probes match native at 0.01', () => {
  for (const id of CONSTRAINED) it.todo(id);
});
