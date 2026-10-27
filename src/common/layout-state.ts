// SPDX-License-Identifier: EPL-2.0

/**
 * The C global `State` ("last finished phase"). It is a per-process variable
 * in C; the port resets it per render (AD-4) to its initial value.
 *
 * @see lib/common/globals.h:State
 */

import { registerRenderState } from './render-state.js';

/** Phase values for `State`. @see lib/common/const.h:GVBEGIN, GVSPLINES */
export const GVBEGIN = 0;
export const GVSPLINES = 1;

/**
 * Holder for the C global `State`. C's initial value is 0 (BSS) and
 * graph_init assigns GVBEGIN, which is the same value.
 * @see lib/common/input.c:graph_init (State = GVBEGIN)
 */
const layoutState = { state: GVBEGIN };

registerRenderState(() => {
  layoutState.state = GVBEGIN;
});

/** Read `State`. @see lib/common/globals.h:State */
export function getState(): number {
  return layoutState.state;
}

/** Assign `State`. @see lib/common/globals.h:State */
export function setState(value: number): void {
  layoutState.state = value;
}
