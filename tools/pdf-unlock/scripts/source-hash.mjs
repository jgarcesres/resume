// Fingerprints everything that determines the WASM build, so CI can tell when
// the committed artifact in app/src/wasm/pdf-unlock is stale. We don't compare
// .wasm bytes: they embed host paths that differ between macOS and CI.
//
//   node source-hash.mjs          print the hash
//   node source-hash.mjs --write  write app/src/wasm/pdf-unlock/.source-hash
//   node source-hash.mjs --check  exit 1 if the committed stamp is stale
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const crate = join(dirname(fileURLToPath(import.meta.url)), '..');
const stampPath = join(crate, '../../app/src/wasm/pdf-unlock/.source-hash');

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const inputs = [
  ...walk(join(crate, 'src')),
  ...['Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', 'scripts/build.sh'].map((f) => join(crate, f)),
]
  .map((path) => relative(crate, path).split('\\').join('/'))
  .sort();

const hash = createHash('sha256');
for (const file of inputs) {
  hash.update(`${file}\0`);
  hash.update(readFileSync(join(crate, file)));
  hash.update('\0');
}
const digest = hash.digest('hex');

const mode = process.argv[2];
if (mode === '--write') {
  writeFileSync(stampPath, `${digest}\n`);
  console.log(`wrote ${digest}`);
} else if (mode === '--check') {
  const committed = readFileSync(stampPath, 'utf8').trim();
  if (committed !== digest) {
    console.error(
      `app/src/wasm/pdf-unlock is stale (stamp ${committed}, sources ${digest}).\n` +
        'Run `npm run build:wasm` in app/ and commit the result.',
    );
    process.exit(1);
  }
  console.log('pdf-unlock WASM is up to date');
} else {
  console.log(digest);
}
