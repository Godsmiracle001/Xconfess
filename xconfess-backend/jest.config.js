module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/xconfess-backend/'],
  watchPathIgnorePatterns: ['<rootDir>/xconfess-backend/'],
  modulePathIgnorePatterns: ['<rootDir>/xconfess-backend/'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};
