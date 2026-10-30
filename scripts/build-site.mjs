import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
const publicFiles = [
  'index.html',
  'app.js',
  'ui-runtime.js',
  'books-stats.js',
  'recognizer.js',
  'history-predictor.js',
  'backup-zip.js',
  'ui-foundation.css',
  'mobile-compat.css',
  'manifest.webmanifest',
  'sw.js'
];

rmSync(output, { recursive: true, force: true });
mkdirSync(output);
for (const file of publicFiles) cpSync(join(root, file), join(output, file));
console.log(`Built ${publicFiles.length} public files in dist/`);
