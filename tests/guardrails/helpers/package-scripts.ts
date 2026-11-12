import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROJECT_ROOT } from './project-root.ts';

/**
 * Reads the `scripts` table from the project's package.json.
 *
 * @returns Map-like record from script name to command line.
 * @throws {Error} When package.json has no object-valued `scripts` entry.
 */
export function readPackageScripts(): Readonly<Record<string, string>> {
  const parsed: unknown = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || !('scripts' in parsed)) {
    throw new Error('package.json has no scripts table');
  }
  const scripts: unknown = parsed.scripts;
  if (typeof scripts !== 'object' || scripts === null) {
    throw new Error('package.json scripts must be an object');
  }
  return scripts as Record<string, string>;
}
