import { fileURLToPath } from 'node:url';

/**
 * Absolute path of the repository root.
 *
 * Derived from this file's location rather than `process.cwd()` so guardrail
 * tests read the same files regardless of the directory they are launched from.
 */
export const PROJECT_ROOT: string = fileURLToPath(new URL('../../../', import.meta.url));
