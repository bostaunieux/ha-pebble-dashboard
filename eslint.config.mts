import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import wc from "eslint-plugin-wc";
import lit from "eslint-plugin-lit";
import litA11y from "eslint-plugin-lit-a11y";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: {
      globals: globals.browser,
      ecmaVersion: 2020,
      sourceType: "module",
    },
    plugins: {
      wc,
      lit,
      "lit-a11y": litA11y,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...wc.configs.recommended.rules,
      ...lit.configs.all.rules,
      ...litA11y.configs.recommended.rules,
      ...prettier.rules,
      "lit/no-template-map": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  ...tseslint.configs.recommended,
);
