import type { ImportGraph } from './import-graph.ts';

/** One dependency edge between two project files. */
export interface ImportEdge {
  readonly from: string;
  readonly to: string;
}

/** A dependency edge that breaks an architecture rule. */
export interface ArchitectureViolation extends ImportEdge {
  readonly rule: string;
  readonly message: string;
}

/**
 * A named architecture rule. `forbids` returns true when the edge must not exist.
 * Rules are data, so adding one never requires editing the traversal logic (OCP).
 */
interface ArchitectureRule {
  readonly id: string;
  readonly message: string;
  readonly forbids: (edge: ImportEdge) => boolean;
}

/** Matches `src/features/<feature>/...`; group 1 is the feature folder. */
const FEATURE_PATH = /^src\/features\/([^/]+)\//;

/** Matches `src/features/<feature>/pages/<page>/...`; groups 1 and 2 are both mandatory. */
const PAGE_PATH = /^src\/features\/([^/]+)\/pages\/([^/]+)\//;

/** Identifies the feature and page that own a project file. */
interface PageRef {
  readonly feature: string;
  readonly page: string;
}

/**
 * Returns the feature owning a path.
 *
 * @param path - Posix project-relative path.
 * @returns Feature folder name, or `undefined` when the path is outside `src/features/`.
 */
function featureOf(path: string): string | undefined {
  const match = FEATURE_PATH.exec(path);
  return match === null ? undefined : String(match[1]);
}

/**
 * Returns the feature and page owning a path.
 *
 * Both capture groups are mandatory in `PAGE_PATH`, so they are always defined
 * whenever the pattern matches; `String()` only converts the typed optional.
 *
 * @param path - Posix project-relative path.
 * @returns The owning feature and page, or `undefined` when the path is not inside a page.
 */
function pageOf(path: string): PageRef | undefined {
  const match = PAGE_PATH.exec(path);
  return match === null ? undefined : { feature: String(match[1]), page: String(match[2]) };
}

/**
 * Architecture rules from CLAUDE.md section 3. Each rule protects one dependency direction.
 */
const ARCHITECTURE_RULES: readonly ArchitectureRule[] = [
  {
    id: 'shared-must-not-import-consumers',
    message: 'Shared code must not depend on features or the app layer; move the shared responsibility down instead.',
    forbids: ({ from, to }) =>
      from.startsWith('src/shared/') && (to.startsWith('src/features/') || to.startsWith('src/app/')),
  },
  {
    id: 'features-must-not-import-app',
    message: 'Features must not import the app composition layer; the app wires features, not the reverse.',
    forbids: ({ from, to }) => from.startsWith('src/features/') && to.startsWith('src/app/'),
  },
  {
    id: 'no-cross-feature-imports',
    message: 'A feature must not import another feature; share the responsibility through src/shared/.',
    forbids: ({ from, to }) => {
      const source = featureOf(from);
      const target = featureOf(to);
      return source !== undefined && target !== undefined && source !== target;
    },
  },
  {
    id: 'no-cross-page-imports',
    message: 'A page must not import another page; move the shared code to the feature shared/ folder.',
    forbids: ({ from, to }) => {
      const source = pageOf(from);
      const target = pageOf(to);
      return (
        source !== undefined &&
        target !== undefined &&
        source.feature === target.feature &&
        source.page !== target.page
      );
    },
  },
];

/**
 * Lists every architecture violation in an import graph.
 *
 * @param graph - File-level import graph from `buildImportGraph`.
 * @returns Violations sorted by source file, then target file, for stable reports.
 */
export function findArchitectureViolations(graph: ImportGraph): readonly ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];
  for (const [from, targets] of graph) {
    for (const to of targets) {
      for (const rule of ARCHITECTURE_RULES) {
        if (rule.forbids({ from, to })) {
          violations.push({ from, to, rule: rule.id, message: rule.message });
        }
      }
    }
  }
  return violations.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
}

/** Discovery order and low-link of one node during Tarjan's traversal. */
interface NodeState {
  readonly index: number;
  low: number;
}

/**
 * Finds strongly connected components with more than one file, plus self-imports.
 *
 * Uses Tarjan's algorithm, which finds every cycle in one pass. A cycle makes
 * module initialization order and ownership ambiguous, so any finding fails the gate.
 *
 * @param graph - File-level import graph.
 * @returns Each cycle as a sorted list of member files, with cycles sorted by their first member.
 */
export function findImportCycles(graph: ImportGraph): readonly (readonly string[])[] {
  const states = new Map<string, NodeState>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cycles: string[][] = [];
  let nextIndex = 0;

  /**
   * Visits one node and returns its state so the caller can propagate low-links.
   *
   * @param node - Project-relative file path to visit.
   * @returns The visited node's state.
   */
  const visit = (node: string): NodeState => {
    const state: NodeState = { index: nextIndex, low: nextIndex };
    nextIndex += 1;
    states.set(node, state);
    stack.push(node);
    onStack.add(node);

    for (const target of graph.get(node) ?? []) {
      const targetState = states.get(target);
      if (targetState === undefined) {
        // Unvisited target: a cycle through it can reach back above this node.
        state.low = Math.min(state.low, visit(target).low);
      } else if (onStack.has(target)) {
        // A back edge into the current stack closes a cycle; only on-stack targets can do that.
        state.low = Math.min(state.low, targetState.index);
      }
    }

    // A node whose low-link equals its own index is the root of a component: pop its members.
    if (state.low === state.index) {
      // The node was pushed on the stack and everything above it belongs to its component,
      // so splicing from its position yields exactly the component members.
      const component = stack.splice(stack.lastIndexOf(node));
      for (const member of component) {
        onStack.delete(member);
      }

      const selfImport = (graph.get(node) ?? []).includes(node);
      if (component.length > 1 || selfImport) {
        cycles.push(component.sort());
      }
    }
    return state;
  };

  for (const node of graph.keys()) {
    if (!states.has(node)) {
      visit(node);
    }
  }
  return cycles.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}
