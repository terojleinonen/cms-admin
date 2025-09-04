/**
 * Utility functions for handling dynamic styles without inline CSS
 */

/**
 * Get tree indentation class based on level
 * @param level - The tree level (0-based)
 * @returns CSS class name for indentation
 */
export function getTreeIndentClass(level: number): string {
  const clampedLevel = Math.min(Math.max(level, 0), 10);
  return `tree-indent-${clampedLevel}`;
}

/**
 * Get category indentation class based on level
 * @param level - The category level (0-based)
 * @returns CSS class name for indentation
 */
export function getCategoryIndentClass(level: number): string {
  const clampedLevel = Math.min(Math.max(level, 0), 10);
  return `category-indent-${clampedLevel}`;
}

/**
 * Get category tree indentation class based on level (24px increment)
 * @param level - The tree level (0-based)
 * @returns CSS class name for indentation
 */
export function getCategoryTreeIndentClass(level: number): string {
  const clampedLevel = Math.min(Math.max(level, 0), 10);
  return `category-tree-indent-${clampedLevel}`;
}

/**
 * Get editor height class based on height value
 * @param height - Height in pixels or string
 * @returns CSS class name for height
 */
export function getEditorHeightClass(height: string | number): string {
  const heightNum = typeof height === 'string' ? parseInt(height) : height;
  
  if (heightNum <= 200) return 'editor-height-sm';
  if (heightNum <= 300) return 'editor-height-md';
  if (heightNum <= 400) return 'editor-height-lg';
  return 'editor-height-xl';
}

/**
 * Create CSS custom properties for truly dynamic values
 * @param properties - Object with CSS custom property values
 * @returns React CSSProperties object
 */
export function createDynamicStyles(properties: Record<string, string | number>): React.CSSProperties {
  const styles: React.CSSProperties = {};
  
  Object.entries(properties).forEach(([key, value]) => {
    const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    (styles as any)[cssVar] = typeof value === 'number' ? `${value}px` : value;
  });
  
  return styles;
}

/**
 * Get dynamic padding left style when CSS classes aren't sufficient
 * @param level - The indentation level
 * @param basePixels - Base padding in pixels
 * @param incrementPixels - Increment per level in pixels
 * @returns CSS custom properties object
 */
export function getDynamicPaddingLeft(level: number, basePixels: number = 8, incrementPixels: number = 16): React.CSSProperties {
  return createDynamicStyles({
    dynamicPadding: level * incrementPixels + basePixels
  });
}