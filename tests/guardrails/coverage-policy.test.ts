import { describe, expect, test } from 'vitest';
import {
  buildCoverageThresholds,
  EXCLUDED_SOURCES,
  MODULE_TIERS,
  TIER_THRESHOLDS,
} from '../../config/coverage-policy.ts';
import { listRuntimeSources } from '../../tools/guardrails/source-inventory.ts';
import { PROJECT_ROOT } from './helpers/project-root.ts';

describe('coverage policy', () => {
  test('classifies every runtime source into exactly one tier or a justified exclusion', { tags: ['core'] }, () => {
    const classified = [...Object.keys(MODULE_TIERS), ...Object.keys(EXCLUDED_SOURCES)].sort();

    expect(classified).toEqual(listRuntimeSources(PROJECT_ROOT));
    expect(new Set(classified).size).toBe(classified.length);
  });

  test('every exclusion carries a non-empty justification', { tags: ['core'] }, () => {
    for (const [path, reason] of Object.entries(EXCLUDED_SOURCES)) {
      expect(reason.trim(), `exclusion ${path} needs a justification`).not.toBe('');
    }
  });

  test('tier thresholds meet the minimums defined in CLAUDE.md section 5', { tags: ['core'] }, () => {
    expect(TIER_THRESHOLDS.core).toEqual({ lines: 100, functions: 100, branches: 100, statements: 100 });
    expect(TIER_THRESHOLDS.important).toEqual({ lines: 80, functions: 80, branches: 80, statements: 80 });
    expect(TIER_THRESHOLDS.supporting).toEqual({ lines: 60, functions: 60, branches: 60, statements: 60 });
  });

  test('maps each classified file to the thresholds of its tier', { tags: ['core'] }, () => {
    const thresholds = buildCoverageThresholds(MODULE_TIERS);

    for (const [path, tier] of Object.entries(MODULE_TIERS)) {
      expect(thresholds[path], `thresholds for ${path}`).toEqual(TIER_THRESHOLDS[tier]);
    }
    expect(Object.keys(thresholds).sort()).toEqual(Object.keys(MODULE_TIERS).sort());
  });
});
