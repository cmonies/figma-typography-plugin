import {
  ScaleConfig,
  StyleCategory,
  BODY_SIZE_NAMES,
  TITLE_SIZE_NAMES,
  DISPLAY_SIZE_NAMES,
  CODE_SIZE_NAMES,
} from '../types';

/**
 * Round a number to the nearest multiple
 */
function roundTo(value: number, multiple: number): number {
  return Math.round(value / multiple) * multiple;
}

/**
 * Generate sizes using a modular scale
 */
function generateModularScale(config: ScaleConfig): number[] {
  const { min, max, ratio, rounding } = config;
  const sizes: number[] = [];
  let value = min;

  while (value <= max) {
    const rounded = roundTo(value, rounding);
    if (sizes.length === 0 || rounded !== sizes[sizes.length - 1]) {
      sizes.push(rounded);
    }
    value *= ratio;
  }

  // Ensure we include max if it's not already there
  const maxRounded = roundTo(max, rounding);
  if (sizes[sizes.length - 1] < maxRounded) {
    sizes.push(maxRounded);
  }

  return sizes;
}

/**
 * Generate sizes using linear interpolation
 */
function generateLinearScale(config: ScaleConfig): number[] {
  const { min, max, steps, rounding } = config;
  const sizes: number[] = [];
  const stepSize = (max - min) / Math.max(steps - 1, 1);

  for (let i = 0; i < steps; i++) {
    const value = min + i * stepSize;
    const rounded = roundTo(value, rounding);
    if (sizes.length === 0 || rounded !== sizes[sizes.length - 1]) {
      sizes.push(rounded);
    }
  }

  return sizes;
}

/**
 * Generate sizes using Tailwind-like fixed buckets
 */
function generateTailwindScale(config: ScaleConfig): number[] {
  const { min, max } = config;
  const tailwindSizes = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96, 128];
  return tailwindSizes.filter(size => size >= min && size <= max);
}

/**
 * Generate the font size scale based on configuration
 */
export function generateScale(config: ScaleConfig): number[] {
  switch (config.method) {
    case 'modular':
      return generateModularScale(config);
    case 'linear':
      return generateLinearScale(config);
    case 'tailwind':
      return generateTailwindScale(config);
    default:
      return generateModularScale(config);
  }
}

/**
 * Get size names for a category
 * Names are assigned from smallest to largest
 */
export function getSizeNamesForCategory(
  category: StyleCategory,
  count: number
): string[] {
  let namePool: string[];

  switch (category) {
    case 'body':
      namePool = BODY_SIZE_NAMES;
      break;
    case 'title':
      namePool = TITLE_SIZE_NAMES;
      break;
    case 'display':
      namePool = DISPLAY_SIZE_NAMES;
      break;
    case 'code':
      namePool = CODE_SIZE_NAMES;
      break;
    default:
      namePool = BODY_SIZE_NAMES;
  }

  // For title and display, we want largest first (H1 > H6, D1 > D3)
  // But sizes array is smallest to largest, so we reverse the names
  if (category === 'title' || category === 'display') {
    // Take from the end of the name pool (largest names)
    const startIdx = Math.max(0, namePool.length - count);
    return namePool.slice(startIdx).reverse();
  }

  // For body and code, take from the start centered around 'Base'
  if (count <= namePool.length) {
    // Try to center around 'Base' (index 2 for body)
    const baseIdx = namePool.indexOf('Base');
    if (baseIdx >= 0) {
      const halfCount = Math.floor(count / 2);
      const startIdx = Math.max(0, baseIdx - halfCount);
      return namePool.slice(startIdx, startIdx + count);
    }
    return namePool.slice(0, count);
  }

  // If we need more names than available, generate extras
  const result = [...namePool];
  let extraCount = count - namePool.length;
  let suffix = 2;
  while (extraCount > 0) {
    result.push(`${suffix}xl`);
    suffix++;
    extraCount--;
  }
  return result.slice(0, count);
}

/**
 * Map sizes to named steps for a category
 */
export interface NamedSize {
  name: string;
  size: number;
}

export function mapSizesToNames(
  sizes: number[],
  category: StyleCategory
): NamedSize[] {
  const names = getSizeNamesForCategory(category, sizes.length);

  // For title/display, sizes are small→large but names should be large→small (H1 is biggest)
  if (category === 'title' || category === 'display') {
    return sizes.map((size, i) => ({
      name: names[i],
      size,
    }));
  }

  // For body/code, sizes and names both go small→large
  return sizes.map((size, i) => ({
    name: names[i],
    size,
  }));
}

/**
 * Apply mobile scale multiplier with optional max cap
 */
export function applyMobileScale(
  sizes: number[],
  multiplier: number,
  rounding: number,
  maxCap?: number
): number[] {
  return sizes.map(size => {
    let mobileSize = size * multiplier;
    // Apply max cap if provided
    if (maxCap !== undefined && mobileSize > maxCap) {
      mobileSize = maxCap;
    }
    return roundTo(mobileSize, rounding);
  });
}

/**
 * Common modular scale ratios with names
 */
export const SCALE_RATIOS = [
  { value: 1.067, name: 'Minor Second' },
  { value: 1.125, name: 'Major Second' },
  { value: 1.2, name: 'Minor Third' },
  { value: 1.25, name: 'Major Third' },
  { value: 1.333, name: 'Perfect Fourth' },
  { value: 1.414, name: 'Augmented Fourth' },
  { value: 1.5, name: 'Perfect Fifth' },
  { value: 1.618, name: 'Golden Ratio' },
];
