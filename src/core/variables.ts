import {
  PluginConfig,
  StyleDefinition,
  StyleCategory,
} from '../types';
import { getFontWeightNumber } from '../utils/mappings';

// Variable collection name
const COLLECTION_NAME = 'Typography';

/**
 * Get or create the Typography variable collection
 */
async function getOrCreateCollection(): Promise<VariableCollection> {
  // Check for existing collection
  const collections = figma.variables.getLocalVariableCollections();
  let collection = collections.find(c => c.name === COLLECTION_NAME);

  if (!collection) {
    collection = figma.variables.createVariableCollection(COLLECTION_NAME);
    // Rename the default mode to "Default"
    const defaultMode = collection.modes[0];
    collection.renameMode(defaultMode.modeId, 'Default');
  }

  return collection;
}

/**
 * Get or create a variable in a collection
 */
function getOrCreateVariable(
  collection: VariableCollection,
  name: string,
  type: VariableResolvedDataType
): Variable {
  // Look for existing variable
  const existingVars = figma.variables.getLocalVariables(type);
  const existing = existingVars.find(
    v => v.name === name && v.variableCollectionId === collection.id
  );

  if (existing) {
    return existing;
  }

  // Create new variable
  return figma.variables.createVariable(name, collection, type);
}

/**
 * Build variable name from style definition
 * Format: category/sizeName/property (e.g., "body/base/fontSize")
 */
function buildVariableName(
  style: StyleDefinition,
  property: string
): string {
  const parts: string[] = [];

  // Add breakpoint if responsive
  if (style.breakpoint) {
    parts.push(style.breakpoint);
  }

  // Add category
  parts.push(style.category);

  // Add size name (lowercase)
  parts.push(style.sizeName.toLowerCase());

  // Add weight if not Regular
  if (style.fontStyle !== 'Regular') {
    parts.push(style.fontStyle.toLowerCase());
  }

  // Add property
  parts.push(property);

  return parts.join('/');
}

/**
 * Create all typography variables from style definitions
 */
export async function createTypographyVariables(
  definitions: StyleDefinition[],
  config: PluginConfig,
  onProgress?: (message: string, percent: number) => void
): Promise<number> {
  onProgress?.('Creating variable collection...', 0);

  const collection = await getOrCreateCollection();
  const modeId = collection.modes[0].modeId;

  let variableCount = 0;
  const total = definitions.length;

  // Track font families to create as string variables
  const fontFamilies = new Set<string>();

  for (let i = 0; i < definitions.length; i++) {
    const style = definitions[i];
    const progress = Math.round(((i + 1) / total) * 100);
    onProgress?.(`Creating variables: ${style.name}`, progress);

    // Font Size variable
    const fontSizeVar = getOrCreateVariable(
      collection,
      buildVariableName(style, 'fontSize'),
      'FLOAT'
    );
    fontSizeVar.setValueForMode(modeId, style.fontSize);
    variableCount++;

    // Line Height variable
    const lineHeightVar = getOrCreateVariable(
      collection,
      buildVariableName(style, 'lineHeight'),
      'FLOAT'
    );
    lineHeightVar.setValueForMode(modeId, style.lineHeight);
    variableCount++;

    // Letter Spacing variable (as percentage)
    const letterSpacingVar = getOrCreateVariable(
      collection,
      buildVariableName(style, 'letterSpacing'),
      'FLOAT'
    );
    letterSpacingVar.setValueForMode(modeId, style.letterSpacing);
    variableCount++;

    // Font Weight variable (as number)
    const fontWeightVar = getOrCreateVariable(
      collection,
      buildVariableName(style, 'fontWeight'),
      'FLOAT'
    );
    fontWeightVar.setValueForMode(modeId, getFontWeightNumber(style.fontStyle));
    variableCount++;

    // Track font family
    fontFamilies.add(style.fontFamily);
  }

  // Create font family variables per category
  const categories: StyleCategory[] = ['display', 'title', 'body', 'code'];
  for (const category of categories) {
    const catConfig = config.categories[category];
    if (!catConfig.enabled) continue;

    const fontFamilyVar = getOrCreateVariable(
      collection,
      `${category}/fontFamily`,
      'STRING'
    );
    fontFamilyVar.setValueForMode(modeId, catConfig.fontFamily);
    variableCount++;
  }

  onProgress?.('Variables created', 100);

  return variableCount;
}

/**
 * Remove orphaned typography variables
 */
export function removeOrphanedVariables(validNames: Set<string>): void {
  const collections = figma.variables.getLocalVariableCollections();
  const collection = collections.find(c => c.name === COLLECTION_NAME);

  if (!collection) return;

  // Get all variables in the collection
  const allVariables = figma.variables.getLocalVariables();
  const typographyVars = allVariables.filter(
    v => v.variableCollectionId === collection.id
  );

  for (const variable of typographyVars) {
    // Check if this variable name matches any valid style
    const matchesValidStyle = Array.from(validNames).some(name => {
      // Variable names are like "body/base/fontSize", style names are like "Body/Base"
      // We need to check if the variable could belong to a valid style
      const varParts = variable.name.split('/');
      const property = varParts.pop(); // Remove property suffix
      const varPath = varParts.join('/').toLowerCase();

      return name.toLowerCase().includes(varPath);
    });

    if (!matchesValidStyle) {
      variable.remove();
    }
  }
}
