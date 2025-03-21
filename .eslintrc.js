module.exports = {
  env: {
    es6: true,
    node: true
  },
  extends: [
    'standard'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  rules: {
    "space-before-function-paren": ["error", {
      "anonymous": "ignore",
      "named": "ignore",
      "asyncArrow": "ignore"
    }],
  }
}
