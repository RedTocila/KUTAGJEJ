import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const nextCoreWebVitals = require('eslint-config-next/core-web-vitals');
const eslintConfigPrettier = require('eslint-config-prettier/flat');

const eslintConfig = [
  ...nextCoreWebVitals,
  eslintConfigPrettier,
  {
    name: 'kutagjej/typescript-overrides',
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-empty-interface': [
        'error',
        { allowSingleExtends: true },
      ],
      '@typescript-eslint/no-shadow': [
        'error',
        { ignoreOnInitialization: true },
      ],
    },
  },
  {
    name: 'kutagjej/common',
    files: ['**/*.{js,jsx,mjs,ts,tsx}'],
    rules: {
      'import/newline-after-import': 'error',
      '@next/next/no-img-element': 'off',
      // False positives when a hook returns both refs and state (e.g. MUI popover anchors).
      'react-hooks/refs': 'off',
    },
  },
];

export default eslintConfig;
