const { build } = require('vite');
const react = require('@vitejs/plugin-react').default;
const path = require('path');
const fs = require('fs');

async function buildExtension() {
  const isProd = process.argv.includes('--prod');
  console.log(`--- Starting CodeMate AI ${isProd ? 'PRODUCTION (Chrome Web Store)' : 'DEVELOPMENT'} Extension Build ---`);
  const rootDir = path.resolve(__dirname, '..');
  const outDir = path.resolve(rootDir, 'dist');

  // Load .env or .env.production
  const envFile = isProd ? '.env.production' : '.env';
  const envPath = path.resolve(rootDir, envFile);
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

  // Domain & Environment configuration from .env
  const defaultApiUrl = isProd ? 'https://api.codemateai.com' : 'http://localhost:8000';
  const defaultWebUrl = isProd ? 'https://codemateai.com' : 'http://localhost:3000';
  const envApiUrl = process.env.VITE_API_BASE_URL || defaultApiUrl;
  const envWebUrl = process.env.VITE_WEB_PORTAL_URL || defaultWebUrl;
  const envAllowedOrigins = process.env.VITE_ALLOWED_ORIGINS || '';
  const envPlatformMatches = process.env.VITE_PLATFORM_MATCHES || 'https://*.codechef.com/*,https://codechef.com/*';

  const defineEnv = {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(envApiUrl),
    'import.meta.env.VITE_WEB_PORTAL_URL': JSON.stringify(envWebUrl),
    'import.meta.env.VITE_ALLOWED_ORIGINS': JSON.stringify(envAllowedOrigins),
    'import.meta.env.VITE_PLATFORM_MATCHES': JSON.stringify(envPlatformMatches),
  };
  console.log(`[+] API Target: ${envApiUrl}`);
  console.log(`[+] Portal Target: ${envWebUrl}`);
  console.log(`[+] Allowed Origins (.env): ${envAllowedOrigins || '(derived from API and Portal URLs)'}`);

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

  // 5. Dynamically synthesize environment-driven manifest.json
  const manifestSource = isProd ? 'manifests/manifest.prod.json' : 'manifests/manifest.dev.json';
  console.log(`[+] Synthesizing environment-driven manifest from ${manifestSource}...`);
  const manifestRaw = fs.readFileSync(path.resolve(rootDir, manifestSource), 'utf-8');
  const manifest = JSON.parse(manifestRaw);

  // Parse platform patterns from .env
  const platformPatterns = envPlatformMatches
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Collect host permissions dynamically from environment
  const hostPermissions = new Set(platformPatterns);

  try {
    hostPermissions.add(`${new URL(envApiUrl).origin}/*`);
  } catch {}

  try {
    hostPermissions.add(`${new URL(envWebUrl).origin}/*`);
  } catch {}

  if (envAllowedOrigins) {
    envAllowedOrigins
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((entry) => {
        try {
          const origin = new URL(entry).origin;
          hostPermissions.add(`${origin}/*`);
        } catch {
          if (entry.includes('*')) hostPermissions.add(entry);
        }
      });
  }

  manifest.host_permissions = Array.from(hostPermissions);

  // Update content_scripts matches dynamically from environment
  if (Array.isArray(manifest.content_scripts)) {
    if (manifest.content_scripts[0]) {
      manifest.content_scripts[0].matches = platformPatterns;
    }
    if (manifest.content_scripts[1]) {
      const contentMatches = new Set(platformPatterns);
      try {
        contentMatches.add(`${new URL(envWebUrl).origin}/*`);
      } catch {}
      manifest.content_scripts[1].matches = Array.from(contentMatches);
    }
  }

  fs.writeFileSync(
    path.resolve(outDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  const iconsDir = path.resolve(outDir, 'icons');
  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
  fs.cpSync(path.resolve(rootDir, 'public/icons'), iconsDir, { recursive: true });

  console.log('✓ CodeMate AI Extension successfully built in dist/');

  // Package production ZIP archive ready for Chrome Web Store upload
  if (isProd) {
    console.log('[+] Creating clean production ZIP archive for Chrome Web Store...');
    const pkgJson = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'package.json'), 'utf-8'));
    const version = pkgJson.version || '1.0.0';
    const zipName = `codemate-ai-v${version}.zip`;
    const zipPath = path.resolve(rootDir, zipName);

    if (fs.existsSync(zipPath)) {
      fs.rmSync(zipPath, { force: true });
    }

    try {
      const { execSync } = require('child_process');
      execSync(`tar.exe -a -c -f "${zipPath}" -C "${outDir}" .`, { stdio: 'inherit' });
      console.log(`✓ Production ZIP archive ready: ${zipName}`);

      // Also sync to frontend/public/downloads if present
      const downloadsDir = path.resolve(rootDir, '../frontend/public/downloads');
      if (fs.existsSync(downloadsDir)) {
        fs.copyFileSync(zipPath, path.resolve(downloadsDir, 'codemate-extension.zip'));
        console.log(`[+] Synced extension download to frontend/public/downloads/codemate-extension.zip`);
      }
    } catch (zipErr) {
      console.warn('[!] Note: Automatic ZIP creation fallback:', zipErr.message);
    }
  }
}

buildExtension().catch((err) => {
  console.error('Build failed with error:', err);
  process.exit(1);
});
