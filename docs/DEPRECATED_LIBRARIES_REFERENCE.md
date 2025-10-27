# Deprecated Libraries Quick Reference

## 🚫 Blocked Libraries

These libraries are blocked by ESLint and should not be used:

| Deprecated Library | Native Alternative | Migration Utility |
|-------------------|-------------------|-------------------|
| `lodash.isequal` | `util.isDeepStrictEqual` | `isDeepEqual()` |
| `node-domexception` | `DOMException` | `createDOMException()` |
| `quill` | `contentEditable + native APIs` | `NativeRichTextEditor` |
| `react-quill` | `contentEditable + native APIs` | `NativeRichTextEditor` |

## 🔄 Quick Migration Examples

### Deep Equality Check
```javascript
// ❌ Old way
import isEqual from 'lodash.isequal';
const same = isEqual(obj1, obj2);

// ✅ New way
import { isDeepStrictEqual } from 'node:util';
const same = isDeepStrictEqual(obj1, obj2);
```

### DOM Exceptions
```javascript
// ❌ Old way
import { DOMException } from 'node-domexception';
throw new DOMException('Error', 'TypeError');

// ✅ New way
throw new DOMException('Error', 'TypeError');
```

### Rich Text Editor
```javascript
// ❌ Old way
import ReactQuill from 'react-quill';
<ReactQuill value={content} onChange={setContent} />

// ✅ New way
import { NativeRichTextEditor } from '../components/editor/NativeRichTextEditor';
<NativeRichTextEditor value={content} onChange={setContent} />
```

## 🛠️ Validation Commands

```bash
# Check for deprecated dependencies
npm run deps:check-deprecated

# Run full dependency validation
npm run deps:validate

# Lint for deprecated imports
npm run lint
```

## 📋 Pre-commit Checklist

- [ ] No deprecated library imports
- [ ] ESLint passes without deprecated library warnings
- [ ] `npm run deps:validate` passes
- [ ] All tests pass
- [ ] Documentation updated if needed

## 🆘 Need Help?

1. Check the [Dependency Management Guide](./DEPENDENCY_MANAGEMENT_GUIDE.md)
2. Look at existing migration utilities in `lib/migration-utils.ts`
3. Create an issue with the `dependencies` label