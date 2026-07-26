import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist/server');
let patched = 0;

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(file);
    } else if (entry.isFile() && file.endsWith('.js')) {
      const source = fs.readFileSync(file, 'utf8');
      const updated = source.replaceAll('import.meta.url', '(import.meta.url || \"file:///app/index.js\")');
      if (updated !== source) {
        fs.writeFileSync(file, updated);
        patched += 1;
      }
    }
  }
}

visit(root);
if (patched === 0) throw new Error('No Vinext worker files required compatibility patching.');
console.log("Patched " + patched + " Vinext worker files.");
