import {
  PluginConfig,
  StyleDefinition,
  StyleCategory,
  CategoryScaleConfig,
} from '../types';
import { generateScale, mapSizesToNames, applyMobileScale } from './scale';
import { calculateLineHeight, calculateLetterSpacing } from './lineHeight';
import { buildStyleName } from '../utils/naming';
import { generateMappings, generateStyleDescription, getUsageDescription } from '../utils/mappings';

/**
 * Generate all style definitions based on configuration
 */
export function generateStyleDefinitions(config: PluginConfig): StyleDefinition[] {
  const styles: StyleDefinition[] = [];

  // Process each enabled category
  const categories: StyleCategory[] = ['display', 'title', 'body', 'code'];

  for (const category of categories) {
    const categoryConfig = config.categories[category];
    if (!categoryConfig.enabled) continue;

    // Generate sizes for this category
    const sizes = generateScale(categoryConfig.scale);
    const namedSizes = mapSizesToNames(sizes, category);

    // Determine breakpoints to generate
    const breakpoints: Array<'mobile' | 'desktop' | null> = config.responsive.enabled
      ? ['desktop', 'mobile']
      : [null];

    for (const breakpoint of breakpoints) {
      // Get sizes for this breakpoint
      let finalSizes = namedSizes;

      if (breakpoint === 'mobile' && config.responsive.mobile.enabled) {
        // Get the mobile max cap for this category
        const maxCap = config.responsive.mobileMaxSizes[category];

        // Apply mobile scale multiplier with max cap
        const mobileSizes = applyMobileScale(
          sizes,
          config.responsive.mobile.scaleMultiplier,
          categoryConfig.scale.rounding,
          maxCap
        );
        finalSizes = mapSizesToNames(mobileSizes, category);
      }

      // Generate a style for each size and weight
      for (const namedSize of finalSizes) {
        for (const weight of categoryConfig.weights) {
          const styleDef = createStyleDefinition(
            config,
            category,
            categoryConfig,
            breakpoint,
            namedSize.name,
            namedSize.size,
            weight
          );
          styles.push(styleDef);
        }
      }
    }
  }

  return styles;
}

/**
 * Create a single style definition
 */
function createStyleDefinition(
  config: PluginConfig,
  category: StyleCategory,
  categoryConfig: CategoryScaleConfig,
  breakpoint: 'mobile' | 'desktop' | null,
  sizeName: string,
  fontSize: number,
  weight: string
): StyleDefinition {
  const lineHeight = calculateLineHeight(
    fontSize,
    categoryConfig.lineHeight,
    categoryConfig.scale.rounding
  );

  const letterSpacing = calculateLetterSpacing(fontSize, category);

  // Only include weight in name if there are multiple weights
  const includeWeight = categoryConfig.weights.length > 1;

  const name = buildStyleName(
    breakpoint,
    category,
    sizeName,
    includeWeight ? weight : undefined
  );

  const styleDef: StyleDefinition = {
    name,
    category,
    breakpoint,
    sizeName,
    fontFamily: categoryConfig.fontFamily,
    fontStyle: weight,
    fontSize,
    lineHeight,
    letterSpacing,
    description: '',
    mappings: {
      canonical: name,
      jsPath: '',
      cssVar: '',
      tailwind: '',
    },
  };

  // Generate mappings
  styleDef.mappings = generateMappings(styleDef);

  // Generate description with usage and mappings
  const usage = getUsageDescription(category, sizeName);
  styleDef.description = `${usage}\n\n${generateStyleDescription(styleDef, styleDef.mappings)}`;

  return styleDef;
}

/**
 * Find available font styles for a font family
 * Must be called from Figma plugin context
 */
export async function getAvailableFontStyles(family: string): Promise<string[]> {
  try {
    const fonts = await figma.listAvailableFontsAsync();
    const familyFonts = fonts.filter(f => f.fontName.family === family);
    return familyFonts.map(f => f.fontName.style);
  } catch {
    return ['Regular', 'Bold'];
  }
}

/**
 * Try to load a font, with fallback to Regular if the style doesn't exist
 */
export async function loadFontWithFallback(
  family: string,
  style: string
): Promise<{ family: string; style: string }> {
  try {
    await figma.loadFontAsync({ family, style });
    return { family, style };
  } catch {
    // Try common fallbacks
    const fallbacks = ['Regular', 'Normal', 'Book', 'Roman'];
    for (const fallback of fallbacks) {
      try {
        await figma.loadFontAsync({ family, style: fallback });
        return { family, style: fallback };
      } catch {
        continue;
      }
    }
    // Last resort: try system fonts
    const systemFonts = ['Roboto', 'Arial', 'Helvetica'];
    for (const sysFamily of systemFonts) {
      try {
        await figma.loadFontAsync({ family: sysFamily, style: 'Regular' });
        return { family: sysFamily, style: 'Regular' };
      } catch {
        continue;
      }
    }
    throw new Error(`Could not load font: ${family} ${style}`);
  }
}

/**
 * Create or update a Figma text style
 */
export async function createOrUpdateTextStyle(
  def: StyleDefinition
): Promise<TextStyle> {
  // Check if style already exists
  const existingStyles = figma.getLocalTextStyles();
  let style = existingStyles.find(s => s.name === def.name);

  if (!style) {
    style = figma.createTextStyle();
    style.name = def.name;
  }

  // Load font
  const loadedFont = await loadFontWithFallback(def.fontFamily, def.fontStyle);

  // Set style properties
  style.fontName = loadedFont;
  style.fontSize = def.fontSize;
  style.lineHeight = { value: def.lineHeight, unit: 'PIXELS' };
  style.letterSpacing = { value: def.letterSpacing, unit: 'PERCENT' };
  style.description = def.description;

  return style;
}

/**
 * Create all text styles from definitions
 */
export async function createAllTextStyles(
  definitions: StyleDefinition[],
  onProgress?: (message: string, percent: number) => void
): Promise<TextStyle[]> {
  const styles: TextStyle[] = [];
  const total = definitions.length;

  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i];
    onProgress?.(`Creating style: ${def.name}`, Math.round(((i + 1) / total) * 100));

    try {
      const style = await createOrUpdateTextStyle(def);
      styles.push(style);
    } catch (error) {
      console.error(`Failed to create style ${def.name}:`, error);
    }
  }

  return styles;
}

/**
 * Clean up orphaned styles that don't match current config
 * Looks for styles that start with any of our category names
 */
export function removeOrphanedStyles(validNames: Set<string>): void {
  const existingStyles = figma.getLocalTextStyles();
  const categoryPrefixes = ['Display/', 'Title/', 'Body/', 'Code/', 'Mobile/', 'Desktop/'];

  for (const style of existingStyles) {
    const matchesPrefix = categoryPrefixes.some(prefix => style.name.startsWith(prefix));
    if (matchesPrefix && !validNames.has(style.name)) {
      style.remove();
    }
  }
}
