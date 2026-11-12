import type { Linter } from 'eslint';

/**
 * ESLint configuration keeping business rules independent of React and its router.
 *
 * Domain code must stay testable without a DOM or component tree, so React
 * imports are rejected in the folders that hold pure commerce rules
 * (CLAUDE.md §2 and §4). Other folders are unaffected.
 */
export const domainPurityConfig: Linter.Config = {
  files: ['src/shared/commerce/**/*.{ts,tsx}', 'src/features/*/domain/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          { name: 'react', message: 'Domain code must not depend on React; keep rules framework-free.' },
          { name: 'react-dom', message: 'Domain code must not depend on React DOM.' },
          { name: 'react-router', message: 'Domain code must not depend on the router.' },
        ],
        patterns: [
          {
            group: ['react/*', 'react-dom/*', 'react-router/*'],
            message: 'Domain code must not depend on React or its router.',
          },
        ],
      },
    ],
  },
};
