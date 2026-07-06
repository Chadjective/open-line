#!/usr/bin/env node
// Build every instance found in instances/ into dist/<id>/.
// This is the exact layout GitHub Pages deploys: calldoug.ca -> /instances/calldoug -> dist/calldoug.
import { readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const instancesDir = resolve(root, 'instances');

const instances = readdirSync(instancesDir).filter((name) => {
  const full = resolve(instancesDir, name);
  return statSync(full).isDirectory() && existsSync(resolve(full, 'config.json'));
});

if (instances.length === 0) {
  console.error('No instances found in instances/.');
  process.exit(1);
}

console.log(`Building ${instances.length} instance(s): ${instances.join(', ')}\n`);

for (const id of instances) {
  console.log(`\n=== Building ${id} ===`);
  execSync('vite build', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, INSTANCE: id },
  });
}

console.log(`\nDone. Output in dist/{${instances.join(',')}}/`);
