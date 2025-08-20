# Dynamic Styles Guide

This guide explains how to handle dynamic styling in the CMS without using inline styles, which can cause accessibility and performance issues.

## Why Avoid Inline Styles?

1. **Performance**: Inline styles prevent CSS optimization and caching
2. **Accessibility**: Screen readers and assistive technologies work better with CSS classes
3. **Maintainability**: CSS classes are easier to update and debug
4. **Security**: Reduces risk of style injection attacks
5. **Consistency**: Ensures design system compliance

## Solutions for Dynamic Styling

### 1. CSS Utility Classes (Preferred)

For common dynamic values, use pre-defined CSS classes:

```tsx
// ❌ Avoid inline styles
<div style={{ paddingLeft: `${level * 16}px` }}>

// ✅ Use utility classes
<div className={getTreeIndentClass(level)}>
```

### 2. CSS Custom Properties

For truly dynamic values that can't be pre-defined:

```tsx
// ❌ Avoid inline styles
<div style={{ height: `${dynamicHeight}px` }}>

// ✅ Use CSS custom properties
<div 
  className="dynamic-height" 
  style={createDynamicStyles({ dynamicHeight: height })}
>
```

### 3. Utility Functions

Use the provided utility functions from `utils/dynamic-styles.ts`:

#### Tree Indentation
```tsx
import { getTreeIndentClass, getDynamicPaddingLeft } from '@/utils/dynamic-styles';

// For standard tree levels (0-10)
<div className={getTreeIndentClass(level)}>

// For custom indentation
<div 
  className="dynamic-padding-left"
  style={getDynamicPaddingLeft(level, 8, 16)}
>
```

#### Category Indentation
```tsx
import { getCategoryIndentClass } from '@/utils/dynamic-styles';

<div className={getCategoryIndentClass(category.level)}>
```

#### Editor Heights
```tsx
import { getEditorHeightClass, createDynamicStyles } from '@/utils/dynamic-styles';

// For standard heights
<div className={getEditorHeightClass(height)}>

// For custom heights
<div 
  className="dynamic-height"
  style={createDynamicStyles({ dynamicHeight: height })}
>
```

## Available CSS Classes

### Tree Indentation
- `tree-indent-0` through `tree-indent-10`
- Base: 8px, Increment: 16px per level

### Category Indentation
- `category-indent-0` through `category-indent-10`
- Base: 12px, Increment: 20px per level

### Editor Heights
- `editor-height-sm` (200px)
- `editor-height-md` (300px)
- `editor-height-lg` (400px)
- `editor-height-xl` (500px)

### Dynamic Classes
- `dynamic-padding-left` - Uses `--dynamic-padding` CSS variable
- `dynamic-height` - Uses `--dynamic-height` CSS variable

## ESLint Rule

The project includes an ESLint rule that prevents inline styles:

```javascript
'react/forbid-dom-props': [
  'error',
  {
    forbid: [
      {
        propName: 'style',
        message: 'Avoid inline styles. Use CSS classes or dynamic-styles utilities instead.'
      }
    ]
  }
]
```

## Migration Examples

### Before (Inline Styles)
```tsx
// Tree component
<div style={{ paddingLeft: `${level * 16 + 8}px` }}>

// Editor component  
<div style={{ height: dynamicHeight }}>

// Category selector
<div style={{ paddingLeft: `${12 + level * 20}px` }}>
```

### After (CSS Classes + Utilities)
```tsx
// Tree component
<div 
  className="dynamic-padding-left"
  style={getDynamicPaddingLeft(level, 8, 16)}
>

// Editor component
<div 
  className="dynamic-height"
  style={createDynamicStyles({ dynamicHeight })}
>

// Category selector
<div className={getCategoryIndentClass(level)}>
```

## Best Practices

1. **Always prefer CSS classes** over dynamic styles when possible
2. **Use utility functions** for common dynamic patterns
3. **Document any necessary inline styles** with comments explaining why they're needed
4. **Test with screen readers** to ensure accessibility
5. **Keep dynamic values minimal** - most UI should use static classes

## File Structure

```
cms/
├── styles/
│   └── dynamic-utils.css          # CSS utility classes
├── utils/
│   └── dynamic-styles.ts          # Utility functions
├── types/
│   └── dynamic-styles.d.ts        # Type definitions
└── docs/
    └── DYNAMIC_STYLES_GUIDE.md    # This guide
```

## Testing

Run the linter to check for inline style violations:

```bash
npm run lint
```

The ESLint rule will catch any new inline styles and suggest alternatives.