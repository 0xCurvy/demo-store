// @ts-check

import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import prettier from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Statements that span several lines. They get a blank line before and after them. */
const multilineStatements = [
  "multiline-block-like",
  "multiline-const",
  "multiline-let",
  "multiline-expression",
  "multiline-export",
  "multiline-type",
];

export default tseslint.config(
  { ignores: ["**/node_modules", "**/dist", "**/.wrangler", ".data", "vendor", "wallpapers"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    plugins: { "@stylistic": stylistic },
    rules: {
      // Code reads in steps: a multi-line statement stands apart, and a return is set off.
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" },
        { blankLine: "always", prev: multilineStatements, next: "*" },
        { blankLine: "always", prev: "*", next: multilineStatements },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      eqeqeq: "error",
      "no-console": "off",
    },
  },
  {
    files: ["server/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["worker/**/*.ts"],
    languageOptions: { globals: { ...globals.serviceworker, ...globals.node } },
  },
  {
    files: ["web/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
);
