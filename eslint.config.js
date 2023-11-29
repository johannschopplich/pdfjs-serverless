import antfu from '@antfu/eslint-config'

export default await antfu(
  {
    ignores: ['tsconfig.json'],
  },
  {
    rules: {
      'unused-imports/no-unused-imports': 'off',
    },
  },
)
