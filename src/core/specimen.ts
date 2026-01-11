import {
  PluginConfig,
  StyleDefinition,
  StyleCategory,
  ExportData,
} from '../types';
import { loadFontWithFallback } from './styles';
import { getCategoryDisplayName } from '../utils/naming';

// Colors
const COLORS = {
  white: { r: 1, g: 1, b: 1 },
  background: { r: 0.98, g: 0.98, b: 0.98 },
  text: { r: 0.1, g: 0.1, b: 0.1 },
  textMuted: { r: 0.42, g: 0.45, b: 0.49 },
  border: { r: 0.9, g: 0.9, b: 0.9 },
  accent: { r: 0.4, g: 0.4, b: 0.9 },
};

// Typography specimen page name
const PAGE_NAME = 'Typography';
const DESKTOP_FRAME_NAME = 'Desktop Specimen';
const MOBILE_FRAME_NAME = 'Mobile Specimen';
const EXPORTS_FRAME_NAME = 'Code Exports';

// Layout constants
const FRAME_PADDING = 64;
const SECTION_SPACING = 48;
const ROW_SPACING = 24;
const BODY_TEXT_WIDTH = 600; // Fixed width for body text wrapping

// Cache for loaded UI font
let uiFont: { family: string; style: string } | null = null;
let uiFontBold: { family: string; style: string } | null = null;

/**
 * Get a safe UI font - uses the user's body font with fallbacks
 */
async function getUIFont(config: PluginConfig, bold: boolean = false): Promise<{ family: string; style: string }> {
  // Try to use cached font
  if (!bold && uiFont) return uiFont;
  if (bold && uiFontBold) return uiFontBold;

  const style = bold ? 'Bold' : 'Regular';

  // Try user's fonts first (body, then title)
  const tryFonts = [
    { family: config.categories.body.fontFamily, style },
    { family: config.categories.title.fontFamily, style },
    { family: 'Roboto', style },
    { family: 'Arial', style },
    { family: 'Helvetica', style },
  ];

  for (const font of tryFonts) {
    try {
      await figma.loadFontAsync(font);
      if (bold) {
        uiFontBold = font;
      } else {
        uiFont = font;
      }
      return font;
    } catch {
      continue;
    }
  }

  // Last resort - find any available font
  const availableFonts = await figma.listAvailableFontsAsync();
  if (availableFonts.length > 0) {
    const fallback = availableFonts[0].fontName;
    await figma.loadFontAsync(fallback);
    if (bold) {
      uiFontBold = fallback;
    } else {
      uiFont = fallback;
    }
    return fallback;
  }

  throw new Error('No fonts available');
}

/**
 * Get or create the Typography page
 */
function getOrCreateTypographyPage(): PageNode {
  let page = figma.root.children.find(p => p.name === PAGE_NAME);

  if (!page) {
    page = figma.createPage();
    page.name = PAGE_NAME;
  }

  return page;
}

/**
 * Remove existing specimen frames
 */
function removeExistingSpecimens(page: PageNode): void {
  // Include legacy frame name for cleanup
  const framesToRemove = [DESKTOP_FRAME_NAME, MOBILE_FRAME_NAME, EXPORTS_FRAME_NAME, 'Typography Specimen'];
  for (const frameName of framesToRemove) {
    const existing = page.children.find(c => c.name === frameName);
    if (existing) {
      existing.remove();
    }
  }
}

/**
 * Create a specimen frame with given name
 */
function createSpecimenFrame(name: string): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.paddingTop = FRAME_PADDING;
  frame.paddingBottom = FRAME_PADDING;
  frame.paddingLeft = FRAME_PADDING;
  frame.paddingRight = FRAME_PADDING;
  frame.itemSpacing = SECTION_SPACING;
  frame.fills = [{ type: 'SOLID', color: COLORS.white }];

  return frame;
}

/**
 * Create header section for a specimen
 */
async function createHeader(
  config: PluginConfig,
  breakpointLabel: string,
  stylesCount: number
): Promise<FrameNode> {
  const header = figma.createFrame();
  header.name = 'Header';
  header.layoutMode = 'VERTICAL';
  header.primaryAxisSizingMode = 'AUTO';
  header.counterAxisSizingMode = 'AUTO';
  header.itemSpacing = 12;
  header.fills = [];

  // Get UI fonts
  const boldFont = await getUIFont(config, true);
  const regularFont = await getUIFont(config, false);

  // Title - use user's title font if possible
  let titleFont: { family: string; style: string };
  try {
    titleFont = await loadFontWithFallback(config.categories.title.fontFamily, 'Bold');
  } catch {
    titleFont = boldFont;
  }

  const title = figma.createText();
  title.fontName = titleFont;
  title.fontSize = 48;
  title.characters = `Typography - ${breakpointLabel}`;
  title.fills = [{ type: 'SOLID', color: COLORS.text }];
  header.appendChild(title);

  // Subtitle with font info
  const subtitle = figma.createText();
  subtitle.fontName = regularFont;
  subtitle.fontSize = 16;
  const fontFamilies = new Set<string>();
  if (config.categories.display.enabled) fontFamilies.add(config.categories.display.fontFamily);
  if (config.categories.title.enabled) fontFamilies.add(config.categories.title.fontFamily);
  if (config.categories.body.enabled) fontFamilies.add(config.categories.body.fontFamily);
  if (config.categories.code.enabled) fontFamilies.add(config.categories.code.fontFamily);
  subtitle.characters = `${Array.from(fontFamilies).join(' / ')} • ${stylesCount} styles`;
  subtitle.fills = [{ type: 'SOLID', color: COLORS.textMuted }];
  header.appendChild(subtitle);

  // Scale info per category
  const categories: StyleCategory[] = ['display', 'title', 'body', 'code'];
  for (const cat of categories) {
    const catConfig = config.categories[cat];
    if (!catConfig.enabled) continue;

    const scaleInfo = figma.createText();
    scaleInfo.fontName = regularFont;
    scaleInfo.fontSize = 14;
    const scaleMethod = catConfig.scale.method === 'modular'
      ? `Modular (${catConfig.scale.ratio})`
      : catConfig.scale.method === 'linear'
      ? `Linear (${catConfig.scale.steps} steps)`
      : 'Tailwind';
    scaleInfo.characters = `${getCategoryDisplayName(cat)}: ${catConfig.scale.min}–${catConfig.scale.max}px • ${scaleMethod}`;
    scaleInfo.fills = [{ type: 'SOLID', color: COLORS.textMuted }];
    header.appendChild(scaleInfo);
  }

  // Divider
  const divider = figma.createRectangle();
  divider.name = 'Divider';
  divider.resize(1000, 1);
  divider.fills = [{ type: 'SOLID', color: COLORS.border }];
  header.appendChild(divider);

  return header;
}

/**
 * Create a category section
 */
async function createCategorySection(
  category: StyleCategory,
  styles: StyleDefinition[],
  config: PluginConfig,
  textStyles: TextStyle[]
): Promise<FrameNode | null> {
  if (styles.length === 0) return null;

  const section = figma.createFrame();
  section.name = getCategoryDisplayName(category);
  section.layoutMode = 'VERTICAL';
  section.primaryAxisSizingMode = 'AUTO';
  section.counterAxisSizingMode = 'AUTO';
  section.itemSpacing = ROW_SPACING;
  section.fills = [];

  // Get UI font
  const labelFont = await getUIFont(config, false);

  // Section header
  const sectionTitle = figma.createText();
  sectionTitle.fontName = labelFont;
  sectionTitle.fontSize = 20;
  sectionTitle.characters = getCategoryDisplayName(category);
  sectionTitle.fills = [{ type: 'SOLID', color: COLORS.textMuted }];
  section.appendChild(sectionTitle);

  // Group styles by size name
  const stylesBySize = new Map<string, StyleDefinition[]>();
  for (const style of styles) {
    const key = `${style.sizeName}/${style.fontStyle}`;
    if (!stylesBySize.has(key)) {
      stylesBySize.set(key, []);
    }
    stylesBySize.get(key)!.push(style);
  }

  // Create style blocks
  for (const [, sizeStyles] of stylesBySize) {
    // Use the first style in the group (they should all have same properties)
    const style = sizeStyles[0];
    const block = await createStyleBlock(style, config, textStyles);
    if (block) {
      section.appendChild(block);
    }
  }

  return section;
}

/**
 * Create a single style block with metadata and sample
 */
async function createStyleBlock(
  style: StyleDefinition,
  config: PluginConfig,
  textStyles: TextStyle[]
): Promise<FrameNode> {
  const block = figma.createFrame();
  block.name = style.name;
  block.layoutMode = 'VERTICAL';
  block.primaryAxisSizingMode = 'AUTO';
  block.counterAxisSizingMode = 'AUTO';
  block.minWidth = 400;
  block.itemSpacing = 12;
  block.fills = [];

  // Get UI font for labels
  const labelFont = await getUIFont(config, false);

  // Metadata row
  const metaRow = figma.createFrame();
  metaRow.name = 'Metadata';
  metaRow.layoutMode = 'HORIZONTAL';
  metaRow.primaryAxisSizingMode = 'AUTO';
  metaRow.counterAxisSizingMode = 'AUTO';
  metaRow.itemSpacing = 16;
  metaRow.fills = [];

  // Style name
  const nameText = figma.createText();
  nameText.fontName = labelFont;
  nameText.fontSize = 12;
  nameText.characters = style.sizeName + (style.fontStyle !== 'Regular' ? ` / ${style.fontStyle}` : '');
  nameText.fills = [{ type: 'SOLID', color: COLORS.text }];
  metaRow.appendChild(nameText);

  // Size info
  const sizeText = figma.createText();
  sizeText.fontName = labelFont;
  sizeText.fontSize = 12;
  sizeText.characters = `${style.fontSize}/${style.lineHeight}`;
  sizeText.fills = [{ type: 'SOLID', color: COLORS.textMuted }];
  metaRow.appendChild(sizeText);

  block.appendChild(metaRow);

  // Sample text
  const sampleText = figma.createText();

  // Try to load the font and apply text style
  try {
    const loadedFont = await loadFontWithFallback(style.fontFamily, style.fontStyle);
    sampleText.fontName = loadedFont;
    sampleText.fontSize = style.fontSize;
    sampleText.lineHeight = { value: style.lineHeight, unit: 'PIXELS' };
    sampleText.letterSpacing = { value: style.letterSpacing, unit: 'PERCENT' };
  } catch {
    // Fallback to UI font
    sampleText.fontName = labelFont;
    sampleText.fontSize = style.fontSize;
  }

  // Choose sample text based on category
  let sample: string;
  switch (style.category) {
    case 'display':
      sample = config.sampleText.display;
      break;
    case 'title':
      sample = config.sampleText.heading;
      break;
    case 'code':
      sample = config.sampleText.code;
      break;
    default:
      sample = config.sampleText.body;
  }

  sampleText.characters = sample;
  sampleText.fills = [{ type: 'SOLID', color: COLORS.text }];

  // For body text, set a fixed width to enable wrapping
  if (style.category === 'body') {
    sampleText.resize(BODY_TEXT_WIDTH, sampleText.height);
    sampleText.textAutoResize = 'HEIGHT';
  }

  // Apply text style if available
  const textStyle = textStyles.find(ts => ts.name === style.name);
  if (textStyle) {
    sampleText.textStyleId = textStyle.id;
  }

  block.appendChild(sampleText);

  // CSS var reference
  const cssRef = figma.createText();
  cssRef.fontName = labelFont;
  cssRef.fontSize = 11;
  cssRef.characters = style.mappings.cssVar;
  cssRef.fills = [{ type: 'SOLID', color: COLORS.textMuted }];
  cssRef.opacity = 0.7;
  block.appendChild(cssRef);

  return block;
}

/**
 * Create a single specimen frame for a breakpoint
 */
async function createSingleSpecimen(
  config: PluginConfig,
  styles: StyleDefinition[],
  textStyles: TextStyle[],
  breakpoint: 'desktop' | 'mobile' | null,
  page: PageNode,
  xOffset: number,
  onProgress?: (message: string, percent: number) => void,
  progressOffset: number = 0
): Promise<FrameNode> {
  const frameName = breakpoint === 'mobile' ? MOBILE_FRAME_NAME : DESKTOP_FRAME_NAME;
  const breakpointLabel = breakpoint === 'mobile' ? 'Mobile' : 'Desktop';

  onProgress?.(`Creating ${breakpointLabel} specimen...`, progressOffset);

  // Create main frame
  const frame = createSpecimenFrame(frameName);
  page.appendChild(frame);

  // Position the frame
  frame.x = xOffset;
  frame.y = 0;

  // Filter styles for this breakpoint
  const filteredStyles = styles.filter(s => s.breakpoint === breakpoint);

  // Create header
  onProgress?.(`Creating ${breakpointLabel} header...`, progressOffset + 5);
  try {
    const header = await createHeader(config, breakpointLabel, filteredStyles.length);
    frame.appendChild(header);
  } catch (err) {
    console.error('Failed to create header:', err);
  }

  // Group styles by category
  const stylesByCategory = new Map<StyleCategory, StyleDefinition[]>();
  for (const style of filteredStyles) {
    if (!stylesByCategory.has(style.category)) {
      stylesByCategory.set(style.category, []);
    }
    stylesByCategory.get(style.category)!.push(style);
  }

  // Create sections for each category (ordered by visual hierarchy)
  const categoryOrder: StyleCategory[] = ['display', 'title', 'body', 'code'];
  const progressPerCategory = 35 / categoryOrder.length;

  for (let i = 0; i < categoryOrder.length; i++) {
    const category = categoryOrder[i];
    const categoryStyles = stylesByCategory.get(category) || [];
    if (categoryStyles.length === 0) continue;

    onProgress?.(`Creating ${breakpointLabel} ${category} section...`, progressOffset + 10 + (i * progressPerCategory));

    try {
      const section = await createCategorySection(category, categoryStyles, config, textStyles);
      if (section) {
        frame.appendChild(section);
      }
    } catch (err) {
      console.error(`Failed to create ${category} section:`, err);
    }
  }

  return frame;
}

/**
 * Create a code block with title and content
 */
async function createCodeBlock(
  title: string,
  content: string,
  config: PluginConfig
): Promise<FrameNode> {
  const block = figma.createFrame();
  block.name = title;
  block.layoutMode = 'VERTICAL';
  block.primaryAxisSizingMode = 'AUTO';
  block.counterAxisSizingMode = 'AUTO';
  block.itemSpacing = 12;
  block.fills = [];

  const labelFont = await getUIFont(config, false);
  const boldFont = await getUIFont(config, true);

  // Title
  const titleText = figma.createText();
  titleText.fontName = boldFont;
  titleText.fontSize = 16;
  titleText.characters = title;
  titleText.fills = [{ type: 'SOLID', color: COLORS.text }];
  block.appendChild(titleText);

  // Code container with background
  const codeContainer = figma.createFrame();
  codeContainer.name = 'Code';
  codeContainer.layoutMode = 'VERTICAL';
  codeContainer.primaryAxisSizingMode = 'AUTO';
  codeContainer.counterAxisSizingMode = 'AUTO';
  codeContainer.paddingTop = 16;
  codeContainer.paddingBottom = 16;
  codeContainer.paddingLeft = 16;
  codeContainer.paddingRight = 16;
  codeContainer.cornerRadius = 8;
  codeContainer.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.14 } }];

  // Try to use a monospace font for code
  let codeFont: { family: string; style: string };
  try {
    codeFont = await loadFontWithFallback(config.categories.code.fontFamily, 'Regular');
  } catch {
    codeFont = labelFont;
  }

  // Code text
  const codeText = figma.createText();
  codeText.fontName = codeFont;
  codeText.fontSize = 12;
  codeText.lineHeight = { value: 18, unit: 'PIXELS' };

  // Truncate very long content to avoid performance issues
  const maxLength = 8000;
  const displayContent = content.length > maxLength
    ? content.substring(0, maxLength) + '\n\n... (truncated for display)'
    : content;

  codeText.characters = displayContent;
  codeText.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
  codeText.resize(800, codeText.height);
  codeText.textAutoResize = 'HEIGHT';

  codeContainer.appendChild(codeText);
  block.appendChild(codeContainer);

  return block;
}

/**
 * Create the exports artboard with code blocks
 */
async function createExportsArtboard(
  config: PluginConfig,
  exportData: ExportData,
  page: PageNode,
  xOffset: number,
  onProgress?: (message: string, percent: number) => void
): Promise<FrameNode> {
  onProgress?.('Creating exports artboard...', 0);

  const frame = createSpecimenFrame(EXPORTS_FRAME_NAME);
  page.appendChild(frame);
  frame.x = xOffset;
  frame.y = 0;

  // Get UI fonts
  const boldFont = await getUIFont(config, true);
  const regularFont = await getUIFont(config, false);

  // Header
  const header = figma.createFrame();
  header.name = 'Header';
  header.layoutMode = 'VERTICAL';
  header.primaryAxisSizingMode = 'AUTO';
  header.counterAxisSizingMode = 'AUTO';
  header.itemSpacing = 12;
  header.fills = [];

  const title = figma.createText();
  title.fontName = boldFont;
  title.fontSize = 48;
  title.characters = 'Code Exports';
  title.fills = [{ type: 'SOLID', color: COLORS.text }];
  header.appendChild(title);

  const subtitle = figma.createText();
  subtitle.fontName = regularFont;
  subtitle.fontSize = 16;
  subtitle.characters = 'Copy and paste these outputs into your project';
  subtitle.fills = [{ type: 'SOLID', color: COLORS.textMuted }];
  header.appendChild(subtitle);

  // Divider
  const divider = figma.createRectangle();
  divider.name = 'Divider';
  divider.resize(1000, 1);
  divider.fills = [{ type: 'SOLID', color: COLORS.border }];
  header.appendChild(divider);

  frame.appendChild(header);

  // Add code blocks for each enabled export
  let progress = 20;
  const exports: { key: keyof ExportData; title: string; filename: string }[] = [
    { key: 'json', title: 'JSON Tokens', filename: 'typography-tokens.json' },
    { key: 'yaml', title: 'YAML Tokens', filename: 'typography-tokens.yaml' },
    { key: 'css', title: 'CSS Variables', filename: 'typography.css' },
    { key: 'tailwind', title: 'Tailwind Config', filename: 'tailwind.config.js' },
  ];

  for (const exp of exports) {
    const content = exportData[exp.key];
    if (content) {
      onProgress?.(`Adding ${exp.title}...`, progress);

      try {
        const codeBlock = await createCodeBlock(
          `${exp.title} (${exp.filename})`,
          content,
          config
        );
        frame.appendChild(codeBlock);
      } catch (err) {
        console.error(`Failed to create ${exp.title} block:`, err);
      }

      progress += 20;
    }
  }

  onProgress?.('Exports artboard complete', 100);
  return frame;
}

/**
 * Create the complete specimen frame(s)
 */
export async function createSpecimen(
  config: PluginConfig,
  styles: StyleDefinition[],
  textStyles: TextStyle[],
  exportData?: ExportData,
  onProgress?: (message: string, percent: number) => void
): Promise<FrameNode> {
  // Reset cached fonts
  uiFont = null;
  uiFontBold = null;

  onProgress?.('Creating specimen frames...', 0);

  // Get or create page
  const page = getOrCreateTypographyPage();

  // Remove existing specimens
  removeExistingSpecimens(page);

  // Switch to the typography page
  figma.currentPage = page;

  const frames: FrameNode[] = [];

  // Check if responsive is enabled
  if (config.responsive.enabled && config.responsive.mobile.enabled) {
    // Create Desktop specimen first
    const desktopFrame = await createSingleSpecimen(
      config,
      styles,
      textStyles,
      'desktop',
      page,
      0,
      onProgress,
      0
    );
    frames.push(desktopFrame);

    // Create Mobile specimen to the right of Desktop
    const mobileFrame = await createSingleSpecimen(
      config,
      styles,
      textStyles,
      'mobile',
      page,
      desktopFrame.width + 100, // 100px gap between frames
      onProgress,
      50
    );
    frames.push(mobileFrame);
  } else {
    // Non-responsive: create single Desktop specimen
    const desktopFrame = await createSingleSpecimen(
      config,
      styles,
      textStyles,
      null,
      page,
      0,
      onProgress,
      0
    );
    frames.push(desktopFrame);
  }

  // Calculate x offset for exports artboard
  const lastFrame = frames[frames.length - 1];
  const exportsXOffset = lastFrame.x + lastFrame.width + 100;

  // Create exports artboard if there's export data
  const hasExports = exportData && (exportData.json || exportData.yaml || exportData.css || exportData.tailwind);
  if (hasExports) {
    onProgress?.('Creating exports artboard...', 85);
    const exportsFrame = await createExportsArtboard(
      config,
      exportData,
      page,
      exportsXOffset,
      (msg, pct) => onProgress?.(msg, 85 + pct * 0.1)
    );
    frames.push(exportsFrame);
  }

  // Zoom to fit all frames
  figma.viewport.scrollAndZoomIntoView(frames);

  onProgress?.('Specimen complete', 100);

  // Return the first frame (Desktop)
  return frames[0];
}
