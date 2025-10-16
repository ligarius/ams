import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/services/**/*.ts',
    '<rootDir>/src/middleware/**/*.ts',
    '<rootDir>/src/utils/**/*.ts',
    '<rootDir>/src/config/**/*.ts',
    '<rootDir>/src/server.ts',
    '!<rootDir>/src/lib/prisma.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@backend/(.*)$': '<rootDir>/src/$1',
    '^@/lib/auth/(.*)$': '<rootDir>/apps/web/src/lib/auth/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^next/headers$': '<rootDir>/tests/mocks/next-headers',
    '^next/server$': '<rootDir>/tests/mocks/next-server',
    '^react$': '<rootDir>/tests/mocks/react',
  },
  testPathIgnorePatterns: ['<rootDir>/tests/e2e'],
};

export default config;
