import js from '@eslint/js';
import globals from 'globals';
import configPrettier from 'eslint-config-prettier';

export default [
  // 除外対象（node_modules、テストプロジェクトなど）
  {
    ignores: ['node_modules/', 'test/', 'test/**/node_modules/', '**/*.min.js'],
  },

  // Node.js環境（すべてのJavaScriptファイル）
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-console': 'off', // Node.jsではconsole.log許可
      'prefer-const': ['warn', { destructuring: 'all' }],
      'no-var': 'warn',
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'no-undef': 'error',
      'no-redeclare': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'all'],
    },
  },

  // Prettier と競合するルールを無効化
  configPrettier,
];
