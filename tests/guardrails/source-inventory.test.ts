import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { listRuntimeSources } from '../../tools/guardrails/source-inventory.ts';
import { buildImportGraph } from '../../tools/guardrails/import-graph.ts';

describe('listRuntimeSources', () => {
  let fixtureRoot: string;

  beforeEach(() => {
    fixtureRoot = mkdtempSync(join(tmpdir(), 'guardrails-inventory-'));
  });

  afterEach(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  /** Creates an empty file at a path relative to the fixture root. */
  function touch(relativePath: string): void {
    const absolute = join(fixtureRoot, relativePath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, '');
  }

  test('lists production TypeScript only, excluding tests, declarations and styles', { tags: ['core'] }, () => {
    touch('src/app/App.tsx');
    touch('src/app/App.test.tsx');
    touch('src/shared/types.d.ts');
    touch('src/app/index.css');
    touch('src/nested/deep/util.ts');
    touch('tools/guardrails/rules.ts');

    expect(listRuntimeSources(fixtureRoot)).toEqual([
      'src/app/App.tsx',
      'src/nested/deep/util.ts',
      'tools/guardrails/rules.ts',
    ]);
  });

  test('returns an empty list when the scanned roots do not exist', { tags: ['core'] }, () => {
    expect(listRuntimeSources(fixtureRoot)).toEqual([]);
  });
});

describe('buildImportGraph edge cases', () => {
  let fixtureRoot: string;

  beforeEach(() => {
    fixtureRoot = mkdtempSync(join(tmpdir(), 'guardrails-graph-'));
  });

  afterEach(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  test('ignores relative imports that resolve to nothing in the graph', { tags: ['core'] }, () => {
    mkdirSync(join(fixtureRoot, 'src'), { recursive: true });
    writeFileSync(join(fixtureRoot, 'src', 'a.ts'), "import './does-not-exist';\nexport const a = 1;\n");

    expect(buildImportGraph(fixtureRoot, ['src']).get('src/a.ts')).toEqual([]);
  });

  test('skips a configured source directory that is absent', { tags: ['core'] }, () => {
    expect(buildImportGraph(fixtureRoot, ['missing']).size).toBe(0);
  });
});
