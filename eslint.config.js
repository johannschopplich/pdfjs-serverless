import antfu from '@antfu/eslint-config'

export default await antfu(
  {},
  {
    rules: {
      'unused-imports/no-unused-imports': 'off',
    },
  },
)
