import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

/**
 * Recursively collects files under a directory whose names satisfy a predicate.
 *
 * Shared by the import graph and the source inventory so both walk the tree
 * the same way; a missing directory yields no files instead of throwing, which
 * lets callers list optional roots.
 *
 * @param directory - Absolute directory to walk.
 * @param accept - Receives the bare file name and decides whether to keep the file.
 * @returns Absolute paths of accepted files.
 */
export function walkFiles(directory: string, accept: (fileName: string) => boolean): string[] {
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory).flatMap((entry) => {
    const absolute = join(directory, entry);
    if (statSync(absolute).isDirectory()) {
      return walkFiles(absolute, accept);
    }
    return accept(entry) ? [absolute] : [];
  });
}

/**
 * Accepts TypeScript sources and rejects declaration files, which carry no runtime edges.
 *
 * @param fileName - Bare file name.
 * @returns True for `.ts`/`.tsx` files that are not `.d.ts`.
 */
export function isTypeScriptSource(fileName: string): boolean {
  return /\.tsx?$/.test(fileName) && !fileName.endsWith('.d.ts');
}

/**
 * Normalizes a native path to forward slashes so rules can match one format on every OS.
 *
 * @param nativePath - Path using the platform separator.
 * @returns The same path using `/`.
 */
export function toPosix(nativePath: string): string {
  return nativePath.split(sep).join('/');
}
