import { StyleCategory } from '../types';

/**
 * Build the canonical Figma style name
 * Format: [Breakpoint/]Category/SizeName[/Weight]
 * Examples: "Display/D1/Bold", "Mobile/Title/H1/Semibold", "Body/Base/Regular"
 */
export function buildStyleName(
  breakpoint: 'mobile' | 'desktop' | null,
  category: StyleCategory,
  sizeName: string,
  weight?: string
): string {
  const parts: string[] = [];

  // Add breakpoint if responsive is enabled
  if (breakpoint) {
    parts.push(capitalize(breakpoint));
  }

  // Add category
  parts.push(getCategoryDisplayName(category));

  // Add size name
  parts.push(sizeName);

  // Add weight if specified
  if (weight) {
    parts.push(weight);
  }

  return parts.join('/');
}

/**
 * Convert style name to JS dot-path
 * "Display/D1/Bold" -> "typography.display.d1.bold"
 * "Mobile/Title/H1" -> "typography.mobile.title.h1"
 */
export function toJsPath(styleName: string): string {
  return 'typography.' + styleName.toLowerCase().replace(/\//g, '.');
}

/**
 * Convert style name to CSS variable name
 * "Display/D1/Bold" -> "--display-d1-bold"
 * "Mobile/Title/H1" -> "--mobile-title-h1"
 */
export function toCssVar(styleName: string): string {
  return '--' + styleName.toLowerCase().replace(/\//g, '-');
}

/**
 * Convert style name to kebab-case
 * "Display/D1/Bold" -> "display-d1-bold"
 */
export function toKebabCase(styleName: string): string {
  return styleName.toLowerCase().replace(/\//g, '-');
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: StyleCategory): string {
  const names: Record<StyleCategory, string> = {
    display: 'Display',
    title: 'Title',
    body: 'Body',
    code: 'Code',
  };
  return names[category];
}

/**
 * Parse a Figma style name into components
 */
export interface ParsedStyleName {
  breakpoint: 'mobile' | 'desktop' | null;
  category: string;
  sizeName: string;
  weight: string | null;
}

export function parseStyleName(name: string): ParsedStyleName {
  const parts = name.split('/');

  if (parts.length < 2) {
    return {
      breakpoint: null,
      category: parts[0] || 'body',
      sizeName: parts[1] || 'Base',
      weight: null,
    };
  }

  // Check if first part is a breakpoint
  const possibleBreakpoint = parts[0]?.toLowerCase();
  const hasBreakpoint = possibleBreakpoint === 'mobile' || possibleBreakpoint === 'desktop';

  if (hasBreakpoint) {
    return {
      breakpoint: possibleBreakpoint as 'mobile' | 'desktop',
      category: parts[1] || 'body',
      sizeName: parts[2] || 'Base',
      weight: parts[3] || null,
    };
  }

  return {
    breakpoint: null,
    category: parts[0] || 'body',
    sizeName: parts[1] || 'Base',
    weight: parts[2] || null,
  };
}
