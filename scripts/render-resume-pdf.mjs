/* Prints resume/index.html to a PDF exactly the way the browser's Save-as-PDF
   does — vector text, A4, page size taken from the stylesheet's @page rule.
   Used to verify the template and to produce a ready-to-send file.

   Usage:
     node scripts/render-resume-pdf.mjs [output.pdf]
     node scripts/render-resume-pdf.mjs --data path/to/some-data.js [output.pdf]

   --data lets a tailored per-application data file (e.g. one saved under
   resume/applications/) render to PDF without touching the shared
   resume/resume-data.js baseline. The tailored file just needs to assign
   window.RESUME the same shape resume-data.js does.
*/

import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { mkdtemp, cp, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);

let dataFile = null;
const dataFlagIndex = args.indexOf('--data');
if (dataFlagIndex !== -1) {
  dataFile = path.resolve(args[dataFlagIndex + 1]);
  args.splice(dataFlagIndex, 2);
}

const output = path.resolve(args[0] ?? path.join(root, 'Pratik_Patil_Resume.pdf'));

// No --data: render the app straight from resume/ as before.
let renderDir = path.join(root, 'resume');
let cleanup = async () => {};

if (dataFile) {
  // Stage a throwaway copy of the app with the tailored data file swapped in
  // for resume-data.js, so the shared baseline is never touched.
  const staged = await mkdtemp(path.join(tmpdir(), 'resume-render-'));
  await cp(path.join(root, 'resume'), staged, { recursive: true });
  await copyFile(dataFile, path.join(staged, 'resume-data.js'));

  // controls.js's "Applying to" switcher re-renders on load using whatever
  // resume the library says is active (localStorage, or "master" by
  // default) — which would silently override the tailored data file we just
  // staged. Emptying the staged manifest keeps the library at zero entries,
  // so the switcher skips itself and the render.js's initial render (using
  // the data file above) is what actually reaches the PDF.
  await writeFile(
    path.join(staged, 'applications', 'manifest.js'),
    '/* Disabled for a single-file --data render: see render-resume-pdf.mjs. */\nwindow.RESUME_LIBRARY = [];\n'
  );

  renderDir = staged;
  cleanup = () => rm(staged, { recursive: true, force: true });
}

const source = pathToFileURL(path.join(renderDir, 'index.html')).href;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();

await page.goto(source, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

await page.pdf({
  path: output,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true
});

await browser.close();
await cleanup();
console.log(`Wrote ${output}`);
