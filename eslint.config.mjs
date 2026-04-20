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

      // C2 (Fetch Orchestrator Audit): block direct fetch() to the /state and
      // /dm-presence session endpoints. These MUST go through
      // lib/realtime/fetch-orchestrator.ts so we have a single throttle window,
      // circuit breaker, and coverage telemetry pool. A direct call here was
      // the root cause of the 2026-04-17 429 storm (90 × 429 in 2min).
      // The orchestrator module itself, unit/integration tests, and doc
      // examples are exempted via file-pattern overrides below.
      "no-restricted-syntax": [
        "error",
        {
          // Template literal form (interpolated): fetch(`/api/session/${x}/state`).
          // The trailing quasi carries `/state` or `/dm-presence` (plus any
          // query string), so we pattern-match the LAST quasi's raw value.
          // Covers calls with one or more interpolations; the pure static
          // case (no ${...}) is handled by the third selector below.
          selector: "CallExpression[callee.name='fetch'][arguments.0.type='TemplateLiteral'][arguments.0.quasis.length>1][arguments.0.quasis.1.value.raw=/^.(state|dm-presence)/]",
          message:
            "Use fetchOrchestrator.fetch() — direct fetch() to /api/session/[id]/state or /dm-presence is banned. See lib/realtime/fetch-orchestrator.ts and docs/spec-fetch-orchestrator-audit.md.",
        },
        {
          // Template literal form (no interpolation): fetch(`/api/session/abc/state`).
          // Single quasi whose raw value is the full path.
          selector: "CallExpression[callee.name='fetch'][arguments.0.type='TemplateLiteral'][arguments.0.quasis.0.value.raw=/api.session..+.(state|dm-presence)/]",
          message:
            "Use fetchOrchestrator.fetch() — direct fetch() to /api/session/[id]/state or /dm-presence is banned. See lib/realtime/fetch-orchestrator.ts and docs/spec-fetch-orchestrator-audit.md.",
        },
        {
          // String-literal form: fetch('/api/session/abc/state') or
          // fetch(\"/api/session/xyz/dm-presence\"). Dots (`.`) stand in for
          // the path separators since ESQuery's regex tokenizer treats raw
          // `/` inside the value as a regex delimiter.
          selector: "CallExpression[callee.name='fetch'][arguments.0.value=/api.session..+.(state|dm-presence)/]",
          message:
            "Use fetchOrchestrator.fetch() — direct fetch() to /api/session/[id]/state or /dm-presence is banned. See lib/realtime/fetch-orchestrator.ts and docs/spec-fetch-orchestrator-audit.md.",
        },
      ],
    },
  },
  {
    // The orchestrator is the one legitimate place that calls fetch() to these
    // endpoints. Its tests also drive fetch() via dependency-injection + assert
    // URL shapes, so they need the exemption too.
    files: [
      "lib/realtime/fetch-orchestrator.ts",
      "lib/realtime/__tests__/**",
    ],
    rules: {
      "no-restricted-syntax": "off",
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
