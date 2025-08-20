/**
 * Type definitions for dynamic styles utilities
 */

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

// Extend React CSSProperties to include CSS custom properties
declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}

// Utility types for dynamic styling
export interface DynamicStyleProps {
  level?: number;
  height?: string | number;
  padding?: number;
}

export interface TreeIndentProps {
  level: number;
  basePixels?: number;
  incrementPixels?: number;
}

export interface CategoryIndentProps {
  level: number;
  maxLevel?: number;
}