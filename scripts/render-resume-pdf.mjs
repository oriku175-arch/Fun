/* Prints resume/index.html to a PDF exactly the way the browser's Save-as-PDF
   does — vector text, A4, page size taken from the stylesheet's @page rule.
   Used to verify the template and to produce a ready-to-send file.

   Usage:  node scripts/render-resume-pdf.mjs [output.pdf]
*/

import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = pathToFileURL(path.join(root, 'resume', 'index.html')).href;
const output = path.resolve(process.argv[2] ?? path.join(root, 'Pratik_Patil_Resume.pdf'));

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
console.log(`Wrote ${output}`);
