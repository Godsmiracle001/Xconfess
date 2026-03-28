/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    customExportConditions: [""],
  },
  rootDir: ".",
  testMatch: [
    "**/app/**/__tests__/**/*.test.ts",
    "**/app/**/__tests__/**/*.test.tsx",
    "**/tests/**/*.spec.ts",
    "**/tests/**/*.spec.tsx",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          allowJs: true,
        },
      },
    ],
    ".+node_modules.+(until-async|@mswjs|msw).+\\.[jt]sx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          allowJs: true,
        },
      },
    ],
  },
  transformIgnorePatterns: [],
};
module.exports = config;
