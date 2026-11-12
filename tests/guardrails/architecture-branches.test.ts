import { describe, expect, test } from 'vitest';
import { findArchitectureViolations, findImportCycles } from '../../tools/guardrails/architecture-rules.ts';
import type { ImportGraph } from '../../tools/guardrails/import-graph.ts';

/** Builds a one-edge graph so each rule can be probed in isolation. */
function edge(from: string, to: string): ImportGraph {
  return new Map<string, readonly string[]>([[from, [to]]]);
}

/** Returns the rule identifiers that fire for a single edge. */
function rulesFor(from: string, to: string): readonly string[] {
  return findArchitectureViolations(edge(from, to)).map((violation) => violation.rule);
}

describe('architecture rule boundaries', () => {
  test('allows shared code to import other shared code', { tags: ['core'] }, () => {
    expect(rulesFor('src/shared/a.ts', 'src/shared/b.ts')).toEqual([]);
  });

  test('allows a feature to import shared code', { tags: ['core'] }, () => {
    expect(rulesFor('src/features/cart/Cart.ts', 'src/shared/money.ts')).toEqual([]);
  });

  test('allows a feature to import its own files', { tags: ['core'] }, () => {
    expect(rulesFor('src/features/cart/Cart.ts', 'src/features/cart/Line.ts')).toEqual([]);
  });

  test('allows a page to import from its own feature shared folder', { tags: ['core'] }, () => {
    expect(rulesFor('src/features/cart/pages/cart/CartPage.tsx', 'src/features/cart/shared/format.ts')).toEqual([]);
  });

  test('allows a page to import sibling files in its own page folder', { tags: ['core'] }, () => {
    expect(rulesFor('src/features/cart/pages/cart/CartPage.tsx', 'src/features/cart/pages/cart/Summary.tsx')).toEqual(
      [],
    );
  });

  test('flags a page importing a page of a different feature through the feature rule', { tags: ['core'] }, () => {
    expect(rulesFor('src/features/cart/pages/cart/CartPage.tsx', 'src/features/catalog/pages/list/List.tsx')).toEqual([
      'no-cross-feature-imports',
    ]);
  });

  test('orders multiple violations from one file by target path', { tags: ['core'] }, () => {
    const graph = new Map<string, readonly string[]>([
      ['src/shared/x.ts', ['src/features/cart/Cart.ts', 'src/app/App.tsx']],
    ]);

    expect(findArchitectureViolations(graph).map((violation) => violation.to)).toEqual([
      'src/app/App.tsx',
      'src/features/cart/Cart.ts',
    ]);
  });

  test('flags shared code importing the app layer', { tags: ['core'] }, () => {
    expect(rulesFor('src/shared/x.ts', 'src/app/App.tsx')).toEqual(['shared-must-not-import-consumers']);
  });

  test('does not treat the app importing features as a violation', { tags: ['core'] }, () => {
    expect(rulesFor('src/app/App.tsx', 'src/features/cart/Cart.ts')).toEqual([]);
  });
});

describe('import cycle detection', () => {
  test('finds a cycle reached from a node outside the cycle without reporting the outside node', { tags: ['core'] }, () => {
    const graph = new Map<string, readonly string[]>([
      ['src/entry.ts', ['src/a.ts']],
      ['src/a.ts', ['src/b.ts']],
      ['src/b.ts', ['src/a.ts']],
    ]);

    expect(findImportCycles(graph)).toEqual([['src/a.ts', 'src/b.ts']]);
  });

  test('reports a cycle found after an earlier acyclic component was completed', { tags: ['core'] }, () => {
    const graph = new Map<string, readonly string[]>([
      ['src/a.ts', []],
      ['src/b.ts', ['src/c.ts']],
      ['src/c.ts', ['src/b.ts']],
    ]);

    expect(findImportCycles(graph)).toEqual([['src/b.ts', 'src/c.ts']]);
  });

  test('ignores edges into a finished component, which are not cycles', { tags: ['core'] }, () => {
    const graph = new Map<string, readonly string[]>([
      ['src/x.ts', ['src/leaf.ts']],
      ['src/y.ts', ['src/leaf.ts']],
      ['src/leaf.ts', []],
    ]);

    expect(findImportCycles(graph)).toEqual([]);
  });

  test('treats a target without its own entry as a leaf', { tags: ['core'] }, () => {
    const graph = new Map<string, readonly string[]>([['src/a.ts', ['src/missing.ts']]]);

    expect(findImportCycles(graph)).toEqual([]);
  });
});
