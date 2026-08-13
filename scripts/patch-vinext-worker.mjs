import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

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

const ssrEntry = path.join(root, 'ssr', 'index.js');
const bundledSsrEntry = path.join(root, 'ssr', 'index.bundled.js');
await build({
  entryPoints: [ssrEntry],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  external: ['node:*', 'pg', '@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', '@aws-sdk/lib-storage'],
  outfile: bundledSsrEntry,
});
fs.renameSync(bundledSsrEntry, ssrEntry);
const bundledSsr = fs.readFileSync(ssrEntry, 'utf8');
// Esbuild renames Vinext's generated require shim as the bundle graph changes.
// Match that generated identifier instead of coupling this patch to one build.
const workerSsr = bundledSsr.replace(/\bO\d+\(`react-dom`\)/g, 'require_react_dom()');
if (workerSsr === bundledSsr) throw new Error('Bundled SSR React DOM require was not found.');
fs.writeFileSync(ssrEntry, workerSsr);
const entry = path.join(root, 'index.js');
const builtModule = await import(path.toNamespacedPath(entry) + '?build=' + Date.now());
const builtHomeResponse = await builtModule.default(new Request('http://localhost/'));
if (!builtHomeResponse.ok) throw new Error('Failed to prerender production homepage.');
const builtHome = await builtHomeResponse.text();
const handler = path.join(root, 'vinext-handler.js');
fs.renameSync(entry, handler);
fs.writeFileSync(
  entry,
  [
    "import handleRequest from './vinext-handler.js';",
    "const HOME_HTML = " + JSON.stringify(builtHome) + ";",
    '',
    'export default {',
    '  fetch(request, env, context) {',
    '    const url = new URL(request.url);',
    '    if (request.method === `GET` && url.pathname === `/`) return new Response(HOME_HTML, { headers: [[`content-type`, `text/html; charset=utf-8`]] });',
    '    return handleRequest(request, env, context);',
    '  },',
    '};',
    '',
  ].join('\n'),
);

console.log("Patched " + patched + " Vinext worker files and installed the Worker fetch entrypoint.");
