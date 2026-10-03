// SPDX-License-Identifier: EPL-2.0
/**
 * Neato `start` handling (setSeed / initRegular / checkStart) and the
 * fail-loud checks for the neato init features this port does not have
 * (smart init, the subset/circuit distance models, hier/ipsep modes).
 *
 * Each loud check sits where neato's C branches into the unported code and
 * fires only for the modes whose C path reaches it (ADR-3).
 *
 * @see lib/neatogen/neatoinit.c
 */

import { RenderError } from '../../errors.js';
import type { Graph } from '../../model/graph.js';
import { srand48 } from '../../common/random.js';
import { mapbool, isACluster } from '../dot/rank.js';
import { getPack } from '../pack/index.js';
import {
  MODE_KK, MODE_MAJOR, MODE_HIER, MODE_IPSEP, MODE_SGD,
  MODEL_CIRCUIT, MODEL_SUBSET,
} from './init.js';

/** @see lib/neatogen/neato.h:INIT_SELF */
export const INIT_SELF = 0;
/** @see lib/neatogen/neato.h:INIT_REGULAR */
export const INIT_REGULAR = 1;
/** @see lib/neatogen/neato.h:INIT_RANDOM */
export const INIT_RANDOM = 2;

/** @see lib/common/const.h:Spring_coeff */
const SPRING_COEFF = 1.0;

/** `start` keyword prefixes. @see lib/neatogen/neatoinit.c:SMART,REGULAR,RANDOM */
const START_KEYWORDS: readonly (readonly [string, number])[] = [
  ['self', INIT_SELF],
  ['regular', INIT_REGULAR],
  ['random', INIT_RANDOM],
];

const WARN_POS_IGNORED = 'node positions are ignored unless start=random';
const WARN_SELF_IGNORED = 'start=0 not supported with mode=self - ignored';

/**
 * Roots already warned about start=self under KK/SGD. C warns once per process
 * (stuff.c:330 static atomic_flag); one render is one C process here, so the
 * flag is per root graph rather than module state (multi-diagram safety).
 */
const selfWarned = new WeakSet<object>();
/** Roots already warned about the KK circuit fallback (one warning per graph). */
const circuitWarned = new WeakSet<object>();

/**
 * Classify the `start` attribute: keyword prefix, digit-led (random), else the
 * default. A random seed comes from the digits following the keyword; with
 * none, C seeds from time(), which this port keeps at the default seed 1.
 * @see lib/neatogen/neatoinit.c:setSeed
 */
export function parseStart(
  p: string | undefined, dflt: number,
): { init: number; seed: number } {
  let init = dflt;
  let rest = p ?? '';
  if (rest === '') return { init, seed: 1 };
  if (/^[A-Za-z]/.test(rest)) {
    const kw = START_KEYWORDS.find(([k]) => rest.startsWith(k));
    if (kw !== undefined) { init = kw[1]; rest = rest.slice(kw[0].length); }
  } else if (/^\d/.test(rest)) {
    init = INIT_RANDOM;
  }
  const seed = init === INIT_RANDOM && /^\d/.test(rest) ? parseInt(rest, 10) : 1;
  return { init, seed };
}

/**
 * Place the nodes on a regular polygon and mark them P_SET (positioned, not
 * pinned), so the stress kernel's initLayout starts from them.
 * @see lib/neatogen/neatoinit.c:initRegular
 */
export function initRegular(g: Graph, nG: number): void {
  let a = 0.0;
  const da = (2 * Math.PI) / nG;
  for (const np of g.nodes.values()) {
    np.info.pos = [nG * SPRING_COEFF * Math.cos(a), nG * SPRING_COEFF * Math.sin(a)];
    np.info.posSet = true;
    np.info.pinned = false; // C: ND_pinned = P_SET overrides P_PIN
    a += da;
  }
}

/**
 * Analyse `start`: place regular nodes, seed the RNG, return the init kind.
 * @see lib/neatogen/neatoinit.c:checkStart
 */
export function checkStart(
  g: Graph, nG: number = g.nodes.size, dflt: number = INIT_RANDOM,
): number {
  const { init, seed } = parseStart(g.root.attrs.get('start'), dflt);
  if (init !== INIT_RANDOM && [...g.nodes.values()].some((n) => n.attrs.has('pos'))) {
    console.warn(WARN_POS_IGNORED);
  }
  if (init === INIT_REGULAR) initRegular(g, nG);
  srand48(seed);
  return init;
}

function unsupported(attr: string, value: string, what: string): never {
  throw new RenderError(`${attr}=${value}: ${what} is not supported yet`, 'UNSUPPORTED_FEATURE');
}

/** Does C's ipsep branch build constraints? @see neatoinit.c:1132-1150 */
function ipsepHasConstraints(g: Graph): boolean {
  const dir = g.root.attrs.get('diredgeconstraints') ?? '';
  if (mapbool(dir) || /^hier/i.test(dir)) return true;
  if ((g.root.attrs.get('overlap') ?? '').toLowerCase() === 'ipsep') return true;
  return [...g.root.subgraphs.values()].some((s) => s !== g.root && isACluster(s));
}

/** @see lib/neatogen/neatoinit.c:1290 (MaxIter < 0 returns before any solver) */
function maxIterNegative(g: Graph): boolean {
  const v = g.attrs.get('maxiter') ?? g.root.attrs.get('maxiter');
  if (v === undefined) return false;
  const n = parseInt(v, 10);
  return !Number.isNaN(n) && n < 0;
}

/** @see lib/neatogen/neatoinit.c:neatoMode (DIGCOLA + IPSEPCOLA builds) */
// A function, not a constant: init.ts and start.ts import each other, so the
// MODE_* values are not yet initialised when this module body runs.
const modeByName = (): ReadonlyMap<string, number> => new Map([
  ['KK', MODE_KK], ['major', MODE_MAJOR], ['sgd', MODE_SGD],
  ['hier', MODE_HIER], ['ipsep', MODE_IPSEP],
]);

/**
 * Read the root `mode` attribute: empty/absent is MODE_MAJOR, an unknown value
 * warns with C's text and is ignored. Case sensitive, as C's streq.
 * @see lib/neatogen/neatoinit.c:neatoMode
 */
export function neatoMode(g: Graph): number {
  const str = g.root.attrs.get('mode');
  if (str === undefined || str === '') return MODE_MAJOR;
  const mode = modeByName().get(str);
  if (mode !== undefined) return mode;
  console.warn(`Illegal value ${str} for attribute "mode" in graph ${g.root.name} - ignored`);
  return MODE_MAJOR;
}

function checkMode(g: Graph, mode: number): void {
  const value = g.root.attrs.get('mode') || (mode === MODE_HIER ? 'hier' : 'ipsep');
  // @see lib/neatogen/neatoinit.c:1117 (stress_majorization_with_hierarchy)
  if (mode === MODE_HIER) unsupported('mode', value, 'hierarchical stress majorization');
  // @see lib/neatogen/neatoinit.c:1121-1170 (stress_majorization_cola)
  if (mode === MODE_IPSEP && ipsepHasConstraints(g)) {
    unsupported('mode', value, 'constrained (ipsep) majorization');
  }
}

function checkStartAttr(g: Graph, mode: number): void {
  const value = g.root.attrs.get('start');
  if (parseStart(value, INIT_RANDOM).init !== INIT_SELF) return;
  // @see lib/neatogen/neatoinit.c:1095, lib/neatogen/stress.c:884 (smart_ini)
  if (mode === MODE_MAJOR || mode === MODE_IPSEP) unsupported('start', value ?? '', 'smart initialisation');
  // @see lib/neatogen/stuff.c:330 (KK and SGD warn once and ignore it)
  if ((mode === MODE_KK || mode === MODE_SGD) && !selfWarned.has(g.root)) {
    selfWarned.add(g.root);
    console.warn(WARN_SELF_IGNORED);
  }
}

function isConnected(g: Graph): boolean {
  const nodes = [...g.nodes.values()];
  if (nodes.length === 0) return true;
  const adj = new Map<unknown, unknown[]>(nodes.map((n) => [n, []]));
  for (const e of g.edges) { adj.get(e.tail)?.push(e.head); adj.get(e.head)?.push(e.tail); }
  const seen = new Set<unknown>([nodes[0]]);
  const stack: unknown[] = [nodes[0]];
  for (let n = stack.pop(); n !== undefined; n = stack.pop()) {
    for (const m of adj.get(n) ?? []) if (!seen.has(m)) { seen.add(m); stack.push(m); }
  }
  return seen.size === nodes.length;
}

/** KK runs unpacked unless `pack` or `packmode` is set. @see neatoinit.c:1380-1389 */
function kkCircuitFallsBack(g: Graph): boolean {
  const packed = getPack(g.root, -1, 0) >= 0 || (g.root.attrs.get('packmode') ?? '') !== '';
  return !packed && !isConnected(g.root);
}

function warnCircuitDisconnected(g: Graph): void {
  if (circuitWarned.has(g.root)) return;
  circuitWarned.add(g.root);
  console.warn(
    `graph ${g.root.name} is disconnected. Hence, the circuit model\n`
    + 'is undefined. Reverting to the shortest path model.\n'
    + 'Alternatively, consider running neato using -Gpack=true or decomposing\n'
    + 'the graph into connected components.',
  );
}

function checkModel(g: Graph, mode: number, model: number): void {
  const value = g.root.attrs.get('model') ?? '';
  const stressPath = mode === MODE_MAJOR || mode === MODE_KK;
  // @see lib/neatogen/stress.c:846, lib/neatogen/neatoinit.c:1246
  if (model === MODEL_SUBSET && stressPath) unsupported('model', value, 'the subset distance model');
  if (model !== MODEL_CIRCUIT || !stressPath) return;
  // @see lib/neatogen/neatoinit.c:1248-1257 (disconnected: warn + shortpath)
  if (mode === MODE_KK && kkCircuitFallsBack(g)) { warnCircuitDisconnected(g); return; }
  // @see lib/neatogen/stress.c:851, lib/neatogen/circuit.c:circuit_model
  unsupported('model', value, 'the circuit distance model');
}

/**
 * Throw UNSUPPORTED_FEATURE where neato's C would run unported init code for
 * this mode/model/start. Call after the nG < 2 guard.
 * @see lib/neatogen/neatoinit.c:neatoLayout
 */
export function assertSupported(g: Graph, mode: number, model: number): void {
  if (maxIterNegative(g)) return;
  checkMode(g, mode);
  checkStartAttr(g, mode);
  checkModel(g, mode, model);
}
