import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
  moduleNameMapper: {
    "\\.css$": "<rootDir>/__mocks__/styleMock.ts",
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/e2e/",
    "<rootDir>/scripts/orchestrator/",
    // Individual legacy files in lib/combat/ that use vitest imports (not jest-compatible).
    // They were previously skipped by ignoring the entire `lib/combat/` folder, but S5.3
    // adds a new parse-recharge.test.ts there which IS jest-compatible.
    "lib/combat/parse-action.test.ts",
    "lib/combat/parse-resistances.test.ts",
    "<rootDir>/.claude/",
    "<rootDir>/backup/",
  ],
};

export default config;
