/* eslint-env node */

module.exports = {
  root: true,
  'extends': [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'vue/multi-word-component-names': 'off',
    'vue/no-unused-vars': 'warn',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
      ignoreRestSiblings: true
    }],
    'vue/no-unused-components': 'warn',
    'vue/no-mutating-props': 'warn',
    'vue/require-default-prop': 'off',
    'vue/require-explicit-emits': 'off',
    'vue/no-v-html': 'off',
    'vue/no-setup-props-destructure': 'off',
    'vue/no-v-text-v-html-on-component': 'off',
    'vue/valid-template-root': 'off',
    'no-undef': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-console': 'off',
    'no-debugger': 'off'
  },
  ignorePatterns: [
    '*.cjs',
    '*.js',
    '*.d.ts',
    'node_modules',
    'dist',
    '*.js.map',
    '*.jsx.map',
    '*.tsx.map'
  ]
}
