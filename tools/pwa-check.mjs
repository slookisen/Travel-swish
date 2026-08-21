import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'docs', 'manifest.webmanifest');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const required = ['name', 'short_name', 'start_url', 'scope', 'display', 'theme_color', 'background_color', 'icons'];
for (const key of required) if (!manifest[key]) throw new Error(`manifest missing ${key}`);
if (manifest.display !== 'standalone') throw new Error('manifest must use standalone display');
for (const size of ['192x192', '512x512']) {
  const icon = manifest.icons.find((entry) => entry.sizes === size);
  if (!icon || !fs.existsSync(path.join(root, 'docs', icon.src))) throw new Error(`missing ${size} PWA icon`);
}
for (const file of ['sw.js', 'og.png', 'icons/apple-touch-icon.png']) {
  if (!fs.existsSync(path.join(root, 'docs', file))) throw new Error(`missing docs/${file}`);
}
const html = fs.readFileSync(path.join(root, 'docs', 'index.html'), 'utf8');
for (const marker of ['manifest.webmanifest', 'og:image', 'apple-mobile-web-app-capable']) {
  if (!html.includes(marker)) throw new Error(`built HTML missing ${marker}`);
}
console.log('pwa-check: ok');
