import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  {
    // Vendored / generated / non-JS assets are never linted.
    ignores: ['dist/**', 'node_modules/**', 'wasm/**', 'src/wasm_exec.js', 'src/promqlparser.wasm'],
  },

  js.configs.recommended,

  {
    // The extension popup: classic (non-module) browser script.
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        // Provided at runtime by wasm_exec.js / the WASM module.
        Go: 'readonly',
        parsepromql: 'readonly',
        loadexample: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-vars': 'warn',
    },
  },

  {
    // Node-side tooling and tests (ES modules).
    files: ['test/**/*.mjs', 'scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  // Must come last: turns off rules that conflict with Prettier.
  prettier,
];
