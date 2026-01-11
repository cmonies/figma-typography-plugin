import { StyleDefinition, StyleMappings, StyleCategory } from '../types';
import { toJsPath, toCssVar } from './naming';

/**
 * Get approximate Tailwind font-size class
 */
function getTailwindFontSize(fontSize: number): string {
  if (fontSize <= 12) return 'text-xs';
  if (fontSize <= 14) return 'text-sm';
  if (fontSize <= 16) return 'text-base';
  if (fontSize <= 18) return 'text-lg';
  if (fontSize <= 20) return 'text-xl';
  if (fontSize <= 24) return 'text-2xl';
  if (fontSize <= 30) return 'text-3xl';
  if (fontSize <= 36) return 'text-4xl';
  if (fontSize <= 48) return 'text-5xl';
  if (fontSize <= 60) return 'text-6xl';
  if (fontSize <= 72) return 'text-7xl';
  if (fontSize <= 96) return 'text-8xl';
  return 'text-9xl';
}

/**
 * Get approximate Tailwind line-height class
 */
function getTailwindLineHeight(fontSize: number, lineHeight: number): string {
  const ratio = lineHeight / fontSize;
  if (ratio <= 1) return 'leading-none';
  if (ratio <= 1.15) return 'leading-tight';
  if (ratio <= 1.3) return 'leading-snug';
  if (ratio <= 1.45) return 'leading-normal';
  if (ratio <= 1.55) return 'leading-relaxed';
  return 'leading-loose';
}

/**
 * Get Tailwind font-weight class
 */
function getTailwindFontWeight(weight: string): string {
  const w = weight.toLowerCase();
  if (w.includes('thin') || w.includes('hairline')) return 'font-thin';
  if (w.includes('extralight') || w.includes('ultra light')) return 'font-extralight';
  if (w.includes('light')) return 'font-light';
  if (w.includes('regular') || w.includes('normal')) return 'font-normal';
  if (w.includes('medium')) return 'font-medium';
  if (w.includes('semibold') || w.includes('demi')) return 'font-semibold';
  if (w.includes('extrabold') || w.includes('ultra bold')) return 'font-extrabold';
  if (w.includes('bold')) return 'font-bold';
  if (w.includes('black') || w.includes('heavy')) return 'font-black';
  return 'font-normal';
}

/**
 * Generate mappings for a style definition
 */
export function generateMappings(style: StyleDefinition): StyleMappings {
  const tailwindSize = getTailwindFontSize(style.fontSize);
  const tailwindLineHeight = getTailwindLineHeight(style.fontSize, style.lineHeight);
  const tailwindWeight = getTailwindFontWeight(style.fontStyle);

  return {
    canonical: style.name,
    jsPath: toJsPath(style.name),
    cssVar: toCssVar(style.name),
    tailwind: `${tailwindSize} ${tailwindLineHeight} ${tailwindWeight}`,
  };
}

/**
 * Generate description text with mappings for Figma style
 */
export function generateStyleDescription(
  style: StyleDefinition,
  mappings: StyleMappings
): string {
  const lines = [
    `Size: ${style.fontSize}px / ${style.lineHeight}px`,
    `Weight: ${style.fontStyle}`,
    ``,
    `CSS var: ${mappings.cssVar}`,
    `JS path: ${mappings.jsPath}`,
    `Tailwind: ${mappings.tailwind}`,
  ];

  return lines.join('\n');
}

/**
 * Get font weight number from style name
 */
export function getFontWeightNumber(weight: string): number {
  const w = weight.toLowerCase();
  if (w.includes('thin') || w.includes('hairline')) return 100;
  if (w.includes('extralight') || w.includes('ultra light')) return 200;
  if (w.includes('light')) return 300;
  if (w.includes('regular') || w.includes('normal')) return 400;
  if (w.includes('medium')) return 500;
  if (w.includes('semibold') || w.includes('demi')) return 600;
  if (w.includes('bold') && !w.includes('extra') && !w.includes('ultra')) return 700;
  if (w.includes('extrabold') || w.includes('ultra bold')) return 800;
  if (w.includes('black') || w.includes('heavy')) return 900;
  return 400;
}

/**
 * Get usage description for a style
 */
export function getUsageDescription(category: StyleCategory, sizeName: string): string {
  const usages: Record<StyleCategory, Record<string, string>> = {
    display: {
      D1: 'Hero text, splash screens, main feature headlines',
      D2: 'Secondary display text, large feature callouts',
      D3: 'Tertiary display text, promotional content',
    },
    title: {
      H1: 'Primary page headings',
      H2: 'Section headings',
      H3: 'Subsection headings',
      H4: 'Card titles, minor headings',
      H5: 'Small headings, list titles',
      H6: 'Smallest headings, overlines',
    },
    body: {
      '2xl': 'Extra large body text, hero paragraphs',
      Xl: 'Large body text, lead paragraphs',
      Lg: 'Lead paragraphs, introductory text',
      Base: 'Default body copy',
      Sm: 'Secondary text, descriptions',
      Xs: 'Fine print, helper text',
    },
    code: {
      Lg: 'Large code blocks, featured snippets',
      Base: 'Default code and monospace text',
      Sm: 'Inline code, smaller snippets',
      Xs: 'Compact code, terminal output',
    },
  };

  return usages[category]?.[sizeName] || 'General purpose text';
}
