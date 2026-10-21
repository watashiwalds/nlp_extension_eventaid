import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    rules: {
      'max-lines': ['warn', { max: 320, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'warn',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { Buffer: 'readonly', console: 'readonly', process: 'readonly', URL: 'readonly' },
    },
  },
  {
    // core/ phải thuần: không chrome.*, không platform/, không ui/
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/platform/**', '**/ui/**'], message: 'core/ không được import platform/ hoặc ui/.' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'chrome', message: 'core/ phải thuần, không dùng chrome.*.' },
        { name: 'window', message: 'core/ phải thuần, không dùng window.' },
        { name: 'document', message: 'core/ phải thuần, không dùng document.' },
      ],
    },
  },
);
