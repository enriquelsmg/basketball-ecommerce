import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { PROJECT_ROOT } from './helpers/project-root.ts';

describe('HTML entry document', () => {
  test('declares Spanish as the document language for assistive technology', { tags: ['core'] }, () => {
    const html = readFileSync(join(PROJECT_ROOT, 'index.html'), 'utf8');

    expect(html).toMatch(/<html[^>]*\blang="es-ES"/);
  });
});
