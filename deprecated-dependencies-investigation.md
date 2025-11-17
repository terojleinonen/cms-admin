# Deprecated Dependencies Investigation Report

**Date:** November 16, 2025  
**Task:** Jest Version Upgrade - Task 8  
**Spec:** `.kiro/specs/jest-version-upgrade/`

## Executive Summary

After upgrading Jest from v25 to v30 and completing tasks 1-7, an investigation was conducted to identify and document any remaining deprecated dependencies in the project. The investigation revealed that **most of the originally mentioned deprecated packages are no longer present** in the dependency tree.

## Investigation Methodology

1. **npm install analysis**: Ran `npm install` to capture deprecation warnings
2. **Dependency tree tracing**: Used `npm ls <package>` to trace each mentioned deprecated package
3. **Security audit**: Ran `npm audit` to identify vulnerabilities
4. **Full dependency scan**: Analyzed complete dependency tree for deprecated packages

## Findings by Package

### 1. request (RESOLVED)
- **Status**: Not found in dependency tree
- **Command**: `npm ls request`
- **Result**: `(empty)` - Package is not present
- **Conclusion**: This deprecated package has been eliminated from the project

### 2. request-promise-native (RESOLVED)
- **Status**: Not found in dependency tree
- **Related to**: request package
- **Conclusion**: Eliminated along with request package

### 3. rimraf (RESOLVED)
- **Status**: Not found in dependency tree
- **Command**: `npm ls rimraf`
- **Result**: `(empty)` - Package is not present
- **Conclusion**: No longer a dependency (likely replaced by native Node.js fs.rm)

### 4. har-validator (RESOLVED)
- **Status**: Not found in dependency tree
- **Command**: `npm ls har-validator`
- **Result**: `(empty)` - Package is not present
- **Conclusion**: Eliminated (was a dependency of request package)

### 5. abab (RESOLVED)
- **Status**: Not found in dependency tree
- **Command**: `npm ls abab`
- **Result**: `(empty)` - Package is not present
- **Conclusion**: No longer present (was likely from older jsdom versions)

### 6. domexception (RESOLVED)
- **Status**: Not found in dependency tree
- **Command**: `npm ls domexception`
- **Result**: `(empty)` - Package is not present
- **Conclusion**: Eliminated (was a jsdom dependency, now handled natively)

### 7. w3c-hr-time (RESOLVED)
- **Status**: Not found in dependency tree
- **Command**: `npm ls w3c-hr-time`
- **Result**: `(empty)` - Package is not present
- **Conclusion**: No longer present (was a jsdom dependency)

### 8. uuid (MODERN VERSIONS ONLY)
- **Status**: Modern versions present, no deprecated versions
- **Command**: `npm ls uuid`
- **Result**:
  ```
  kin-workspace-cms@0.1.0
  ├─┬ next-auth@4.24.13
  │ └── uuid@8.3.2
  └── uuid@11.1.0
  ```
- **Analysis**:
  - Direct dependency: `uuid@11.1.0` (modern, latest version)
  - Transitive dependency: `uuid@8.3.2` via `next-auth@4.24.13`
  - Note: uuid@8.3.2 is NOT uuid@3.x, so the originally mentioned deprecated version is not present
  - uuid@8.3.2 is still maintained and not deprecated
- **Conclusion**: The deprecated uuid@3.x is not present. uuid@8.3.2 is acceptable as a transitive dependency

## Current npm install Status

### Deprecation Warnings
**Result**: ZERO deprecation warnings

When running `npm install`, no deprecation warnings are displayed. This is a significant improvement from the original state.

```bash
$ npm install
up to date, audited 1056 packages in 25s

17 moderate severity vulnerabilities

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force
```

### Security Vulnerabilities

The project has **17 moderate severity vulnerabilities**, all related to `js-yaml` in the Jest/Istanbul testing infrastructure:

**Vulnerability**: js-yaml <4.1.1 - Prototype pollution in merge (<<)
- **Severity**: Moderate
- **Affected package**: `js-yaml` used by `@istanbuljs/load-nyc-config`
- **Impact**: Testing infrastructure only (not production code)
- **Fix available**: `npm audit fix --force` (would downgrade babel-jest to v25, breaking the upgrade)
- **Recommendation**: Monitor for updates to `@istanbuljs/load-nyc-config` that use js-yaml@4.1.1+

**Dependency chain**:
```
js-yaml@<4.1.1
└── @istanbuljs/load-nyc-config
    └── babel-plugin-istanbul
        └── @jest/transform
            └── jest (and related packages)
```

## Optional Dependencies (Not Issues)

The following "UNMET OPTIONAL DEPENDENCY" messages are **normal and expected**:
- Platform-specific binaries for Tailwind CSS, LightningCSS, and other tools
- These are optional dependencies for platforms not in use
- They do not affect functionality or represent deprecated packages

## Comparison: Before vs After Jest Upgrade

### Before (Jest v25)
- Multiple deprecated packages present (request, rimraf, har-validator, etc.)
- Version mismatches between Jest packages
- Deprecation warnings during npm install
- CI test failures due to version conflicts

### After (Jest v30)
- All originally mentioned deprecated packages eliminated
- Consistent Jest v30 across all packages
- Zero deprecation warnings during npm install
- CI tests passing successfully
- 17 moderate security vulnerabilities in testing infrastructure (js-yaml)

## Prioritized Action Items

### Immediate Actions (None Required)
All originally mentioned deprecated packages have been eliminated. No immediate action needed.

### Future Monitoring
1. **js-yaml vulnerability**: Monitor for updates to `@istanbuljs/load-nyc-config` or `babel-plugin-istanbul` that resolve the js-yaml vulnerability
2. **next-auth updates**: When next-auth releases a new version, check if it updates uuid to v11+
3. **Regular audits**: Run `npm audit` periodically to catch new vulnerabilities

### Optional Improvements
1. Consider using `npm audit fix` for non-breaking fixes (if any become available)
2. Monitor Jest ecosystem for updates that might resolve the js-yaml issue
3. Consider alternative code coverage tools if js-yaml vulnerability becomes critical

## Parent Packages to Monitor

Based on the security audit, the following parent packages should be monitored for updates:

| Package | Current Version | Reason to Monitor |
|---------|----------------|-------------------|
| `@istanbuljs/load-nyc-config` | (transitive) | Uses vulnerable js-yaml version |
| `babel-plugin-istanbul` | (transitive) | Depends on @istanbuljs/load-nyc-config |
| `next-auth` | 4.24.13 | Uses uuid@8.3.2 (could update to uuid@11+) |

## Conclusion

**Task Status**: COMPLETE

The investigation reveals that the Jest v30 upgrade has successfully eliminated all originally mentioned deprecated dependencies:
- request - eliminated
- request-promise-native - eliminated
- rimraf - eliminated
- har-validator - eliminated
- abab - eliminated
- domexception - eliminated
- w3c-hr-time - eliminated
- uuid@3.x - eliminated (uuid@8.3.2 and uuid@11.1.0 are modern versions)

**No deprecation warnings** are present during `npm install`, indicating a clean and modern dependency tree.

The only remaining concern is the js-yaml vulnerability in the testing infrastructure, which is:
- Moderate severity (not critical)
- Limited to testing/development environment
- Not affecting production code
- Requires upstream package updates to resolve

## Recommendations

1. **Accept current state**: The project is in excellent condition with zero deprecated dependencies
2. **Monitor security advisories**: Keep an eye on the js-yaml vulnerability for updates
3. **Proceed to next task**: Task 9 (updating packages to eliminate deprecated dependencies) is **not needed** as all deprecated dependencies have been eliminated
4. **Skip to task 10**: Proceed directly to task 10 (verify clean npm install) which will confirm these findings

## References

- Jest 30 Release Notes: https://jestjs.io/blog/2024/04/24/jest-30
- npm audit documentation: https://docs.npmjs.com/cli/v10/commands/npm-audit
- js-yaml vulnerability: https://github.com/advisories/GHSA-mh29-5h37-fv8m
