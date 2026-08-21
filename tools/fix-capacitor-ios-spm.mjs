import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageFile = path.join(projectRoot, 'ios', 'App', 'CapApp-SPM', 'Package.swift');
const original = await readFile(packageFile, 'utf8');
const fixed = original.replace(/(\.package\(name: [^\n]*?path: ")([^"]+)("\))/g, (_match, start, relativePath, end) => (
  `${start}${relativePath.replaceAll('\\', '/')}${end}`
));

if (fixed !== original) {
  await writeFile(packageFile, fixed, 'utf8');
  console.log('Normalized local Swift package paths for macOS/Xcode.');
} else {
  console.log('Swift package paths are already portable.');
}
