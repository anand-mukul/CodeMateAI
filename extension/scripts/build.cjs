const { build } = require('vite');
const react = require('@vitejs/plugin-react').default;
const path = require('path');
const fs = require('fs');

async function buildExtension() {
  console.log('--- Starting CodeMate AI Phase 1 Extension Build ---');
  const rootDir = path.resolve(__dirname, '..');
  const outDir = path.resolve(rootDir, 'dist');

  // Load .env if present
  const envPath = path.resolve(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    });
  }

  const envApiUrl = process.env.VITE_API_BASE_URL || 'https://codemate-backend-wsi1.onrender.com';
  const envWebUrl = process.env.VITE_WEB_PORTAL_URL || 'https://codemate-frontend.onrender.com';
  const defineEnv = {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(envApiUrl),
    'import.meta.env.VITE_WEB_PORTAL_URL': JSON.stringify(envWebUrl),
  };
  console.log(`[+] API Target: ${envApiUrl}`);

  // Clean dist
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  // 1. Build UI HTML Pages (popup.html and sidepanel.html)
  console.log('[1/4] Building Popup and Sidepanel HTML bundles...');
  await build({
    root: rootDir,
    base: './',
    define: defineEnv,
    plugins: [react()],
    build: {
      outDir: outDir,
      emptyOutDir: false,
      rollupOptions: {
        input: {
          popup: path.resolve(rootDir, 'popup.html'),
          sidepanel: path.resolve(rootDir, 'sidepanel.html'),
        },
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
  });

  // 2. Build Background Service Worker (ES module)
  console.log('[2/4] Building Background Service Worker...');
  await build({
    root: rootDir,
    define: defineEnv,
    build: {
      outDir: outDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(rootDir, 'src/background/service-worker.ts'),
        name: 'BackgroundWorker',
        formats: ['es'],
        fileName: () => 'background.js',
      },
    },
  });

  // 3. Build Content Script (IIFE, self-contained)
  console.log('[3/4] Building Content Script (Isolated World)...');
  await build({
    root: rootDir,
    define: defineEnv,
    build: {
      outDir: outDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(rootDir, 'src/content/content.ts'),
        name: 'CodeMateContent',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
    },
  });

  // 4. Build Main World Content Script (IIFE, self-contained)
  console.log('[4/4] Building Content-Main Script (MAIN World)...');
  await build({
    root: rootDir,
    define: defineEnv,
    build: {
      outDir: outDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(rootDir, 'src/content/content-main.ts'),
        name: 'CodeMateContentMain',
        formats: ['iife'],
        fileName: () => 'content-main.js',
      },
    },
  });

  // Copy manifest.json & icons
  console.log('[+] Copying manifest.json and icons...');
  fs.copyFileSync(
    path.resolve(rootDir, 'public/manifest.json'),
    path.resolve(outDir, 'manifest.json')
  );

  const iconsDir = path.resolve(outDir, 'icons');
  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
  fs.cpSync(path.resolve(rootDir, 'public/icons'), iconsDir, { recursive: true });

  console.log('✓ CodeMate AI Extension successfully built in dist/');
}

buildExtension().catch((err) => {
  console.error('Build failed with error:', err);
  process.exit(1);
});
