import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**",
      ".cache/**",
      "outputs/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      ".codex/**",
      ".playwright-mcp/**",
      "public/**",
    ],
  },
  js.configs.recommended,
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
    files: ["src/server/**/*.mjs", "scripts/**/*.mjs", "tests/**/*.js", "*.js"],
    languageOptions: { globals: globals.node },
  },
  {
    files: [
      "tests/browser/**/*.js",
      "scripts/capture-interiors.mjs",
      "scripts/capture-patina.mjs",
      "scripts/check-outdoors.mjs",
      "scripts/check-water-prints.mjs",
      "scripts/check-narration.mjs",
    ],
    languageOptions: { globals: globals.browser },
  },
];
