import { describe, expect, test } from 'vitest';
import { Linter } from 'eslint';
import { domainPurityConfig } from '../../tools/guardrails/domain-purity.ts';
import { PROJECT_ROOT } from './helpers/project-root.ts';

/**
 * Lints a snippet as if it lived at the given project-relative path.
 *
 * A base config matching every TS file is included so that files outside the
 * protected folders are linted and produce no messages, instead of ESLint's
 * "no matching configuration" notice.
 */
function lint(code: string, filename: string): readonly string[] {
  const linter = new Linter({ configType: 'flat', cwd: PROJECT_ROOT });
  const baseConfig: Linter.Config = { files: ['**/*.ts', '**/*.tsx'] };
  return linter.verify(code, [baseConfig, domainPurityConfig], { filename }).map((message) => message.message);
}

describe('domain purity rule', () => {
  test('rejects React imports inside shared commerce logic', { tags: ['core'] }, () => {
    const messages = lint("import { useState } from 'react';\nexport const x = useState;", 'src/shared/commerce/price.ts');

    expect(messages).toHaveLength(1);
  });

  test('rejects React Router imports inside a feature domain folder', { tags: ['core'] }, () => {
    const messages = lint("import { Link } from 'react-router';\nexport const x = Link;", 'src/features/cart/domain/cart.ts');

    expect(messages).toHaveLength(1);
  });

  test('allows pure domain code that imports sibling domain modules', { tags: ['core'] }, () => {
    expect(lint("import { cents } from './money';\nexport const x = cents;", 'src/features/cart/domain/cart.ts')).toEqual(
      [],
    );
  });

  test('does not restrict React imports outside the protected domain folders', { tags: ['core'] }, () => {
    expect(lint("import { useState } from 'react';\nexport const x = useState;", 'src/app/App.tsx')).toEqual([]);
  });
});
