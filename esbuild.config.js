const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');

// Set to true for minimal testing build
const USE_MINIMAL = false;

// Build the main plugin code (runs in Figma sandbox)
const codeBuild = {
  entryPoints: [USE_MINIMAL ? 'src/code-minimal.ts' : 'src/code.ts'],
  bundle: true,
  outfile: 'dist/code.js',
  target: 'es6',
  format: 'iife',
  sourcemap: false,
  minify: false,
};

// Build the UI (runs in iframe)
const uiBuild = {
  entryPoints: [USE_MINIMAL ? 'src/ui-minimal.tsx' : 'src/ui.tsx'],
  bundle: true,
  outfile: 'dist/ui.js',
  target: 'es6',
  format: 'iife',
  sourcemap: false,
  minify: false,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
};

// Generate HTML file that includes the bundled JS and CSS
function generateHtml() {
  const cssPath = path.join(__dirname, 'src', 'ui.css');
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : '';
  const js = fs.readFileSync(path.join(__dirname, 'dist', 'ui.js'), 'utf-8');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${css}
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    ${js}
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(__dirname, 'dist', 'ui.html'), html);
}

async function build() {
  try {
    if (isWatch) {
      const codeCtx = await esbuild.context(codeBuild);
      const uiCtx = await esbuild.context(uiBuild);

      await codeCtx.watch();
      await uiCtx.watch();

      // Initial build for HTML
      await esbuild.build(uiBuild);
      generateHtml();

      console.log('Watching for changes...');

      // Watch for CSS changes
      fs.watch(path.join(__dirname, 'src'), { recursive: true }, (event, filename) => {
        if (filename && filename.endsWith('.css')) {
          generateHtml();
          console.log('Rebuilt HTML with updated CSS');
        }
      });
    } else {
      await esbuild.build(codeBuild);
      await esbuild.build(uiBuild);
      generateHtml();
      console.log('Build complete');
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

build();
