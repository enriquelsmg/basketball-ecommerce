import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { PROJECT_ROOT } from './helpers/project-root.ts';
import { findArchitectureViolations, findImportCycles } from '../../tools/guardrails/architecture-rules.ts';
import { buildImportGraph, extractRelativeSpecifiers } from '../../tools/guardrails/import-graph.ts';

describe('extractRelativeSpecifiers', () => {
  test('finds static, re-export, side-effect and dynamic relative imports', { tags: ['core'] }, () => {
    const source = [
      "import { a } from './a';",
      "import type { B } from './b';",
      "export * from './c';",
      "import './styles.css';",
      "const lazy = () => import('./d');",
    ].join('\n');

    expect(extractRelativeSpecifiers(source)).toEqual(['./a', './b', './c', './styles.css', './d']);
  });

  test('ignores package imports because only relative edges form the project graph', { tags: ['core'] }, () => {
    expect(extractRelativeSpecifiers("import React from 'react';")).toEqual([]);
  });
});

describe('findImportCycles', () => {
  test('reports a two-file cycle with its members sorted', { tags: ['core'] }, () => {
    const graph = new Map<string, readonly string[]>([
      ['src/b.ts', ['src/a.ts']],
      ['src/a.ts', ['src/b.ts']],
    ]);

    expect(findImportCycles(graph)).toEqual([['src/a.ts', 'src/b.ts']]);
  });

  test('returns no cycles for an acyclic graph', { tags: ['core'] }, () => {
    const graph = new Map<string, readonly string[]>([
      ['src/a.ts', ['src/b.ts']],
      ['src/b.ts', []],
    ]);

    expect(findImportCycles(graph)).toEqual([]);
  });

  test('reports a file importing itself', { tags: ['core'] }, () => {
    const graph = new Map<string, readonly string[]>([['src/a.ts', ['src/a.ts']]]);

    expect(findImportCycles(graph)).toEqual([['src/a.ts']]);
  });
});

describe('architecture boundary rules on a fixture project', () => {
  let fixtureRoot: string;

  /** Writes a set of fixture files relative to the temporary project root. */
  function writeFixture(files: Readonly<Record<string, string>>): void {
    for (const [relativePath, content] of Object.entries(files)) {
      const absolutePath = join(fixtureRoot, relativePath);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, content);
    }
  }

  beforeEach(() => {
    fixtureRoot = mkdtempSync(join(tmpdir(), 'guardrails-fixture-'));
  });

  afterEach(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  test('flags shared code that imports a feature', { tags: ['core'] }, () => {
    writeFixture({
      'src/features/cart/Cart.ts': 'export const cart = 1;',
      'src/shared/helper.ts': "import { cart } from '../features/cart/Cart';\nexport const h = cart;",
    });

    const violations = findArchitectureViolations(buildImportGraph(fixtureRoot, ['src']));

    expect(violations.map((v) => [v.from, v.to])).toEqual([
      ['src/shared/helper.ts', 'src/features/cart/Cart.ts'],
    ]);
  });

  test('flags a page that imports another page of the same feature', { tags: ['core'] }, () => {
    writeFixture({
      'src/features/catalog/pages/list/List.tsx': "import { Detail } from '../detail/Detail';\nexport const List = Detail;",
      'src/features/catalog/pages/detail/Detail.tsx': 'export const Detail = 1;',
    });

    const violations = findArchitectureViolations(buildImportGraph(fixtureRoot, ['src']));

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe('no-cross-page-imports');
  });

  test('flags a feature that imports a sibling feature', { tags: ['core'] }, () => {
    writeFixture({
      'src/features/cart/Cart.ts': "import { p } from '../catalog/Product';\nexport const c = p;",
      'src/features/catalog/Product.ts': 'export const p = 1;',
    });

    const violations = findArchitectureViolations(buildImportGraph(fixtureRoot, ['src']));

    expect(violations.map((v) => v.rule)).toEqual(['no-cross-feature-imports']);
  });

  test('flags a feature that imports the app composition layer', { tags: ['core'] }, () => {
    writeFixture({
      'src/app/App.tsx': 'export const App = 1;',
      'src/features/cart/Cart.ts': "import { App } from '../../app/App';\nexport const c = App;",
    });

    const violations = findArchitectureViolations(buildImportGraph(fixtureRoot, ['src']));

    expect(violations.map((v) => v.rule)).toEqual(['features-must-not-import-app']);
  });

  test('allows the app layer to compose pages through public imports', { tags: ['core'] }, () => {
    writeFixture({
      'src/app/App.tsx': "import { List } from '../features/catalog/pages/list/List';\nexport const App = List;",
      'src/features/catalog/pages/list/List.tsx': 'export const List = 1;',
    });

    expect(findArchitectureViolations(buildImportGraph(fixtureRoot, ['src']))).toEqual([]);
  });
});

describe('real source tree', () => {
  test('has no import cycles', { tags: ['core'] }, () => {
    expect(findImportCycles(buildImportGraph(PROJECT_ROOT, ['src', 'tools', 'config']))).toEqual([]);
  });

  test('has no architecture boundary violations', { tags: ['core'] }, () => {
    expect(findArchitectureViolations(buildImportGraph(PROJECT_ROOT, ['src', 'tools', 'config']))).toEqual([]);
  });
});
