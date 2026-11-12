// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';
import { domainPurityConfig } from './tools/guardrails/domain-purity.ts';

/**
 * Flat ESLint configuration. Each plugin is registered once here so that
 * rule overrides below cannot silently conflict with a duplicate registration.
 */
export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  tseslint.configs.strict,
  sonarjs.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Fast refresh only works when a module exports components exclusively.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['tools/**/*.ts', 'config/**/*.ts', '*.{ts,js}'],
    languageOptions: { globals: globals.node },
  },
  domainPurityConfig,
);
