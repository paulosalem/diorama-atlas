import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".cache/**",
      "outputs/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      ".codex/**",
      ".playwright-mcp/**",
      "public/**",
      "experiments/**/node_modules/**",
      "experiments/**/assets/**",
      "experiments/**/unity/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["experiments/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    files: [
      "experiments/**/web/**/*.js",
      "experiments/**/export.mjs",
      "experiments/**/check*.mjs",
    ],
    languageOptions: { globals: { ...globals.browser, BABYLON: "readonly" } },
  },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
    },
  },
  {
    files: ["src/client/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["src/client/rendering/babylon.js"],
    languageOptions: { globals: { BABYLON: "readonly" } },
  },
  {
    files: ["src/server/**/*.mjs", "scripts/**/*.mjs", "tests/**/*.js", "*.js"],
    languageOptions: { globals: globals.node },
  },
  {
    files: [
      "tests/browser/**/*.js",
      "tests/pages/**/*.js",
      "scripts/helpers/browser-setup.mjs",
      "scripts/capture-interiors.mjs",
      "scripts/capture-patina.mjs",
      "scripts/check-outdoors.mjs",
      "scripts/check-water-prints.mjs",
      "scripts/check-narration.mjs",
      "scripts/measure-dioramas.mjs",
      "scripts/prepare-dioramas.mjs",
    ],
    languageOptions: { globals: globals.browser },
  },
];
