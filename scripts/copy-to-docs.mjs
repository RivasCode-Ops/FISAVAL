import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'app', 'dist');
const docs = join(root, 'docs');

for (const name of readdirSync(docs)) {
  if (name === '.nojekyll' || name.endsWith('.md')) continue;
  rmSync(join(docs, name), { recursive: true, force: true });
}

mkdirSync(docs, { recursive: true });
for (const name of readdirSync(dist)) {
  cpSync(join(dist, name), join(docs, name), { recursive: true });
}
writeFileSync(join(docs, '404.html'), readFileSync(join(dist, 'index.html'), 'utf8'));
writeFileSync(join(docs, '.nojekyll'), '');
console.log('OK: app/dist -> docs/ (GitHub Pages)');
