import {
  PluginConfig,
  StyleDefinition,
  ExportData,
  DesignToken,
  StyleCategory,
} from '../types';
import { getFontWeightNumber, getUsageDescription } from '../utils/mappings';

/**
 * Build nested token structure from style definitions
 */
function buildTokenStructure(
  styles: StyleDefinition[]
): Record<string, any> {
  const tokens: Record<string, any> = {
    typography: {},
  };

  for (const style of styles) {
    const parts = style.mappings.jsPath.split('.');
    let current = tokens;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    const lastPart = parts[parts.length - 1];
    current[lastPart] = createDesignToken(style);
  }

  return tokens;
}

/**
 * Create a design token from a style definition
 */
function createDesignToken(style: StyleDefinition): DesignToken {
  return {
    value: {
      fontFamily: style.fontFamily,
      fontWeight: getFontWeightNumber(style.fontStyle),
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
    },
    type: 'typography',
    description: getUsageDescription(style.category, style.sizeName),
    mappings: style.mappings,
  };
}

/**
 * Get category metadata for exports
 */
function getCategoryMeta(config: PluginConfig) {
  const categories: StyleCategory[] = ['display', 'title', 'body', 'code'];
  const meta: Record<string, any> = {};

  for (const cat of categories) {
    const catConfig = config.categories[cat];
    if (!catConfig.enabled) continue;

    meta[cat] = {
      fontFamily: catConfig.fontFamily,
      scale: {
        method: catConfig.scale.method,
        min: catConfig.scale.min,
        max: catConfig.scale.max,
        ratio: catConfig.scale.ratio,
        rounding: catConfig.scale.rounding,
      },
      lineHeight: catConfig.lineHeight,
      weights: catConfig.weights,
    };
  }

  return meta;
}

/**
 * Generate strict JSON tokens (W3C Design Tokens format)
 */
export function generateJsonTokens(
  styles: StyleDefinition[],
  config: PluginConfig
): string {
  const output = {
    $name: 'Typography System',
    $description: 'Generated typography tokens with per-category scales',
    ...buildTokenStructure(styles),
    $meta: {
      units: 'px',
      remBase: 16,
      categories: getCategoryMeta(config),
      responsive: config.responsive.enabled ? {
        mobile: {
          scaleMultiplier: config.responsive.mobile.scaleMultiplier,
        },
      } : null,
      generatedAt: new Date().toISOString(),
    },
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Generate LLM-friendly YAML tokens
 */
export function generateYamlTokens(
  styles: StyleDefinition[],
  config: PluginConfig
): string {
  const lines: string[] = [
    '# Typography System',
    `# Generated: ${new Date().toISOString()}`,
    '',
    '# Category Scales:',
  ];

  // Add category info
  const categories: StyleCategory[] = ['display', 'title', 'body', 'code'];
  for (const cat of categories) {
    const catConfig = config.categories[cat];
    if (!catConfig.enabled) continue;
    lines.push(`#   ${cat}: ${catConfig.scale.min}-${catConfig.scale.max}px (${catConfig.scale.method})`);
  }

  lines.push('');
  lines.push('styles:');

  for (const style of styles) {
    lines.push(`  - name: "${style.name}"`);
    lines.push(`    category: ${style.category}`);
    lines.push(`    path: ${style.mappings.jsPath}`);
    lines.push(`    fontFamily: "${style.fontFamily}"`);
    lines.push(`    fontWeight: ${getFontWeightNumber(style.fontStyle)}`);
    lines.push(`    fontSizePx: ${style.fontSize}`);
    lines.push(`    lineHeightPx: ${style.lineHeight}`);
    lines.push(`    letterSpacingPct: ${style.letterSpacing}`);
    if (style.breakpoint) {
      lines.push(`    breakpoint: ${style.breakpoint}`);
    }
    lines.push(`    usage: "${getUsageDescription(style.category, style.sizeName)}"`);
    lines.push(`    mappings:`);
    lines.push(`      tailwind: "${style.mappings.tailwind}"`);
    lines.push(`      cssVar: "${style.mappings.cssVar}"`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate CSS custom properties
 */
export function generateCssVars(
  styles: StyleDefinition[],
  config: PluginConfig
): string {
  const lines: string[] = [
    '/* Typography System - CSS Custom Properties */',
    `/* Generated: ${new Date().toISOString()} */`,
    '',
    ':root {',
    '  /* Font Families */',
  ];

  // Add font families per category
  const categories: StyleCategory[] = ['display', 'title', 'body', 'code'];
  for (const cat of categories) {
    const catConfig = config.categories[cat];
    if (!catConfig.enabled) continue;

    const fallback = cat === 'code'
      ? 'ui-monospace, SFMono-Regular, monospace'
      : 'system-ui, -apple-system, sans-serif';
    lines.push(`  --font-${cat}: "${catConfig.fontFamily}", ${fallback};`);
  }

  lines.push('');
  lines.push('  /* Typography Styles */');

  for (const style of styles) {
    const prefix = style.mappings.cssVar;
    lines.push(`  /* ${style.name} */`);
    lines.push(`  ${prefix}-font-size: ${style.fontSize}px;`);
    lines.push(`  ${prefix}-line-height: ${style.lineHeight}px;`);
    lines.push(`  ${prefix}-font-weight: ${getFontWeightNumber(style.fontStyle)};`);
    lines.push(`  ${prefix}-letter-spacing: ${style.letterSpacing}%;`);
    lines.push('');
  }

  lines.push('}');
  lines.push('');

  // Add utility classes
  lines.push('/* Utility Classes */');
  for (const style of styles) {
    const className = style.name.toLowerCase().replace(/\//g, '-');
    const prefix = style.mappings.cssVar;
    lines.push(`.${className} {`);
    lines.push(`  font-size: var(${prefix}-font-size);`);
    lines.push(`  line-height: var(${prefix}-line-height);`);
    lines.push(`  font-weight: var(${prefix}-font-weight);`);
    lines.push(`  letter-spacing: var(${prefix}-letter-spacing);`);
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate Tailwind config snippet
 */
export function generateTailwindConfig(
  styles: StyleDefinition[],
  config: PluginConfig
): string {
  const fontSizes: Record<string, [string, { lineHeight: string; fontWeight: string }]> = {};

  for (const style of styles) {
    // Create a key like "title-h1-desktop" or "body-base"
    const keyParts = [style.category, style.sizeName.toLowerCase()];
    if (style.breakpoint) {
      keyParts.push(style.breakpoint);
    }
    if (style.fontStyle !== 'Regular') {
      keyParts.push(style.fontStyle.toLowerCase());
    }
    const key = keyParts.join('-');

    fontSizes[key] = [
      `${style.fontSize}px`,
      {
        lineHeight: `${style.lineHeight}px`,
        fontWeight: String(getFontWeightNumber(style.fontStyle)),
      },
    ];
  }

  // Build font family config
  const fontFamily: Record<string, string[]> = {};
  const categories: StyleCategory[] = ['display', 'title', 'body', 'code'];
  for (const cat of categories) {
    const catConfig = config.categories[cat];
    if (!catConfig.enabled) continue;

    const fallback = cat === 'code'
      ? ['ui-monospace', 'monospace']
      : ['system-ui', '-apple-system', 'sans-serif'];
    fontFamily[cat] = [`"${catConfig.fontFamily}"`, ...fallback];
  }

  const output = {
    theme: {
      extend: {
        fontFamily,
        fontSize: fontSizes,
      },
    },
  };

  return [
    '// Tailwind CSS Configuration Snippet',
    `// Generated: ${new Date().toISOString()}`,
    '// Add this to your tailwind.config.js',
    '',
    'module.exports = ' + JSON.stringify(output, null, 2).replace(/"([^"]+)":/g, '$1:'),
  ].join('\n');
}

/**
 * Generate all enabled export formats
 */
export function generateExports(
  styles: StyleDefinition[],
  config: PluginConfig
): ExportData {
  const data: ExportData = {};

  if (config.exports.jsonTokens) {
    data.json = generateJsonTokens(styles, config);
  }

  if (config.exports.yamlTokens) {
    data.yaml = generateYamlTokens(styles, config);
  }

  if (config.exports.cssVars) {
    data.css = generateCssVars(styles, config);
  }

  if (config.exports.tailwindConfig) {
    data.tailwind = generateTailwindConfig(styles, config);
  }

  return data;
}
