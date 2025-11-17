import js from '@eslint/js';
import globals from 'globals';
import configPrettier from 'eslint-config-prettier';

export default [
  // 除外対象（ビルド成果物・ライブラリなど）
  {
    ignores: ['assets/', 'node_modules/', 'vendor/', '**/*.min.js'],
  },

  // Node.js環境（設定ファイル）
  {
    files: [
      'dai-runner.config.js',
      'dai-runner.config.local.js',
      'eslint.config.js',
    ],
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
    },
  },

  // ブラウザ環境（source/jsフォルダ）
  {
    files: ['source/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.jquery,
        wp: 'readonly',
        ajaxurl: 'readonly',
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
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': ['warn', { destructuring: 'all' }],
      'no-var': 'warn',
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
    },
  },

  // その他のJavaScript（レガシー対応）
  {
    files: ['**/*.js'],
    ignores: [
      'source/**/*.js',
      'eslint.config.js',
      'dai-runner.config.js',
      'dai-runner.config.local.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.jquery,
        wp: 'readonly',
        ajaxurl: 'readonly',
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
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-shadow': ['warn', { builtinGlobals: true, hoist: 'functions' }],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-alert': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'prefer-const': ['warn', { destructuring: 'all' }],
      'no-var': 'warn',
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Prettier と競合するルールを無効化
  configPrettier,
];
