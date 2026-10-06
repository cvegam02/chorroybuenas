module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  // Los index.ts de edge functions usan el global Deno e imports https://; se validan con sus módulos _shared.
  ignorePatterns: ['dist', 'coverage', 'node_modules', '.eslintrc.cjs', 'supabase/functions/*/index.ts'],
  parser: '@typescript-eslint/parser',
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'no-console': 'error',
  },
  overrides: [
    { files: ['vite.config.ts', 'vitest.config.ts'], env: { node: true } },
    // En las edge functions console.error es el log del servidor.
    { files: ['supabase/functions/**/*.ts', 'vite.config.ts'], rules: { 'no-console': 'off' } },
  ],
};
