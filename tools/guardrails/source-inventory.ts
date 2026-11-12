import { join, relative } from 'node:path';
import { isTypeScriptSource, toPosix, walkFiles } from './file-walk.ts';

/** Directories whose TypeScript files count as runtime or guardrail code. */
const INVENTORY_ROOTS: readonly string[] = ['src', 'tools/guardrails'];

/**
 * Lists every runtime TypeScript source file that the coverage policy must classify.
 *
 * Test files and declaration files are excluded because they are not
 * production behavior; everything else must appear in `MODULE_TIERS` or
 * `EXCLUDED_SOURCES`.
 *
 * @param rootDir - Absolute project root.
 * @returns Sorted posix project-relative paths.
 */
export function listRuntimeSources(rootDir: string): readonly string[] {
  return INVENTORY_ROOTS.flatMap((root) => walkFiles(join(rootDir, root), isRuntimeSource))
    .map((absolute) => toPosix(relative(rootDir, absolute)))
    .sort();
}

/**
 * Accepts runtime TypeScript files: type-checked sources that are neither tests nor declarations.
 *
 * @param fileName - Bare file name.
 * @returns True when the file is production TypeScript.
 */
function isRuntimeSource(fileName: string): boolean {
  return isTypeScriptSource(fileName) && !/\.test\.tsx?$/.test(fileName);
}
