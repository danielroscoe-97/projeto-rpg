import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import security from "eslint-plugin-security";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "public/**",
      "_bmad-output/**",
      "scripts/audios/**",
      "referencia visual/**",
      "scripts/load-test/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      security,
    },
    rules: {
      // React Hooks — exhaustive-deps must be error, not warn
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",

      // Security rules
      "no-eval": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-object-injection": "off", // Too many false positives with TypeScript
      "security/detect-possible-timing-attacks": "warn",
      "security/detect-unsafe-regex": "error",

      // Prevent dangerouslySetInnerHTML without explicit justification
      "react/no-danger": "error",

      // Allow underscore-prefixed unused vars (standard convention for intentional omissions)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Test files: allow require() imports (jest.mock patterns) and unused vars from test setup
    files: ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**", "__mocks__/**"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    // Scripts: relax rules that cause false positives on CLI tooling
    files: ["scripts/**/*.ts", "scripts/**/*.js"],
    rules: {
      "security/detect-non-literal-regexp": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    // Config files: allow require() imports (Tailwind, etc.)
    files: ["*.config.ts", "*.config.js", "*.config.mjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
