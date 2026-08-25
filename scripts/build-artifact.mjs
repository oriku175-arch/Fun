/* Bundles the resume editor into one self-contained HTML file.

   The multi-file version in resume/ is the source of truth; this only inlines
   it, so there is no second copy of the design to drift out of sync. The output
   is written as a body fragment (no <!doctype>/<html>/<head>/<body>) because the
   Artifact host supplies that skeleton itself.

   Usage:  node scripts/build-artifact.mjs [output.html]
*/

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = (name) => readFileSync(path.join(root, 'resume', name), 'utf8');
const output = path.resolve(process.argv[2] ?? path.join(root, 'resume', 'artifact.html'));

const html = src('index.html');

/* Pull the page's own <style> and markup straight out of index.html rather than
   maintaining a parallel copy. */
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
const bodyMatch = html.match(/<body>([\s\S]*?)<script/);

if (styles.length < 2 || !bodyMatch) {
  throw new Error('index.html no longer matches the shape this bundler expects');
}

const [pageRule, sheet] = styles;
const markup = bodyMatch[1].trim();

const bundle = `<style>${src('fonts.css')}</style>
<style id="page-rule">${pageRule}</style>
<style>${sheet}</style>

${markup}

<script>${src('resume-data.js')}</script>
<script>${src('render.js')}</script>
<script>${src('applications/manifest.js')}</script>
<script>${src('controls.js')}</script>
`;

writeFileSync(output, bundle);
console.log(`Wrote ${output} (${(bundle.length / 1024).toFixed(0)} KB)`);
