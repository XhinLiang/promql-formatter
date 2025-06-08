module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    'no-console': 'off', // Chrome extensions often use console for debugging
    'prettier/prettier': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-vars': 'warn',
    'no-undef': 'error',
    'quotes': ['error', 'single', { 'avoidEscape': true }],
    'semi': ['error', 'always'],
    'arrow-body-style': ['error', 'as-needed'],
    'max-len': ['warn', { 'code': 100, 'ignoreComments': true, 'ignoreStrings': true }],
    'comma-dangle': ['error', 'always-multiline'],
  },
  globals: {
    Go: 'readonly',
    WebAssembly: 'readonly',
    parsepromql: 'readonly',
  },
} 