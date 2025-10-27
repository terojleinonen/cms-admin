# Dependency Management Guide

## Overview

This guide outlines best practices for managing dependencies in the Kin Workspace CMS to prevent the introduction of deprecated, insecure, or unmaintained packages.

## Deprecated Library Replacements

### Replaced Libraries

The following deprecated libraries have been removed from the project and should not be reintroduced:

#### lodash.isequal → Node.js util.isDeepStrictEqual
```javascript
// ❌ Deprecated - DO NOT USE
import isEqual from 'lodash.isequal';
const result = isEqual(obj1, obj2);

// ✅ Use Node.js native function instead
import { isDeepStrictEqual } from 'node:util';
const result = isDeepStrictEqual(obj1, obj2);

// ✅ Or use the migration utility
import { isDeepEqual } from '../lib/migration-utils';
const result = isDeepEqual(obj1, obj2);
```

#### node-domexception → Platform Native DOMException
```javascript
// ❌ Deprecated - DO NOT USE
import { DOMException } from 'node-domexception';
throw new DOMException('Invalid file type', 'InvalidFileType');

// ✅ Use platform-native DOMException instead
throw new DOMException('Invalid file type', 'InvalidFileType');

// ✅ Or use the migration utility
import { createDOMException } from '../lib/migration-utils';
throw createDOMException('Invalid file type', 'InvalidFileType');
```

#### Quill → Native Rich Text Editor
```javascript
// ❌ Deprecated - DO NOT USE
import ReactQuill from 'react-quill';
import Quill from 'quill';

// ✅ Use native rich text editor instead
import { NativeRichTextEditor } from '../components/editor/NativeRichTextEditor';
```

### Common Deprecated Patterns and Alternatives

#### Deep Object Comparison
```javascript
// ❌ Avoid lodash utilities
import _ from 'lodash';
import isEqual from 'lodash.isequal';

// ✅ Use native alternatives
import { isDeepStrictEqual } from 'node:util';

// For shallow comparison
const shallowEqual = (obj1, obj2) => {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  return keys1.every(key => obj1[key] === obj2[key]);
};
```

#### Array Utilities
```javascript
// ❌ Avoid lodash array utilities
import { uniq, flatten, chunk } from 'lodash';

// ✅ Use native array methods
const unique = arr => [...new Set(arr)];
const flatten = arr => arr.flat();
const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};
```

#### Object Utilities
```javascript
// ❌ Avoid lodash object utilities
import { pick, omit, merge } from 'lodash';

// ✅ Use native object methods
const pick = (obj, keys) => 
  Object.fromEntries(keys.map(key => [key, obj[key]]));

const omit = (obj, keys) => 
  Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key)));

const merge = (target, ...sources) => Object.assign({}, target, ...sources);
```

## Dependency Validation Process

### Before Adding Dependencies

1. **Check Maintenance Status**
   ```bash
   npm info <package-name>
   ```
   - Look for recent updates (within last 6 months)
   - Check for active maintainers
   - Verify download statistics

2. **Security Audit**
   ```bash
   npm audit
   npm run deps:validate
   ```

3. **Alternative Research**
   - Check if native JavaScript/Node.js provides the functionality
   - Look for more actively maintained alternatives
   - Consider the bundle size impact

### Automated Checks

The project includes automated checks to prevent deprecated library usage:

#### ESLint Rules
- `no-restricted-imports` prevents importing deprecated libraries
- Configured to block: `lodash.isequal`, `node-domexception`, `quill`, `react-quill`
- Warns about individual lodash packages

#### CI/CD Pipeline
- `npm run deps:validate` runs on every PR
- Daily dependency validation checks
- Automated security scanning with Snyk
- Dependency vulnerability scanning

#### Package Scripts
```bash
# Check for deprecated dependencies
npm run deps:check-deprecated

# Run security audit
npm run deps:audit

# Full dependency validation
npm run deps:validate

# Complete CI validation
npm run ci:validate
```

## Development Guidelines

### 1. Dependency Selection Criteria

**✅ Preferred Dependencies:**
- Actively maintained (updates within 6 months)
- Large community adoption
- Good security track record
- Minimal dependencies
- TypeScript support
- Clear documentation

**❌ Avoid Dependencies:**
- Deprecated or unmaintained packages
- Packages with known security vulnerabilities
- Packages with excessive dependencies
- Packages that duplicate native functionality
- Packages with unclear licensing

### 2. Adding New Dependencies

1. **Research Phase**
   - Check npm trends and download statistics
   - Review GitHub activity and issue resolution
   - Verify TypeScript support
   - Check bundle size impact

2. **Evaluation Phase**
   ```bash
   # Install and test in development
   npm install <package-name>
   
   # Check for vulnerabilities
   npm audit
   
   # Verify no deprecated dependencies
   npm run deps:check-deprecated
   ```

3. **Documentation Phase**
   - Document why the dependency is needed
   - Note any alternatives considered
   - Update this guide if introducing new patterns

### 3. Dependency Updates

1. **Regular Updates**
   ```bash
   # Check for outdated packages
   npm outdated
   
   # Update dependencies
   npm update
   
   # Validate after updates
   npm run deps:validate
   npm test
   ```

2. **Major Version Updates**
   - Review breaking changes
   - Update code accordingly
   - Run full test suite
   - Update documentation

### 4. Removing Dependencies

1. **Identify Unused Dependencies**
   ```bash
   # Use tools like depcheck
   npx depcheck
   ```

2. **Safe Removal Process**
   - Remove from package.json
   - Remove all imports/usage
   - Run tests to ensure nothing breaks
   - Update documentation

## Monitoring and Maintenance

### Daily Automated Checks
- Dependency vulnerability scanning
- Deprecated dependency detection
- Security audit reports

### Weekly Manual Reviews
- Review dependency update notifications
- Check for new security advisories
- Evaluate new alternatives for existing dependencies

### Monthly Dependency Audits
- Full dependency tree analysis
- Bundle size impact assessment
- Performance impact evaluation
- Documentation updates

## Emergency Response

### Security Vulnerabilities
1. **Immediate Response**
   ```bash
   # Check vulnerability details
   npm audit
   
   # Apply automatic fixes if available
   npm audit fix
   
   # Manual update if needed
   npm update <vulnerable-package>
   ```

2. **Validation**
   ```bash
   # Verify fix
   npm audit
   npm test
   npm run deps:validate
   ```

### Deprecated Package Alerts
1. **Assessment**
   - Evaluate impact and urgency
   - Research replacement options
   - Plan migration timeline

2. **Migration**
   - Follow the replacement patterns in this guide
   - Update tests and documentation
   - Deploy and monitor

## Tools and Resources

### Recommended Tools
- **npm audit**: Built-in security auditing
- **Snyk**: Advanced security scanning
- **depcheck**: Find unused dependencies
- **npm-check-updates**: Check for dependency updates
- **bundlephobia**: Analyze bundle size impact

### Useful Commands
```bash
# Dependency analysis
npm ls --depth=0                    # List direct dependencies
npm ls <package-name>               # Find where package is used
npm explain <package-name>          # Show dependency chain

# Security and validation
npm audit --audit-level=moderate    # Security audit
npm run deps:check-deprecated       # Check for deprecated deps
npm run deps:validate               # Full validation

# Updates and maintenance
npm outdated                        # Check for updates
npm update                          # Update dependencies
npm prune                          # Remove unused packages
```

## Contact and Support

For questions about dependency management or to report deprecated dependencies:

1. Create an issue in the project repository
2. Tag the issue with `dependencies` label
3. Include the package name and suggested alternative
4. Follow the security reporting process for vulnerabilities

## Changelog

- **2025-01-XX**: Initial guide creation
- **2025-01-XX**: Added Quill → Native Editor migration
- **2025-01-XX**: Added lodash.isequal → util.isDeepStrictEqual migration
- **2025-01-XX**: Added node-domexception → native DOMException migration