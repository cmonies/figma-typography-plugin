// Scale configuration (per-category)
export type ScaleMethod = 'modular' | 'linear' | 'tailwind';

export interface ScaleConfig {
  method: ScaleMethod;
  min: number;
  max: number;
  ratio: number;      // For modular scale
  steps: number;      // For linear scale
  rounding: 1 | 2 | 4;
}

// Line-height presets
export type LineHeightPreset = 'tighter' | 'tight' | 'normal' | 'relaxed';

// Line-height ratios for each preset
export const LINE_HEIGHT_RATIOS: Record<LineHeightPreset, number> = {
  tighter: 1.1,
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.65,
};

// Category-specific configuration
export interface CategoryScaleConfig {
  enabled: boolean;
  scale: ScaleConfig;
  lineHeight: LineHeightPreset;
  fontFamily: string;
  weights: string[];
}

// All category configurations
export interface CategoriesConfig {
  body: CategoryScaleConfig;
  title: CategoryScaleConfig;
  display: CategoryScaleConfig;
  code: CategoryScaleConfig;
}

// Responsive configuration
export interface BreakpointConfig {
  enabled: boolean;
  scaleMultiplier: number; // e.g., 0.85 for mobile = 85% of desktop sizes
}

// Mobile max sizes per category (based on best practices)
// These caps prevent mobile sizes from being unrealistically large
export interface MobileMaxSizes {
  display: number;  // Typically 48px max for mobile display
  title: number;    // Typically 32px max for mobile titles
  body: number;     // Typically 20px max for mobile body
  code: number;     // Typically 16px max for mobile code
}

export const DEFAULT_MOBILE_MAX_SIZES: MobileMaxSizes = {
  display: 48,  // Hero text caps at 48px on mobile
  title: 32,    // H1 caps at 32px on mobile
  body: 20,     // Body text caps at 20px on mobile
  code: 16,     // Code caps at 16px on mobile
};

export interface ResponsiveConfig {
  enabled: boolean;
  mobile: BreakpointConfig;
  mobileMaxSizes: MobileMaxSizes;
}

// UI Toolkit presets
export type UIToolkit = 'custom' | 'shadcn' | 'untitledui' | 'baseui' | 'chakra' | 'radix';

// Figma output mode
export type FigmaOutputMode = 'textStyles' | 'variables' | 'both';

// Export options
export interface ExportConfig {
  figmaOutputMode: FigmaOutputMode;
  specimen: boolean;
  jsonTokens: boolean;
  yamlTokens: boolean;
  cssVars: boolean;
  tailwindConfig: boolean;
  toolkit: UIToolkit;
}

// Sample text
export interface SampleTextConfig {
  display: string;
  heading: string;
  body: string;
  code: string;
}

// Complete plugin configuration
export interface PluginConfig {
  categories: CategoriesConfig;
  responsive: ResponsiveConfig;
  exports: ExportConfig;
  sampleText: SampleTextConfig;
  stylePrefix: string;
  useGlobalDefaults: boolean; // Toggle for simple vs advanced mode
}

// Style category type
export type StyleCategory = 'body' | 'title' | 'display' | 'code';

// Generated style definition
export interface StyleDefinition {
  name: string;           // Full Figma style name: "Type/Body/Base/Regular"
  category: StyleCategory;
  breakpoint: 'mobile' | 'desktop' | null;
  sizeName: string;       // e.g., "H1", "Base", "D1", "Sm"
  fontFamily: string;
  fontStyle: string;      // e.g., "Bold", "Regular"
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  description: string;
  mappings: StyleMappings;
}

export interface StyleMappings {
  canonical: string;
  jsPath: string;
  cssVar: string;
  tailwind: string;
}

// Token export format
export interface TokenValue {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

export interface DesignToken {
  value: TokenValue;
  type: 'typography';
  description: string;
  mappings: StyleMappings;
}

// Messages between UI and plugin code
export type PluginMessage =
  | { type: 'generate'; config: PluginConfig }
  | { type: 'get-fonts' }
  | { type: 'cancel' };

// Font info with available styles
export interface FontInfo {
  family: string;
  styles: string[];
}

export type UIMessage =
  | { type: 'fonts-list'; fonts: FontInfo[] }
  | { type: 'generation-complete'; stylesCount: number; exportData?: ExportData }
  | { type: 'generation-error'; error: string }
  | { type: 'progress'; message: string; percent: number };

export interface ExportData {
  json?: string;
  yaml?: string;
  css?: string;
  tailwind?: string;
  toolkit?: string;
}

// Default configurations per category
export const DEFAULT_BODY_CONFIG: CategoryScaleConfig = {
  enabled: true,
  scale: {
    method: 'modular',
    min: 12,
    max: 20,
    ratio: 1.125,
    steps: 5,
    rounding: 2,
  },
  lineHeight: 'normal',
  fontFamily: 'Inter',
  weights: ['Regular', 'Medium', 'Semibold'],
};

export const DEFAULT_TITLE_CONFIG: CategoryScaleConfig = {
  enabled: true,
  scale: {
    method: 'modular',
    min: 20,
    max: 48,
    ratio: 1.2,
    steps: 6,
    rounding: 2,
  },
  lineHeight: 'tight',
  fontFamily: 'Inter',
  weights: ['Semibold', 'Bold'],
};

export const DEFAULT_DISPLAY_CONFIG: CategoryScaleConfig = {
  enabled: true,
  scale: {
    method: 'modular',
    min: 40,
    max: 72,
    ratio: 1.25,
    steps: 3,
    rounding: 2,
  },
  lineHeight: 'tighter',
  fontFamily: 'Inter',
  weights: ['Bold'],
};

export const DEFAULT_CODE_CONFIG: CategoryScaleConfig = {
  enabled: true,
  scale: {
    method: 'linear',
    min: 11,
    max: 16,
    ratio: 1.125,
    steps: 4,
    rounding: 1,
  },
  lineHeight: 'normal',
  fontFamily: 'JetBrains Mono',
  weights: ['Regular'],
};

// Default configuration
export const DEFAULT_CONFIG: PluginConfig = {
  categories: {
    body: DEFAULT_BODY_CONFIG,
    title: DEFAULT_TITLE_CONFIG,
    display: DEFAULT_DISPLAY_CONFIG,
    code: DEFAULT_CODE_CONFIG,
  },
  responsive: {
    enabled: true,
    mobile: {
      enabled: true,
      scaleMultiplier: 0.875, // 87.5% of desktop sizes
    },
    mobileMaxSizes: DEFAULT_MOBILE_MAX_SIZES,
  },
  exports: {
    figmaOutputMode: 'textStyles',
    specimen: true,
    jsonTokens: true,
    yamlTokens: true,
    cssVars: false,
    tailwindConfig: false,
    toolkit: 'custom',
  },
  sampleText: {
    display: 'Make it happen',
    heading: 'The quick brown fox jumps over the lazy dog',
    body: 'Typography is the art and technique of arranging type to make written language legible, readable and appealing when displayed. The arrangement of type involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing.',
    code: 'const scale = generateTypography();',
  },
  stylePrefix: 'Type',
  useGlobalDefaults: false,
};

// Size name generators for each category
export const BODY_SIZE_NAMES = ['Xs', 'Sm', 'Base', 'Lg', 'Xl', '2xl'];
export const TITLE_SIZE_NAMES = ['H6', 'H5', 'H4', 'H3', 'H2', 'H1'];
export const DISPLAY_SIZE_NAMES = ['D3', 'D2', 'D1'];
export const CODE_SIZE_NAMES = ['Xs', 'Sm', 'Base', 'Lg'];
