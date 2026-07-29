// SPDX-License-Identifier: EPL-2.0
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    includeSource: ['test/**/*.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: [
        'src/parser/dot.js',
        'src/parser/dot.d.ts',
        // The peggy grammar is not JavaScript; the v8 provider tries to parse
        // every non-excluded file under `include` and errors out on it.
        'src/parser/dot.pegjs',
        'src/**/__fixtures__/**',
      ],
      reporter: ['text', 'json-summary'],
      // coverage-90 mission ratchet (D6): actuals at close were
      // st 95.54 / br 90.64 / fn 97.36 / ln 96.87 (2026-07-28).
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
