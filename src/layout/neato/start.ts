// SPDX-License-Identifier: EPL-2.0
/**
 * Neato `start` handling (setSeed / initRegular / checkStart) and the
 * fail-loud check for the neato init feature this port does not have (smart
 * init for the stress path). mode=hier runs `stress_majorization_with_hierarchy`,
 * whose smart init is ported (stress-subspace.ts). mode=ipsep runs
 * `stress_majorization_cola`, which takes no smart init.
 *
 * The loud check sits where neato's C branches into the unported code and
 * fires only for the mode whose C path reaches it (ADR-3).
 *
 * @see lib/neatogen/neatoinit.c
 */

import { RenderError } from '../../errors.js';
import { agNameOf } from '../../model/cgraph-ops.js';
import type { Graph } from '../../model/graph.js';
import { srand48 } from '../../common/random.js';
import { registerRenderState } from '../../common/render-state.js';
import {
  MODE_KK, MODE_MAJOR, MODE_HIER, MODE_IPSEP, MODE_SGD,
} from './init.js';
import { jitter3d, ndimOf } from './init-dim.js';
import { agwarningf } from '../../common/agerr.js';

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
 * C's `static atomic_flag once` for the start=self warning under KK/SGD: once
 * per process, so once per render here (AD-4 resets it at render entry).
 * @see lib/neatogen/stuff.c:330
 */
const selfOnce = { warned: false };
registerRenderState(() => { selfOnce.warned = false; });

/** KK and SGD warn once and ignore start=self. @see lib/neatogen/stuff.c:330 */
export function warnStartSelfOnce(): void {
  if (selfOnce.warned) return;
  selfOnce.warned = true;
  agwarningf(WARN_SELF_IGNORED);
}

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
 * pinned), so the stress kernel's initLayout starts from them. Above 2-D the
 * other coordinates are jittered, before checkStart's srand48.
 * @see lib/neatogen/neatoinit.c:initRegular
 */
export function initRegular(g: Graph, nG: number): void {
  const ndim = ndimOf(g);
  let a = 0.0;
  const da = (2 * Math.PI) / nG;
  for (const np of g.nodes.values()) {
    np.info.pos = [nG * SPRING_COEFF * Math.cos(a), nG * SPRING_COEFF * Math.sin(a)];
    np.info.posSet = true;
    np.info.pinned = false; // C: ND_pinned = P_SET overrides P_PIN
    a += da;
    if (ndim > 2) jitter3d(np, nG, ndim);
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
    agwarningf(WARN_POS_IGNORED);
  }
  if (init === INIT_REGULAR) initRegular(g, nG);
  srand48(seed);
  return init;
}

function unsupported(attr: string, value: string, what: string): never {
  throw new RenderError(`${attr}=${value}: ${what} is not supported yet`, 'UNSUPPORTED_FEATURE');
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
  agwarningf(`Illegal value ${str} for attribute "mode" in graph ${agNameOf(g.root)} - ignored`);
  return MODE_MAJOR;
}

function checkStartAttr(g: Graph, mode: number): void {
  const value = g.root.attrs.get('start');
  if (parseStart(value, INIT_RANDOM).init !== INIT_SELF) return;
  // @see lib/neatogen/neatoinit.c:1095, lib/neatogen/stress.c:884 (smart_ini).
  // mode=ipsep is not here: stress_majorization_cola takes no `opts`, so C
  // lays start=self out from the random init, silently (T0 start-self fixtures).
  if (mode === MODE_MAJOR) unsupported('start', value ?? '', 'smart initialisation');
  // KK warns at kk.ts:initialPositions, after its distance model, as C does.
  if (mode === MODE_SGD) warnStartSelfOnce();
}

/**
 * Throw UNSUPPORTED_FEATURE where neato's C would run unported init code for
 * this mode/start. Call after the nG < 2 guard.
 * @see lib/neatogen/neatoinit.c:neatoLayout
 */
export function assertSupported(g: Graph, mode: number): void {
  if (maxIterNegative(g)) return;
  checkStartAttr(g, mode);
}
