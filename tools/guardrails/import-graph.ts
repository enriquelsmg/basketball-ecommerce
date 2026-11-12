import { readFileSync } from 'node:fs';
import { join, posix, relative } from 'node:path';
import { isTypeScriptSource, toPosix, walkFiles } from './file-walk.ts';

/** Adjacency list of project source files: each key depends on the listed files. */
export type ImportGraph = ReadonlyMap<string, readonly string[]>;

/** Extensions and index files tried, in order, when resolving a relative specifier. */
const RESOLVABLE_SUFFIXES: readonly string[] = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

/**
 * Matches the three import forms that create module edges: `from '...'`
 * (static import, re-export), bare `import '...'` (side effect), and
 * `import('...')` (dynamic, i.e. lazy-loading boundaries).
 */
// Single-space forms only: formatters always emit one space, and avoiding repeated
// optional whitespace keeps the pattern linear-time (SonarJS super-linear-regex rule).
const SPECIFIER_PATTERN = /(?:\bfrom|^import|\bimport\()\s?['"]([^'"]+)['"]/gm;

/**
 * Extracts relative module specifiers from TypeScript/TSX source text.
 *
 * Package specifiers are ignored on purpose: architecture rules are about
 * edges inside this repository, and external packages cannot violate them.
 *
 * @param source - Raw file contents.
 * @returns Relative specifiers (starting with `.`) in source order.
 */
export function extractRelativeSpecifiers(source: string): readonly string[] {
  return [...source.matchAll(SPECIFIER_PATTERN)]
    .map((match) => String(match[1]))
    .filter((specifier) => specifier.startsWith('.'));
}

/**
 * Resolves a relative specifier to a known project file.
 *
 * @param fromFile - Posix path of the importing file, relative to the project root.
 * @param specifier - Relative import string as written in the source.
 * @param knownFiles - Posix paths of every file in the graph.
 * @returns The resolved posix path, or `undefined` when the target is outside the graph.
 */
export function resolveRelativeImport(
  fromFile: string,
  specifier: string,
  knownFiles: ReadonlySet<string>,
): string | undefined {
  const base = posix.join(posix.dirname(fromFile), specifier);
  // The first existing candidate wins, mirroring the bundler's own resolution order.
  return RESOLVABLE_SUFFIXES.map((suffix) => `${base}${suffix}`).find((candidate) => knownFiles.has(candidate));
}

/**
 * Builds the file-level import graph for the given source directories.
 *
 * @param rootDir - Absolute project root; all graph keys are relative to it.
 * @param sourceDirs - Directories under `rootDir` to scan (e.g. `['src']`).
 * @returns Adjacency map keyed by posix relative path, with each edge list sorted and de-duplicated.
 */
export function buildImportGraph(rootDir: string, sourceDirs: readonly string[]): ImportGraph {
  const files = sourceDirs
    .flatMap((dir) => walkFiles(join(rootDir, dir), isTypeScriptSource))
    .map((absolute) => ({ absolute, relative: toPosix(relative(rootDir, absolute)) }));
  const knownFiles = new Set(files.map((file) => file.relative));

  const graph = new Map<string, readonly string[]>();
  for (const file of files) {
    const targets = extractRelativeSpecifiers(readFileSync(file.absolute, 'utf8'))
      .map((specifier) => resolveRelativeImport(file.relative, specifier, knownFiles))
      .filter((target): target is string => target !== undefined);
    graph.set(file.relative, [...new Set(targets)].sort());
  }
  return graph;
}
