import { defineConfig } from 'vitest/config';
import {
  buildCoverageThresholds,
  EXCLUDED_SOURCES,
  MODULE_TIERS,
} from './config/coverage-policy.ts';

/**
 * Vitest configuration: two isolated projects (browser-like UI tests and Node
 * guardrail tests) share one root coverage configuration so tier gates apply
 * to the complete runtime inventory (CLAUDE.md §5).
 */
export default defineConfig({
  test: {
    tags: [
      {
        name: 'core',
        description: 'Tests protecting commit-blocking safeguards and core shopping behavior.',
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'tools/guardrails/**/*.ts'],
      // Exclusions are declared once in the policy so the inventory test and the gate agree.
      exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts', ...Object.keys(EXCLUDED_SOURCES)],
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
      // Thresholds are per file, so one well-covered neighbour cannot mask an untested module.
      thresholds: buildCoverageThresholds(MODULE_TIERS),
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['tests/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'guardrails',
          environment: 'node',
          include: ['tests/guardrails/**/*.test.ts'],
        },
      },
    ],
  },
});
