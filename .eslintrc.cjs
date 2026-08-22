module.exports = {
  root: true,

  env: {
    browser: true,
    es2021: true,
    node: true
  },

  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },

  extends: ['eslint:recommended'],

  plugins: ['svelte3'],

  overrides: [
    {
      files: ['*.svelte'],
      processor: 'svelte3/svelte3'
    }
  ],

  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off'
  }
};