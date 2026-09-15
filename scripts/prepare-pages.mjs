import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'dist/client');
const destination = path.join(root, 'dist/pages');
const prefix = '/references-board/';

// Pages mounts this directory at /references-board/. Vinext emits assets
// inside the prefix directory, so move those assets to the artifact root.
mkdirSync(destination, { recursive: true });
for (const name of ['index.html', 'index.rsc', 'favicon.svg']) {
  cpSync(path.join(source, name), path.join(destination, name));
}
cpSync(path.join(source, 'references-board/_next'), path.join(destination, '_next'), {
  recursive: true,
});
writeFileSync(path.join(destination, '.nojekyll'), '');

const html = readFileSync(path.join(destination, 'index.html'), 'utf8');
for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (!url.startsWith('/')) continue;
  if (!url.startsWith(prefix)) throw new Error(`Unexpected absolute URL: ${url}`);
  if (!existsSync(path.join(destination, url.slice(prefix.length)))) {
    throw new Error(`Missing published asset: ${url}`);
  }
}
console.log('Pages files prepared; all HTML asset paths verified.');
