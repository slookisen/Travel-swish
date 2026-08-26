import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const builtIndex = path.join(root, 'docs', 'index.html');

if (fs.existsSync(builtIndex)) {
  const html = fs.readFileSync(builtIndex, 'utf8');
  fs.writeFileSync(builtIndex, html.replace(/\r\n/g, '\n'), 'utf8');
}
