import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import {
  PluginConfig,
  DEFAULT_CONFIG,
  UIMessage,
  ExportData,
  ScaleMethod,
  LineHeightPreset,
  StyleCategory,
  CategoryScaleConfig,
  LINE_HEIGHT_RATIOS,
  UIToolkit,
  FontInfo,
  FigmaOutputMode,
} from './types';
import { generateScale } from './core/scale';
import { SCALE_RATIOS } from './core/scale';

// Tabs
type TabId = 'categories' | 'responsive' | 'export';

const TABS: { id: TabId; label: string }[] = [
  { id: 'categories', label: 'Categories' },
  { id: 'responsive', label: 'Responsive' },
  { id: 'export', label: 'Export' },
];

function App() {
  const [config, setConfig] = useState<PluginConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<TabId>('categories');
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ message: '', percent: 0 });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<StyleCategory | null>('body');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Listen for messages from plugin
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage as UIMessage;
      if (!msg) return;

      switch (msg.type) {
        case 'fonts-list':
          setFonts(msg.fonts);
          break;
        case 'progress':
          setProgress({ message: msg.message, percent: msg.percent });
          break;
        case 'generation-complete':
          setIsGenerating(false);
          setStatus({ type: 'success', message: `Generated ${msg.stylesCount} styles` });
          if (msg.exportData) {
            setExportData(msg.exportData);
          }
          break;
        case 'generation-error':
          setIsGenerating(false);
          setStatus({ type: 'error', message: msg.error });
          break;
      }
    };

    window.addEventListener('message', handler);

    // Request fonts on mount
    parent.postMessage({ pluginMessage: { type: 'get-fonts' } }, '*');

    return () => window.removeEventListener('message', handler);
  }, []);

  // Update category config helper
  const updateCategoryConfig = (
    category: StyleCategory,
    updates: Partial<CategoryScaleConfig>
  ) => {
    setConfig(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: { ...prev.categories[category], ...updates },
      },
    }));
  };

  // Update category scale helper
  const updateCategoryScale = (
    category: StyleCategory,
    scaleUpdates: Partial<CategoryScaleConfig['scale']>
  ) => {
    setConfig(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: {
          ...prev.categories[category],
          scale: { ...prev.categories[category].scale, ...scaleUpdates },
        },
      },
    }));
  };

  // Generate button handler
  const handleGenerate = () => {
    setIsGenerating(true);
    setStatus(null);
    setProgress({ message: 'Starting...', percent: 0 });
    parent.postMessage({ pluginMessage: { type: 'generate', config } }, '*');
  };

  // Download export file
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy to clipboard (using fallback for Figma sandbox)
  const copyToClipboard = (content: string, key: string) => {
    try {
      // Create a temporary textarea element
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.setAttribute('readonly', ''); // Prevent keyboard from showing on mobile
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);

      // Use a slight delay to ensure DOM is ready
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, content.length); // For mobile

        try {
          document.execCommand('copy');
          setCopiedKey(key);
          setTimeout(() => setCopiedKey(null), 2000);
        } catch (copyErr) {
          console.error('Copy command failed:', copyErr);
        }

        document.body.removeChild(textarea);
      });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setExportData(null);
    setStatus(null);
  };

  return (
    <div id="app">
      {/* Header */}
      <div class="header">
        <h1>DS Type Tokens</h1>
        <p>Create text styles, specimens, and design tokens</p>
      </div>

      {/* Tabs */}
      <div class="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            class={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div class="content">
        {activeTab === 'categories' && (
          <CategoriesTab
            config={config}
            fonts={fonts}
            expandedCategory={expandedCategory}
            setExpandedCategory={setExpandedCategory}
            updateCategoryConfig={updateCategoryConfig}
            updateCategoryScale={updateCategoryScale}
          />
        )}
        {activeTab === 'responsive' && (
          <ResponsiveTab config={config} setConfig={setConfig} />
        )}
        {activeTab === 'export' && (
          <ExportTab
            config={config}
            setConfig={setConfig}
            exportData={exportData}
            onDownload={downloadFile}
            onCopy={copyToClipboard}
            copiedKey={copiedKey}
          />
        )}
      </div>

      {/* Footer */}
      <div class="footer">
        <button
          class="btn btn-primary"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Typography System'}
        </button>

        {isGenerating && (
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" style={{ width: `${progress.percent}%` }} />
            </div>
            <div class="progress-text">{progress.message}</div>
          </div>
        )}

        {status && (
          <div class={`status ${status.type}`}>
            {status.message}
          </div>
        )}

        <button
          class="btn-reset"
          onClick={handleReset}
          disabled={isGenerating}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

// Categories Tab - Main tab with all per-category configuration
interface CategoriesTabProps {
  config: PluginConfig;
  fonts: FontInfo[];
  expandedCategory: StyleCategory | null;
  setExpandedCategory: (cat: StyleCategory | null) => void;
  updateCategoryConfig: (category: StyleCategory, updates: Partial<CategoryScaleConfig>) => void;
  updateCategoryScale: (category: StyleCategory, scaleUpdates: Partial<CategoryScaleConfig['scale']>) => void;
}

// Map common weight names to font style names
const WEIGHT_TO_STYLE_MAP: Record<string, string[]> = {
  'Thin': ['Thin', 'Hairline', 'ExtraLight'],
  'Light': ['Light'],
  'Regular': ['Regular', 'Normal', 'Book', 'Roman'],
  'Medium': ['Medium'],
  'Semibold': ['SemiBold', 'Semibold', 'DemiBold', 'Demi Bold'],
  'Bold': ['Bold'],
  'Black': ['Black', 'Heavy', 'ExtraBold', 'Extra Bold', 'UltraBold'],
};

// Check if a weight is available for a font
function isWeightAvailable(fontInfo: FontInfo | undefined, weight: string): boolean {
  if (!fontInfo) return false;
  const possibleStyles = WEIGHT_TO_STYLE_MAP[weight] || [weight];
  return possibleStyles.some(style => fontInfo.styles.includes(style));
}

function CategoriesTab({
  config,
  fonts,
  expandedCategory,
  setExpandedCategory,
  updateCategoryConfig,
  updateCategoryScale,
}: CategoriesTabProps) {
  const categoryInfo: { key: StyleCategory; name: string; desc: string; defaultSizes: string }[] = [
    { key: 'display', name: 'Display', desc: 'Hero text, splash screens', defaultSizes: 'D1, D2, D3' },
    { key: 'title', name: 'Title / Headers', desc: 'Page and section headings', defaultSizes: 'H1-H6' },
    { key: 'body', name: 'Body', desc: 'Main content text', defaultSizes: 'Xs, Sm, Base, Lg, Xl' },
    { key: 'code', name: 'Code', desc: 'Monospace and code', defaultSizes: 'Xs, Sm, Base, Lg' },
  ];

  const allWeights = ['Thin', 'Light', 'Regular', 'Medium', 'Semibold', 'Bold', 'Black'];

  const lineHeightPresets: { value: LineHeightPreset; label: string }[] = [
    { value: 'tighter', label: `Tighter (${LINE_HEIGHT_RATIOS.tighter})` },
    { value: 'tight', label: `Tight (${LINE_HEIGHT_RATIOS.tight})` },
    { value: 'normal', label: `Normal (${LINE_HEIGHT_RATIOS.normal})` },
    { value: 'relaxed', label: `Relaxed (${LINE_HEIGHT_RATIOS.relaxed})` },
  ];

  // Get FontInfo for a font family
  const getFontInfo = (family: string): FontInfo | undefined => {
    return fonts.find(f => f.family === family);
  };

  // Handle font family change - also filter out unavailable weights
  const handleFontFamilyChange = (category: StyleCategory, newFamily: string) => {
    const fontInfo = getFontInfo(newFamily);
    const currentWeights = config.categories[category].weights;

    // Filter to only weights available in the new font
    const availableWeights = currentWeights.filter(w => isWeightAvailable(fontInfo, w));

    // If no weights remain, try to add Regular
    if (availableWeights.length === 0 && isWeightAvailable(fontInfo, 'Regular')) {
      availableWeights.push('Regular');
    }

    updateCategoryConfig(category, {
      fontFamily: newFamily,
      weights: availableWeights,
    });
  };

  return (
    <>
      {categoryInfo.map(cat => {
        const catConfig = config.categories[cat.key];
        const isExpanded = expandedCategory === cat.key;
        const previewSizes = catConfig.enabled ? generateScale(catConfig.scale) : [];
        const fontInfo = getFontInfo(catConfig.fontFamily);

        return (
          <div
            key={cat.key}
            class={`category-card ${!catConfig.enabled ? 'disabled' : ''}`}
          >
            {/* Category Header */}
            <div
              class="category-header"
              onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ flex: 1 }}>
                <span class="category-name">{cat.name}</span>
                <div class="toggle-desc">{cat.desc}</div>
              </div>
              <label class="toggle-switch" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={catConfig.enabled}
                  onChange={e => updateCategoryConfig(cat.key, { enabled: e.currentTarget.checked })}
                />
                <span class="toggle-track" />
                <span class="toggle-thumb" />
              </label>
              <span class="expand-icon" style={{ marginLeft: '8px' }}>
                {isExpanded ? '▼' : '▶'}
              </span>
            </div>

            {/* Expanded Configuration */}
            {isExpanded && catConfig.enabled && (
              <div class="category-config">
                {/* Font Configuration - First, as users think about fonts first */}
                <div class="config-section">
                  <div class="config-section-title">Font</div>
                  <div class="field">
                    <label>Family</label>
                    <select
                      value={catConfig.fontFamily}
                      onChange={e => handleFontFamilyChange(cat.key, e.currentTarget.value)}
                    >
                      {fonts.map(f => (
                        <option key={f.family} value={f.family}>{f.family}</option>
                      ))}
                    </select>
                  </div>
                  <div class="weights-container">
                    <div class="weights-label">Weights</div>
                    <div class="checkbox-group">
                      {allWeights.map(weight => {
                        const available = isWeightAvailable(fontInfo, weight);
                        const isChecked = catConfig.weights.includes(weight);

                        return (
                          <label
                            key={weight}
                            class={`checkbox-label ${isChecked ? 'checked' : ''} ${!available ? 'disabled' : ''}`}
                            title={!available ? `${weight} not available for ${catConfig.fontFamily}` : ''}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={!available}
                              onChange={e => {
                                const weights = e.currentTarget.checked
                                  ? [...catConfig.weights, weight]
                                  : catConfig.weights.filter(w => w !== weight);
                                updateCategoryConfig(cat.key, { weights });
                              }}
                            />
                            {weight}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Scale Configuration */}
                <div class="config-section">
                  <div class="config-section-title">Scale</div>
                  <div class="field-row">
                    <div class="field">
                      <label>Method</label>
                      <select
                        value={catConfig.scale.method}
                        onChange={e => updateCategoryScale(cat.key, {
                          method: e.currentTarget.value as ScaleMethod,
                        })}
                      >
                        <option value="modular">Modular</option>
                        <option value="linear">Linear</option>
                        <option value="tailwind">Tailwind</option>
                      </select>
                    </div>
                    {catConfig.scale.method === 'modular' && (
                      <div class="field">
                        <label>Ratio</label>
                        <select
                          value={catConfig.scale.ratio}
                          onChange={e => updateCategoryScale(cat.key, {
                            ratio: parseFloat(e.currentTarget.value),
                          })}
                        >
                          {SCALE_RATIOS.map(r => (
                            <option key={r.value} value={r.value}>
                              {r.name} ({r.value})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {catConfig.scale.method === 'linear' && (
                      <div class="field">
                        <label>Steps</label>
                        <input
                          type="number"
                          value={catConfig.scale.steps}
                          min={2}
                          max={12}
                          onChange={e => updateCategoryScale(cat.key, {
                            steps: parseInt(e.currentTarget.value) || 5,
                          })}
                        />
                      </div>
                    )}
                  </div>
                  <div class="field-row">
                    <div class="field">
                      <label>Min (px)</label>
                      <input
                        type="number"
                        value={catConfig.scale.min}
                        min={8}
                        max={catConfig.scale.max - 4}
                        onChange={e => updateCategoryScale(cat.key, {
                          min: parseInt(e.currentTarget.value) || 12,
                        })}
                      />
                    </div>
                    <div class="field">
                      <label>Max (px)</label>
                      <input
                        type="number"
                        value={catConfig.scale.max}
                        min={catConfig.scale.min + 4}
                        max={200}
                        onChange={e => updateCategoryScale(cat.key, {
                          max: parseInt(e.currentTarget.value) || 72,
                        })}
                      />
                    </div>
                    <div class="field">
                      <label>Rounding</label>
                      <select
                        value={catConfig.scale.rounding}
                        onChange={e => updateCategoryScale(cat.key, {
                          rounding: parseInt(e.currentTarget.value) as 1 | 2 | 4,
                        })}
                      >
                        <option value={1}>1px</option>
                        <option value={2}>2px</option>
                        <option value={4}>4px</option>
                      </select>
                    </div>
                  </div>
                  {/* Preview */}
                  <div class="preview-inline">
                    <span class="preview-label">Preview: </span>
                    {previewSizes.map(size => (
                      <span key={size} class="preview-size">{size}</span>
                    ))}
                  </div>
                </div>

                {/* Line Height */}
                <div class="config-section">
                  <div class="config-section-title">Line Height</div>
                  <div class="field">
                    <select
                      value={catConfig.lineHeight}
                      onChange={e => updateCategoryConfig(cat.key, {
                        lineHeight: e.currentTarget.value as LineHeightPreset,
                      })}
                    >
                      {lineHeightPresets.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// Responsive Tab
interface ResponsiveTabProps {
  config: PluginConfig;
  setConfig: (config: PluginConfig) => void;
}

function ResponsiveTab({ config, setConfig }: ResponsiveTabProps) {
  const updateResponsive = (enabled: boolean) => {
    setConfig({
      ...config,
      responsive: { ...config.responsive, enabled },
    });
  };

  const updateMobile = (updates: Partial<typeof config.responsive.mobile>) => {
    setConfig({
      ...config,
      responsive: {
        ...config.responsive,
        mobile: { ...config.responsive.mobile, ...updates },
      },
    });
  };

  return (
    <>
      <div class="section">
        <div class="toggle-row">
          <div>
            <div class="toggle-label">Enable Responsive Variants</div>
            <div class="toggle-desc">Generate separate Mobile and Desktop style sets</div>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              checked={config.responsive.enabled}
              onChange={e => updateResponsive(e.currentTarget.checked)}
            />
            <span class="toggle-track" />
            <span class="toggle-thumb" />
          </label>
        </div>
      </div>

      {config.responsive.enabled && (
        <div class="section">
          <div class="section-title">Mobile Scale Multiplier</div>
          <div class="field">
            <label>Scale sizes to {Math.round(config.responsive.mobile.scaleMultiplier * 100)}% on mobile</label>
            <input
              type="range"
              min={70}
              max={100}
              value={Math.round(config.responsive.mobile.scaleMultiplier * 100)}
              onChange={e => updateMobile({
                scaleMultiplier: parseInt(e.currentTarget.value) / 100,
              })}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--figma-color-text-secondary)' }}>
              <span>70%</span>
              <span>{Math.round(config.responsive.mobile.scaleMultiplier * 100)}%</span>
              <span>100%</span>
            </div>
          </div>
          <div class="toggle-row" style={{ marginTop: '16px' }}>
            <div>
              <div class="toggle-label">Enable Mobile Variants</div>
              <div class="toggle-desc">Generate scaled-down mobile sizes</div>
            </div>
            <label class="toggle-switch">
              <input
                type="checkbox"
                checked={config.responsive.mobile.enabled}
                onChange={e => updateMobile({ enabled: e.currentTarget.checked })}
              />
              <span class="toggle-track" />
              <span class="toggle-thumb" />
            </label>
          </div>
        </div>
      )}
    </>
  );
}

// Export Tab
interface ExportTabProps {
  config: PluginConfig;
  setConfig: (config: PluginConfig) => void;
  exportData: ExportData | null;
  onDownload: (content: string, filename: string, type: string) => void;
  onCopy: (content: string, key: string) => void;
  copiedKey: string | null;
}

function ExportTab({ config, setConfig, exportData, onDownload, onCopy, copiedKey }: ExportTabProps) {
  const updateExports = (key: keyof PluginConfig['exports'], value: boolean | UIToolkit | FigmaOutputMode) => {
    setConfig({
      ...config,
      exports: { ...config.exports, [key]: value },
    });
  };

  const figmaOutputOptions: { value: FigmaOutputMode; label: string; desc: string }[] = [
    { value: 'textStyles', label: 'Text Styles', desc: 'Traditional Figma text styles' },
    { value: 'variables', label: 'Variables', desc: 'Typography as variables in the Variables panel' },
    { value: 'both', label: 'Both', desc: 'Create both text styles and variables' },
  ];

  const exportOptions: { key: keyof PluginConfig['exports']; label: string; desc: string }[] = [
    { key: 'specimen', label: 'Specimen Artboard', desc: 'Visual typography reference' },
    { key: 'jsonTokens', label: 'JSON Tokens', desc: 'W3C-style design tokens' },
    { key: 'yamlTokens', label: 'YAML Tokens', desc: 'LLM-friendly format' },
    { key: 'cssVars', label: 'CSS Variables', desc: 'Custom properties stylesheet' },
    { key: 'tailwindConfig', label: 'Tailwind Config', desc: 'Extend your Tailwind theme' },
  ];

  const toolkitOptions: { value: UIToolkit; label: string }[] = [
    { value: 'custom', label: 'Custom / None' },
    { value: 'shadcn', label: 'shadcn/ui' },
    { value: 'untitledui', label: 'Untitled UI' },
    { value: 'baseui', label: 'Base UI' },
    { value: 'chakra', label: 'Chakra UI' },
    { value: 'radix', label: 'Radix Themes' },
  ];

  const fileExports: { key: keyof ExportData; label: string; filename: string; mime: string }[] = [
    { key: 'json', label: 'JSON Tokens', filename: 'typography-tokens.json', mime: 'application/json' },
    { key: 'yaml', label: 'YAML Tokens', filename: 'typography-tokens.yaml', mime: 'text/yaml' },
    { key: 'css', label: 'CSS Variables', filename: 'typography.css', mime: 'text/css' },
    { key: 'tailwind', label: 'Tailwind Config', filename: 'tailwind-typography.js', mime: 'text/javascript' },
  ];

  return (
    <>
      <div class="section">
        <div class="section-title">Figma Output</div>
        <div class="field">
          <label>Output Mode</label>
          <select
            value={config.exports.figmaOutputMode}
            onChange={e => updateExports('figmaOutputMode', e.currentTarget.value as FigmaOutputMode)}
          >
            {figmaOutputOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div class="toggle-desc" style={{ marginTop: '4px' }}>
          {figmaOutputOptions.find(o => o.value === config.exports.figmaOutputMode)?.desc}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Additional Outputs</div>
        {exportOptions.map(opt => (
          <div key={opt.key} class="toggle-row">
            <div>
              <div class="toggle-label">{opt.label}</div>
              <div class="toggle-desc">{opt.desc}</div>
            </div>
            <label class="toggle-switch">
              <input
                type="checkbox"
                checked={config.exports[opt.key] as boolean}
                onChange={e => updateExports(opt.key, e.currentTarget.checked)}
              />
              <span class="toggle-track" />
              <span class="toggle-thumb" />
            </label>
          </div>
        ))}
      </div>

      <div class="section">
        <div class="section-title">UI Toolkit Preset</div>
        <div class="field">
          <select
            value={config.exports.toolkit}
            onChange={e => updateExports('toolkit', e.currentTarget.value as UIToolkit)}
          >
            {toolkitOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div class="toggle-desc" style={{ marginTop: '8px' }}>
          Adds toolkit-specific naming and token mappings to exports
        </div>
      </div>

      {exportData && (
        <div class="section">
          <div class="section-title">Export Files</div>
          {fileExports.map(exp => {
            const content = exportData[exp.key];
            if (!content) return null;
            const isCopied = copiedKey === exp.key;

            return (
              <div key={exp.key} class="export-card">
                <div class="export-card-header">
                  <div>
                    <div class="export-card-title">{exp.label}</div>
                    <div class="export-card-desc">{exp.filename}</div>
                  </div>
                </div>
                <div class="export-actions">
                  <button
                    class={`export-btn copy ${isCopied ? 'copied' : ''}`}
                    onClick={() => onCopy(content, exp.key)}
                  >
                    {isCopied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    class="export-btn download"
                    onClick={() => onDownload(content, exp.filename, exp.mime)}
                  >
                    Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// Mount the app
render(<App />, document.getElementById('app')!);
