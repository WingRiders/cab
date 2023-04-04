module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['import'],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`

        // use an array
        project: [`${__dirname}/tsconfig.json`],
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
}
