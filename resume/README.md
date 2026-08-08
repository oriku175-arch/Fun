# Resume template

An A4 resume template that prints to a PDF which is both a pixel replica of what
you see on screen **and** fully readable by ATS scanners.

```
resume/
  index.html      the template — layout, typography, print rules
  resume-data.js  the content — this is the file you edit
  render.js       renders the data into the template
  fonts.css       Figtree, embedded so it works offline and travels in the PDF
```

## Downloading the PDF

Open `index.html` in Chrome (double-click it — no server needed), then click
**Download PDF** and choose **Save as PDF** as the destination.

Leave margins on **Default** and keep **Background graphics** on. The stylesheet
sets the A4 page size and the 12 × 14 mm margins itself, so the output is
identical every time.

To generate the same PDF without opening a browser:

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

## Keeping it on one page

`--body` and `--leading` at the top of the stylesheet in `index.html` are the two
dials that decide whether the content fits one page. They are currently `8.5pt`
and `1.45`, which fits this resume with a little room to spare. Add a job and the
content flows onto a second page cleanly — the print rules give page 2 the same
margins and never split a job entry down the middle.

## Why it stays ATS-readable

Most "download as PDF" resume tools screenshot the page (html2canvas and
friends). The result looks right and contains no text at all, so a scanner reads
an empty document. This one prints through the browser instead, so every glyph
is real vector text.

The rest of it is about not tripping parsers:

- **DOM order is reading order.** Header → summary → experience → education →
  skills → tools → recognition. CSS Grid puts the last four in the right-hand
  column visually; the text comes out of the PDF in the sensible order.
- **No tables, no text boxes, no CSS `column-count`** — the classic ways a
  two-column resume comes out of a parser interleaved and scrambled.
- **Real `<ul>`/`<li>` bullets**, not glyph icons or `::before` content.
- **Static font weights, not a variable font.** Chrome's print-to-PDF converts
  variable fonts into Type 3 fonts, which weaker parsers mishandle. The static
  instances in `fonts.css` come out as ordinary embedded TrueType subsets.

Verify any change with:

```bash
pdftotext Pratik_Patil_Resume.pdf -   # every word should be there, in order
pdffonts  Pratik_Patil_Resume.pdf     # want "CID TrueType", never "Type 3"
```
