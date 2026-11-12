/** Risk tier assigned to a module; mixed responsibilities inherit the stronger tier. */
export type CoverageTier = 'core' | 'important' | 'supporting';

/** The four metrics that every tier gates, as required by CLAUDE.md §5. */
export interface CoverageThresholds {
  readonly lines: number;
  readonly functions: number;
  readonly branches: number;
  readonly statements: number;
}

/**
 * Minimum coverage per tier. Values may be raised, never lowered, without approval.
 * Core shopping and commerce rules must be fully covered; presentation may be less.
 */
export const TIER_THRESHOLDS: Readonly<Record<CoverageTier, CoverageThresholds>> = {
  core: { lines: 100, functions: 100, branches: 100, statements: 100 },
  important: { lines: 80, functions: 80, branches: 80, statements: 80 },
  supporting: { lines: 60, functions: 60, branches: 60, statements: 60 },
};

/**
 * Tier for every runtime source, keyed by posix project-relative path.
 *
 * The guardrail tooling is Important because a defect there silently disables
 * a commit safeguard; the app shell is Supporting because it is presentation only.
 */
export const MODULE_TIERS: Readonly<Record<string, CoverageTier>> = {
  'src/app/App.tsx': 'supporting',
  'tools/guardrails/architecture-rules.ts': 'important',
  'tools/guardrails/domain-purity.ts': 'important',
  'tools/guardrails/file-walk.ts': 'important',
  'tools/guardrails/import-graph.ts': 'important',
  'tools/guardrails/source-inventory.ts': 'important',
};

/**
 * Runtime sources deliberately left out of tier gates, each with its justification.
 * Exclusions must stay minimal: adding one requires a documented reason.
 */
export const EXCLUDED_SOURCES: Readonly<Record<string, string>> = {
  'src/main.tsx':
    'Entry point that only mounts the router into #root; it has no logic and is exercised by the browser smoke check.',
};

/**
 * Builds the per-file threshold map consumed by Vitest's coverage configuration.
 *
 * Keying thresholds by exact file path makes each file gate on its own numbers
 * rather than on an aggregate that a well-covered neighbour could mask.
 *
 * @param tiers - Module-to-tier classification.
 * @returns Thresholds keyed by the same paths as `tiers`.
 */
export function buildCoverageThresholds(
  tiers: Readonly<Record<string, CoverageTier>>,
): Readonly<Record<string, CoverageThresholds>> {
  return Object.fromEntries(
    Object.entries(tiers).map(([path, tier]) => [path, TIER_THRESHOLDS[tier]]),
  );
}
