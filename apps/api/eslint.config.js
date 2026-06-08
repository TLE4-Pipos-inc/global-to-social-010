import pluginN from "eslint-plugin-n"

export default [
  pluginN.configs["flat/recommended"],
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "n/no-process-exit": "off",
    },
  },
  {
    ignores: ["node_modules/", "drizzle/"],
  },
]
