// SPDX-License-Identifier: EPL-2.0
//
// Libm-sensitivity gate. Runs the named tests with Math.pow forced to armPow, a
// different but accurate pow. A layout that moves is chaotic in pow's last bit
// and would fail on Linux CI even though it passes here (PR 119, kk-large). It
// does not reproduce glibc exactly.
//   npx vitest run --config plans/post-16-1-followups-9/harness/armpow/vitest.config.mjs <files>
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));

export default {
  root,
  test: {
    include: ['src/**/*.test.ts'],
    setupFiles: [fileURLToPath(new URL('./force-armpow.setup.ts', import.meta.url))],
  },
};
