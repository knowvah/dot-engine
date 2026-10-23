// SPDX-License-Identifier: EPL-2.0

/**
 * Per-render scope for C process-level state (AD-4).
 *
 * Native Graphviz renders one graph per `dot` process, so every file static —
 * RNG streams, sequence counters, the emit_once warning set — starts each
 * graph at its C initial value (and gvFreeContext's emit_once_reset clears the
 * warning set). The port's module statics outlive a render, so each module
 * owning such state registers a reset that restores its C initial value, and
 * every public render entry calls {@link resetRenderState} before any other
 * work. Render output is then a function of its input alone.
 *
 * Not registered here: caller-installed hooks (setTextMeasurer,
 * setImageSizer, setImageResolver) and debug hooks — they are configuration,
 * not C process state.
 *
 * @see lib/gvc/gvcontext.c:gvFreeContext (emit_once_reset)
 * @see lib/common/emit.c:emit_once_reset
 */

/** Registered resets, run in registration (module evaluation) order. */
const resets: Array<() => void> = [];

/**
 * Register a reset restoring one module's C process state to its initial
 * value. Called once, at module evaluation.
 */
export function registerRenderState(reset: () => void): void {
  resets.push(reset);
}

/** Restore every registered module's C process state; call first per render. */
export function resetRenderState(): void {
  for (const reset of resets) reset();
}
