import { describe, expect, test } from 'vitest';
import { readPackageScripts } from './helpers/package-scripts.ts';

/** Steps the commit gate must run, each exactly once and in this order (CLAUDE.md §8). */
const REQUIRED_COMMIT_STEPS: readonly string[] = ['npm run lint', 'npm run build', 'npm run test:core'];

describe('verify:commit composition', () => {
  test('runs lint, build and core tests exactly once each, in order', { tags: ['core'] }, () => {
    const steps = readPackageScripts()['verify:commit']
      ?.split('&&')
      .map((step) => step.trim());

    expect(steps).toEqual(REQUIRED_COMMIT_STEPS);
  });

  test('every step delegates to a script that is actually defined', { tags: ['core'] }, () => {
    const scripts = readPackageScripts();

    for (const step of REQUIRED_COMMIT_STEPS) {
      const scriptName = step.replace(/^npm run /, '');
      expect(scripts[scriptName], `script "${scriptName}" must be defined`).toBeTypeOf('string');
    }
  });
});
