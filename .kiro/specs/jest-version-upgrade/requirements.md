# Requirements Document

## Introduction

The CMS Admin project is experiencing Jest configuration errors in CI environments due to version mismatches between core Jest packages (v25.0.0) and environment packages (v30.0.5). This causes test failures with the error "Cannot read properties of undefined (reading 'onlyChanged')" when running security tests. Additionally, npm install displays multiple deprecation warnings for transitive dependencies (request, rimraf, har-validator, abab, domexception, w3c-hr-time, uuid@3.4.0) that need to be addressed. This spec addresses upgrading Jest to a consistent, modern version and resolving deprecated dependency warnings to ensure reliable test execution and a modern dependency tree.

## Glossary

- **Jest**: JavaScript testing framework used for unit, integration, and e2e tests
- **Test Environment**: The execution context for tests (node or jsdom)
- **CI Pipeline**: Continuous Integration automated testing workflow
- **Test Runner**: The Jest core that orchestrates test execution
- **Test Project**: Jest configuration for a specific test suite (unit, integration, e2e)
- **Package Manager**: npm package management system that handles dependency installation
- **Transitive Dependency**: A package that is not directly listed in package.json but is required by a direct dependency
- **Deprecated Package**: A software package that is no longer maintained or recommended for use

## Requirements

### Requirement 1

**User Story:** As a developer, I want Jest to run reliably in CI environments, so that automated tests don't fail due to configuration issues

#### Acceptance Criteria

1. WHEN the test suite runs in CI, THE Test Runner SHALL execute without version compatibility errors
2. THE Test Runner SHALL use Jest version 30.x or higher for all core and environment packages
3. WHEN security tests are executed with testPathPatterns, THE Test Runner SHALL complete successfully without undefined property errors
4. THE Test Runner SHALL maintain compatibility with existing test configurations for all test projects

### Requirement 2

**User Story:** As a developer, I want consistent Jest versions across all packages, so that local and CI test results are reliable

#### Acceptance Criteria

1. THE Test Runner SHALL use the same major version for jest, jest-environment-jsdom, and jest-environment-node packages
2. WHEN package.json is inspected, THE Test Runner SHALL show no version conflicts between Jest-related dependencies
3. THE Test Runner SHALL support the existing multi-project configuration with unit, integration, and e2e test suites
4. WHEN tests run locally, THE Test Runner SHALL produce identical results to CI execution

### Requirement 3

**User Story:** As a developer, I want the Jest upgrade to preserve existing test functionality, so that no tests break during the migration

#### Acceptance Criteria

1. THE Test Runner SHALL execute all existing unit tests without modification to test files
2. THE Test Runner SHALL execute all existing integration tests without modification to test files
3. THE Test Runner SHALL execute all existing e2e tests without modification to test files
4. WHEN the upgrade is complete, THE Test Runner SHALL pass all previously passing tests
5. THE Test Runner SHALL maintain support for TypeScript via ts-jest
6. THE Test Runner SHALL maintain support for React component testing via @testing-library/react

### Requirement 4

**User Story:** As a developer, I want the Jest configuration to work with Next.js 15 and React 19, so that modern framework features are testable

#### Acceptance Criteria

1. THE Test Runner SHALL support testing Next.js 15 App Router components
2. THE Test Runner SHALL support testing React 19 components and hooks
3. WHEN testing client components, THE Test Runner SHALL use jsdom environment correctly
4. WHEN testing server components, THE Test Runner SHALL use node environment correctly
5. THE Test Runner SHALL maintain existing module name mappings for @/ path aliases

### Requirement 5

**User Story:** As a developer, I want to eliminate deprecated dependency warnings during npm install, so that the project uses modern, maintained packages

#### Acceptance Criteria

1. WHEN running npm install, THE Package Manager SHALL NOT display deprecation warnings for direct dependencies
2. THE Package Manager SHALL identify and document all transitive deprecated dependencies
3. WHEN deprecated transitive dependencies are identified, THE Package Manager SHALL update parent packages to versions that use modern alternatives
4. THE Package Manager SHALL replace or update packages that depend on request, rimraf v2/v3, har-validator, abab, domexception, w3c-hr-time, and uuid@3.x
5. WHEN all updates are complete, THE Package Manager SHALL run npm install without any deprecation warnings

### Requirement 6

**User Story:** As a developer, I want babel-jest upgraded to a compatible version, so that Jest and Babel work together correctly

#### Acceptance Criteria

1. THE Test Runner SHALL use babel-jest version 30.x or higher to match Jest core version
2. WHEN TypeScript tests are transpiled, THE Test Runner SHALL use ts-jest without Babel conflicts
3. THE Test Runner SHALL maintain compatibility with existing Babel presets for React and TypeScript
4. WHEN tests run, THE Test Runner SHALL not display version mismatch warnings between Jest and babel-jest
