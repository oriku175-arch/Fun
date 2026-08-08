# Resume editor

An A4 resume with a live design panel. Adjust the font, size, spacing and colors
on screen, then download a PDF that is a pixel replica of what you see **and**
fully readable by ATS scanners.

```
resume/
  index.html      the page — layout, typography, print rules, panel styles
  resume-data.js  the content — this is the file you edit
  render.js       renders the data into the template
  controls.js     the design panel
  fonts.css       Figtree + Inter, embedded so they work offline and travel in the PDF
```

Open `index.html` in Chrome — double-click it, no server needed.

## The panel

| Control | What it changes |
| --- | --- |
| Font | Figtree or Inter |
| Text size | 9–12pt |
| Line spacing | 1.2–1.8 |
| Name size | 18–34pt |
| Heading size | 10–18pt |
| Accent color | Name, section headings and links together, with six presets |
| Text color | Body copy |
| Sidebar width | 24–46% of the page's text width |
| Side / top margin | 8–22mm each |

Your settings are remembered between visits. **Reset to defaults** puts everything
back.

**Text size stops at 9pt** on purpose — below that a printed resume gets hard to
read, and shrinking type is the wrong way to win a page.

### The page-fit badge

Above the download button, a badge reads either *"Fits 1 page · 12mm to spare"* or
*"2 pages · 227mm free on the last"*. It measures the real rendered height against
an A4 page every time you move a control, so raising the text size shows its cost
immediately instead of after a download.

With the full wording, the defaults (Figtree, 9.5pt) come to two clean pages.
Dropping to 9pt and narrowing the margins gets close to one; the badge tells you
exactly where you stand.

## Downloading the PDF

Click **Download PDF**, choose **Save as PDF** as the destination, leave margins
on **Default** and keep **Background graphics** on. The page size and margins come
from the stylesheet, so the output matches the screen every time.

Headless, without opening a browser:

```bash
npm install
node scripts/render-resume-pdf.mjs Pratik_Patil_Resume.pdf
```

## Editing the content

Everything lives in `resume-data.js`. Change the words, reload the page.

Wrap anything in `**double asterisks**` to bold it — used for metrics and impact
phrases inside bullets:

```js
'Contributed to an **AI-assisted support platform handling 300–400 diagnostic tickets per day**, working across research…'
```

Sections render only if they have content, so deleting `tools` or `recognition`
from the data removes the heading too.

## How the app and the PDF stay in agreement

Every control writes a single CSS custom property onto `:root`. Nothing
re-renders, no layout logic is duplicated, and because those properties live on
the document element they carry straight into the print output. Changing a
setting cannot make the screen and the PDF disagree.

The one exception is the page margin: `@page` can't read custom properties, so
`controls.js` rewrites the `<style id="page-rule">` rule itself when the margin
sliders move. Without that the margins would change on screen and leave the PDF
untouched.

## Why it stays ATS-readable

Most "download as PDF" resume tools screenshot the page (html2canvas and
friends). The result looks right and contains no text at all, so a scanner reads
an empty document. This one prints through the browser instead, so every glyph is
real vector text.

The rest of it is about not tripping parsers:

- **DOM order is reading order.** Header → summary → experience → education →
  skills → tools → recognition. CSS Grid puts the last four in the right-hand
  column visually; the text comes out of the PDF in the sensible order.
- **No tables, no text boxes, no CSS `column-count`** — the classic ways a
  two-column resume comes out of a parser interleaved and scrambled.
- **Real `<ul>`/`<li>` bullets**, not glyph icons or `::before` content.
- **Static font weights, not variable fonts.** Chrome's print-to-PDF converts
  variable fonts into Type 3 fonts, which weaker parsers mishandle. The static
  instances in `fonts.css` come out as ordinary embedded TrueType subsets. Both
  Figtree and Inter were checked. If you add a font, keep it static.

Verify any change with:

```bash
pdftotext Pratik_Patil_Resume.pdf -   # every word should be there, in order
pdffonts  Pratik_Patil_Resume.pdf     # want "CID TrueType", never "Type 3"
```
