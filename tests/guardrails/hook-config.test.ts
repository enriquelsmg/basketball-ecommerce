import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { readPackageScripts } from './helpers/package-scripts.ts';
import { PROJECT_ROOT } from './helpers/project-root.ts';

describe('pre-commit hook configuration', () => {
  test('installs Husky through the prepare lifecycle so hooks exist after npm ci', { tags: ['core'] }, () => {
    expect(readPackageScripts().prepare).toBe('husky');
  });

  test('runs only the verify:commit script on every commit', { tags: ['core'] }, () => {
    const hook = readFileSync(join(PROJECT_ROOT, '.husky', 'pre-commit'), 'utf8');
    const commands = hook
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    expect(commands).toEqual(['npm run verify:commit']);
  });
});
