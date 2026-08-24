import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Very lightweight smoke: build must succeed.
try {
  execSync('npm run build', { stdio: 'inherit' });
  const docs = join(process.cwd(), 'docs');
  const required = ['index.html', '404.html', 'manifest.webmanifest', 'app-icon.svg', 'sw.js'];
  for (const file of required) {
    if (!existsSync(join(docs, file))) throw new Error(`missing docs/${file}`);
  }

  const html = readFileSync(join(docs, 'index.html'), 'utf8');
  const assets = [...html.matchAll(/\/Travel-swish\/(assets\/[^"'?]+)/g)].map(match => match[1]);
  if (!assets.length) throw new Error('built index has no hashed asset reference');
  for (const asset of assets) {
    if (!existsSync(join(docs, ...asset.split('/')))) throw new Error(`missing docs/${asset}`);
  }

  JSON.parse(readFileSync(join(docs, 'manifest.webmanifest'), 'utf8'));
  console.log(`\nSMOKE OK: build + ${assets.length} hashed asset(s) + PWA shell verified`);
} catch (e) {
  console.error(`\nSMOKE FAIL: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
