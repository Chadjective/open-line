import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// The single env var that parameterizes the entire build.
// Adding a new politician = a new folder in instances/ + this var. No src/ edits.
const INSTANCE = process.env.INSTANCE || 'calldoug';

const instanceDir = resolve(__dirname, 'instances', INSTANCE);
const config = JSON.parse(readFileSync(resolve(instanceDir, 'config.json'), 'utf8'));
const articlesRaw = readFileSync(resolve(instanceDir, 'articles.json'), 'utf8');
const manifestTemplate = readFileSync(resolve(__dirname, 'src', 'manifest.template.json'), 'utf8');

// Platform-level data (roster of sibling instances, platform name). Lives outside src/
// so the shared code carries zero politician-specific strings — proves the config thesis.
const platform = JSON.parse(readFileSync(resolve(__dirname, 'platform.json'), 'utf8'));

// The config the app actually consumes = instance config + the platform roster grafted on.
const runtimeConfig = { ...config, platform };

function fill(str) {
  return str
    .replaceAll('{{platform_name}}', config.platform_name)
    .replaceAll('{{short_name}}', config.platform_name)
    .replaceAll('{{tagline}}', config.tagline)
    .replaceAll('{{accent_color}}', config.accent_color);
}

// A tiny accent-colored app icon so the manifest has something to install with.
// (PNG icons are a Phase 3 polish item; SVG keeps the build dependency-free.)
function iconSvg() {
  const a = config.accent_color;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<rect width="512" height="512" rx="112" fill="#0D0D1F"/>
<circle cx="256" cy="256" r="150" fill="none" stroke="${a}" stroke-width="28"/>
<path d="M196 196c-8 0-14 6-14 14 0 70 56 126 126 126 8 0 14-6 14-14v-30c0-8-6-14-14-14-10 0-20-2-29-5-5-2-11-1-15 3l-13 13c-26-14-47-35-61-61l13-13c4-4 5-10 3-15-3-9-5-19-5-29 0-8-6-14-14-14h-31z" fill="${a}"/>
</svg>`;
}

function openLinePlugin() {
  const sw = () => readFileSync(resolve(__dirname, 'src', 'service-worker.js'), 'utf8');
  return {
    name: 'open-line-instance',
    config() {
      // expose instance id to client code if ever needed at build time
      return { define: { __INSTANCE_ID__: JSON.stringify(INSTANCE) } };
    },
    transformIndexHtml(html) {
      // Privacy-respecting analytics (Plausible) — injected only when enabled + a domain is set.
      // Per-instance `analytics_domain` overrides the platform default; off by default so nothing
      // phones home in dev or before you've registered a site.
      const a = platform.analytics || {};
      const domain = config.analytics_domain || a.domain || '';
      const snippet =
        a.enabled && domain
          ? `<script defer data-domain="${domain}" src="${a.src || 'https://plausible.io/js/script.js'}"></script>\n    <script>window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}</script>`
          : '';
      return fill(html).replace('{{analytics}}', snippet);
    },
    // Dev server: serve the per-instance JSON the same way the build emits it.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];
        if (url === '/config.json') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(runtimeConfig, null, 2));
        }
        if (url === '/articles.json') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(articlesRaw);
        }
        if (url === '/manifest.json') {
          res.setHeader('Content-Type', 'application/manifest+json');
          return res.end(fill(manifestTemplate));
        }
        if (url === '/icon.svg') {
          res.setHeader('Content-Type', 'image/svg+xml');
          return res.end(iconSvg());
        }
        if (url === '/service-worker.js') {
          res.setHeader('Content-Type', 'text/javascript');
          return res.end(sw());
        }
        next();
      });
    },
    // Build: emit the per-instance assets into dist/<instance>/.
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'config.json', source: JSON.stringify(runtimeConfig, null, 2) });
      this.emitFile({ type: 'asset', fileName: 'articles.json', source: articlesRaw });
      this.emitFile({ type: 'asset', fileName: 'manifest.json', source: fill(manifestTemplate) });
      this.emitFile({ type: 'asset', fileName: 'icon.svg', source: iconSvg() });
      this.emitFile({ type: 'asset', fileName: 'service-worker.js', source: sw() });
    },
  };
}

export default defineConfig({
  root: 'src',
  base: './', // relative asset URLs so each instance works under its own subpath/domain
  plugins: [openLinePlugin()],
  build: {
    outDir: resolve(__dirname, 'dist', INSTANCE),
    emptyOutDir: true,
  },
});
