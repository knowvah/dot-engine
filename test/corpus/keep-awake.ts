// SPDX-License-Identifier: EPL-2.0
//
// Idle-sleep assertions and sleep-aware timing for long sweeps.
//
// Why: the corpus walkers budget renders in wall-clock, and a laptop that idles
// into sleep mid-sweep makes those numbers lie. Measured 2026-07-31 — during a
// single 2222/twopi walk the machine entered Idle Sleep at 12:32:26 and then
// Maintenance Sleep for 664s, 222s and more (`pmset -g log`). The recorded
// `portMs` came out 8110856ms against a 7200000ms budget: a render cannot exceed
// its own timeout, and the excess was exactly sleep counted as compute.
//
// Note what this does and does not fix. Node/libuv timers run on Darwin's
// monotonic clock (`mach_absolute_time`), which does NOT advance while the system
// sleeps, so the timeout itself was already enforced on ACTIVE time and behaved
// correctly. What sleep corrupts is the wall-clock number we RECORD, and any
// human reading it. Preventing sleep keeps the two measures aligned; recording
// both (see `EngineWalkRow.portMs` / `portWallMs`) makes a lapse self-evident.
//
// Node-only dev/test infra.

import { spawn, type SpawnOptions } from 'node:child_process';

/** Injectable spawn, so the helper is testable without touching the machine. */
export type Spawner = (cmd: string, args: string[], opts: SpawnOptions) => { unref?: () => void };

/**
 * Ask macOS not to idle-sleep until THIS process exits.
 *
 * `caffeinate -i -w <pid>` ties the assertion's lifetime to our pid, so it needs
 * no teardown and cannot outlive the sweep — unlike `caffeinate -t <seconds>`,
 * which was already running on this machine with a 300s window, far too short to
 * cover an hour-scale render.
 *
 * Best-effort by design: returns false on non-Darwin or if `caffeinate` cannot be
 * spawned. A sweep must never fail because it could not assert power management.
 */
export function preventIdleSleep(
  platform: string = process.platform,
  pid: number = process.pid,
  spawner: Spawner = spawn,
): boolean {
  if (platform !== 'darwin') return false;
  try {
    // detached + unref: the child must not keep our event loop alive, and must
    // not die with our process group before `-w` observes the exit.
    const child = spawner('caffeinate', ['-i', '-w', String(pid)], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref?.();
    return true;
  } catch {
    return false;
  }
}

/**
 * Start a dual clock. `activeMs` comes from the monotonic clock (Darwin's
 * `mach_absolute_time`, which pauses during system sleep) and is the number
 * comparable to a timeout budget, since libuv timers use the same base.
 * `wallMs` is `Date.now()`. A gap between the two IS sleep.
 */
export function startClock(): () => { activeMs: number; wallMs: number } {
  const h0 = process.hrtime.bigint();
  const w0 = Date.now();
  return () => ({
    activeMs: Number((process.hrtime.bigint() - h0) / 1_000_000n),
    wallMs: Date.now() - w0,
  });
}

/**
 * Record wall time only when sleep inflated it beyond 5% of active time.
 *
 * The 5% band exists because the two clocks are read microseconds apart and will
 * never be exactly equal; without it every row would carry a redundant wall
 * figure and the field would stop meaning "sleep happened here".
 */
export function sleepInflated(activeMs: number, wallMs: number): number | undefined {
  return wallMs > activeMs * 1.05 ? wallMs : undefined;
}
