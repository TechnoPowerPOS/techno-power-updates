import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*']
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // disable unused vars for now as it causes too much noise
      '@typescript-eslint/no-unused-vars': 'off',
      // skip most rules just to make sure parsing passes
    }
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
