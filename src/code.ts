import {
  PluginMessage,
  UIMessage,
  PluginConfig,
  FontInfo,
} from './types';
import { generateStyleDefinitions, createAllTextStyles, removeOrphanedStyles } from './core/styles';
import { createTypographyVariables, removeOrphanedVariables } from './core/variables';
import { createSpecimen } from './core/specimen';
import { generateExports } from './core/tokens';

// Show the UI
figma.showUI(__html__, {
  width: 420,
  height: 680,
  themeColors: true,
});

/**
 * Send message to UI
 */
function postMessage(message: UIMessage): void {
  figma.ui.postMessage(message);
}

/**
 * Get list of available fonts with their styles
 */
async function getAvailableFonts(): Promise<FontInfo[]> {
  const fonts = await figma.listAvailableFontsAsync();
  const familyMap = new Map<string, Set<string>>();

  for (const font of fonts) {
    const family = font.fontName.family;
    const style = font.fontName.style;

    if (!familyMap.has(family)) {
      familyMap.set(family, new Set());
    }
    familyMap.get(family)!.add(style);
  }

  // Convert to array and sort
  const result: FontInfo[] = [];
  for (const [family, styles] of familyMap) {
    result.push({
      family,
      styles: Array.from(styles).sort(),
    });
  }

  return result.sort((a, b) => a.family.localeCompare(b.family));
}

/**
 * Main generation function
 */
async function generate(config: PluginConfig): Promise<void> {
  try {
    postMessage({ type: 'progress', message: 'Generating styles...', percent: 0 });

    // Generate style definitions
    const styleDefs = generateStyleDefinitions(config);
    postMessage({ type: 'progress', message: `Generated ${styleDefs.length} style definitions`, percent: 10 });

    let textStyles: TextStyle[] = [];
    const outputMode = config.exports.figmaOutputMode;
    const validNames = new Set(styleDefs.map(s => s.name));

    // Create Figma text styles if mode includes text styles
    if (outputMode === 'textStyles' || outputMode === 'both') {
      postMessage({ type: 'progress', message: 'Creating Figma text styles...', percent: 15 });

      textStyles = await createAllTextStyles(styleDefs, (msg, pct) => {
        postMessage({ type: 'progress', message: msg, percent: 15 + pct * 0.25 });
      });

      // Clean up orphaned styles
      removeOrphanedStyles(validNames);

      postMessage({ type: 'progress', message: `Created ${textStyles.length} text styles`, percent: 40 });
    }

    // Create Figma variables if mode includes variables
    if (outputMode === 'variables' || outputMode === 'both') {
      postMessage({ type: 'progress', message: 'Creating typography variables...', percent: 45 });

      const varCount = await createTypographyVariables(styleDefs, config, (msg, pct) => {
        postMessage({ type: 'progress', message: msg, percent: 45 + pct * 0.15 });
      });

      postMessage({ type: 'progress', message: `Created ${varCount} variables`, percent: 60 });
    }

    // Create specimen frame if enabled
    if (config.exports.specimen) {
      postMessage({ type: 'progress', message: 'Creating specimen frame...', percent: 65 });

      await createSpecimen(config, styleDefs, textStyles, (msg, pct) => {
        postMessage({ type: 'progress', message: msg, percent: 65 + pct * 0.25 });
      });

      postMessage({ type: 'progress', message: 'Specimen created', percent: 90 });
    }

    // Generate export data
    postMessage({ type: 'progress', message: 'Generating export files...', percent: 92 });
    const exportData = generateExports(styleDefs, config);

    // Complete
    postMessage({
      type: 'generation-complete',
      stylesCount: styleDefs.length,
      exportData,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    postMessage({ type: 'generation-error', error: message });
  }
}

// Handle messages from UI
figma.ui.onmessage = async (msg: PluginMessage) => {
  switch (msg.type) {
    case 'generate':
      await generate(msg.config);
      break;

    case 'get-fonts':
      const fonts = await getAvailableFonts();
      postMessage({ type: 'fonts-list', fonts });
      break;

    case 'cancel':
      figma.closePlugin();
      break;
  }
};

// Initial font list load
getAvailableFonts().then(fonts => {
  postMessage({ type: 'fonts-list', fonts });
});
