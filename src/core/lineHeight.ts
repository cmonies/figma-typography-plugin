import { LineHeightPreset, LINE_HEIGHT_RATIOS, StyleCategory } from '../types';

/**
 * Round line-height to a clean value
 */
function roundLineHeight(value: number, roundTo: number = 2): number {
  return Math.round(value / roundTo) * roundTo;
}

/**
 * Calculate line-height for a given font size and preset
 */
export function calculateLineHeight(
  fontSize: number,
  preset: LineHeightPreset,
  rounding: number = 2
): number {
  const ratio = LINE_HEIGHT_RATIOS[preset];
  const lineHeight = fontSize * ratio;
  return roundLineHeight(lineHeight, rounding);
}

/**
 * Calculate letter-spacing for a given font size and category
 * Larger text typically needs tighter letter-spacing
 */
export function calculateLetterSpacing(
  fontSize: number,
  category: StyleCategory
): number {
  // Letter-spacing in percentage (Figma uses percentage)
  switch (category) {
    case 'display':
      // Large display text needs tighter tracking
      return fontSize > 60 ? -2 : -1;
    case 'title':
      return fontSize > 36 ? -1 : 0;
    case 'body':
      return 0;
    case 'code':
      // Mono fonts usually don't need letter-spacing adjustment
      return 0;
    default:
      return 0;
  }
}

/**
 * Get Tailwind line-height class approximation
 */
export function getTailwindLineHeight(ratio: number): string {
  if (ratio <= 1) return 'leading-none';
  if (ratio <= 1.15) return 'leading-tight';
  if (ratio <= 1.3) return 'leading-snug';
  if (ratio <= 1.45) return 'leading-normal';
  if (ratio <= 1.55) return 'leading-relaxed';
  return 'leading-loose';
}

/**
 * Line-height preset descriptions for UI
 */
export const LINE_HEIGHT_PRESETS = [
  { value: 'tighter' as LineHeightPreset, label: 'Tighter (1.1)', description: 'Display text, large headlines' },
  { value: 'tight' as LineHeightPreset, label: 'Tight (1.2)', description: 'Headlines, compact text' },
  { value: 'normal' as LineHeightPreset, label: 'Normal (1.5)', description: 'Standard body text' },
  { value: 'relaxed' as LineHeightPreset, label: 'Relaxed (1.65)', description: 'Airy, spacious feel' },
];
