import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

// Závislosti jen dolů: domain < engine < state < tools < server (V002).
const ORDER = ["lib/domain", "lib/engine", "lib/state", "lib/tools", "server"];

const layerRules = ORDER.map((layer, i) => {
  const above = ORDER.slice(i + 1);
  return {
    files: [`${layer}/**/*.ts`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: above.length
            ? [{ group: above.flatMap((l) => [`@/${l}`, `@/${l}/*`]), message: `${layer} nesmí importovat vyšší vrstvu (V002).` }]
            : [],
        },
      ],
    },
  };
});

export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...layerRules,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["lib/engine/render/player.js", "lib/engine/render/measure.js"],
    rules: { "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^(mountInstaDeck|measureInstaDeck|measureMotionInstaDeck|measureLayoutInstaDeck|snapshotInstaDeck)$" }] },
    languageOptions: { globals: { ResizeObserver: "readonly", window: "readonly", document: "readonly", location: "readonly", history: "readonly", requestAnimationFrame: "readonly", performance: "readonly", matchMedia: "readonly", getComputedStyle: "readonly", setTimeout: "readonly", clearTimeout: "readonly", setInterval: "readonly", clearInterval: "readonly", URLSearchParams: "readonly", DOMMatrix: "readonly", fetch: "readonly", URL: "readonly" } },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { process: "readonly", console: "readonly" } },
  },
  globalIgnores(["node_modules/**", ".data/**", "out/**", "dist/**", "dist-bundle/**", "dist-lambda/**", "site/dist/**"]),
]);
