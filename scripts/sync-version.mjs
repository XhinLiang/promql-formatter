// Sync the version from package.json into src/manifest.json so package.json
// stays the single source of truth. Run automatically by the npm "version"
// lifecycle hook, e.g. `npm version patch`.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const manifestPath = join(root, 'src', 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

if (manifest.version === pkg.version) {
  console.log(`manifest already at ${pkg.version}`);
} else {
  manifest.version = pkg.version;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`synced src/manifest.json version -> ${pkg.version}`);
}
