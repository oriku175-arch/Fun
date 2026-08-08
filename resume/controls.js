/* =============================================================================
   The control panel.

   Every control does exactly one thing: write a CSS custom property onto the
   document element. The stylesheet already reads those properties, so nothing
   here re-renders the resume or duplicates any layout logic — and because the
   properties live on :root, they carry straight into the print output. That is
   what keeps the screen and the downloaded PDF identical whatever you change.

   Classic script, like render.js, so index.html still opens from file://.
   ========================================================================== */

(function () {
  'use strict';

  var STORE_KEY = 'resume-settings-v1';

  /* Single source of truth. The stylesheet repeats these as fallbacks, the panel
     builds itself from them, and Reset restores them. */
  var DEFAULTS = {
    font: 'Figtree',
    body: 9.5,
    leading: 1.45,
    nameSize: 25,
    headingSize: 13.5,
    accent: '#6C63FF',
    ink: '#2a2a2a',
    sideW: 33,
    padX: 14,
    padY: 12
  };

  var ACCENT_PRESETS = [
    '#6C63FF', // the original indigo
    '#2563EB', // blue
    '#0F766E', // teal
    '#B91C1C', // red
    '#C2410C', // orange
    '#111827'  // near-black, for a monochrome resume
  ];

  /* Each control maps a setting onto a CSS variable. `css` turns the stored
     value into the property value; where it is omitted the value is used as-is. */
  var CONTROLS = [
    {
      key: 'font', label: 'Font', type: 'select', variable: '--font',
      options: [
        { value: 'Figtree', label: 'Figtree' },
        { value: 'Inter', label: 'Inter' }
      ],
      css: function (v) { return "'" + v + "', 'Segoe UI', system-ui, sans-serif"; }
    },
    {
      /* The floor is 9pt on purpose: below that a printed resume gets hard to
         read, and shrinking type is the wrong way to win a page. The fit badge
         below shows what each step costs, so a second page is a choice rather
         than a surprise. */
      key: 'body', label: 'Text size', type: 'range', variable: '--body',
      min: 9, max: 12, step: 0.1, unit: 'pt',
      css: function (v) { return v + 'pt'; }
    },
    {
      key: 'leading', label: 'Line spacing', type: 'range', variable: '--leading',
      min: 1.2, max: 1.8, step: 0.05, unit: ''
    },
    {
      key: 'nameSize', label: 'Name size', type: 'range', variable: '--name-size',
      min: 18, max: 34, step: 0.5, unit: 'pt',
      css: function (v) { return v + 'pt'; }
    },
    {
      key: 'headingSize', label: 'Heading size', type: 'range', variable: '--heading-size',
      min: 10, max: 18, step: 0.5, unit: 'pt',
      css: function (v) { return v + 'pt'; }
    },
    {
      /* One accent drives the name, the section headings and the links together,
         so those three can never drift out of agreement. */
      key: 'accent', label: 'Accent color', type: 'color', variable: '--accent',
      presets: ACCENT_PRESETS
    },
    {
      key: 'ink', label: 'Text color', type: 'color', variable: '--ink'
    },
    {
      key: 'sideW', label: 'Sidebar width', type: 'range', variable: '--side-w',
      min: 24, max: 46, step: 0.5, unit: '%',
      css: function (v) { return v + '%'; }
    },
    {
      key: 'padX', label: 'Side margin', type: 'range', variable: '--pad-x',
      min: 8, max: 22, step: 0.5, unit: 'mm',
      css: function (v) { return v + 'mm'; }
    },
    {
      key: 'padY', label: 'Top margin', type: 'range', variable: '--pad-y',
      min: 8, max: 22, step: 0.5, unit: 'mm',
      css: function (v) { return v + 'mm'; }
    }
  ];

  // ---- State ----------------------------------------------------------------

  function load() {
    var settings = {};
    Object.keys(DEFAULTS).forEach(function (key) { settings[key] = DEFAULTS[key]; });
    try {
      var saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      Object.keys(saved).forEach(function (key) {
        if (key in DEFAULTS) settings[key] = saved[key];
      });
    } catch (err) {
      /* Corrupt or unavailable storage just means we start from defaults. */
    }
    return settings;
  }

  function save(settings) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(settings));
    } catch (err) {
      /* Private browsing and file:// quotas — not worth breaking the app over. */
    }
  }

  var settings = load();

  function apply(control) {
    var value = settings[control.key];
    document.documentElement.style.setProperty(
      control.variable,
      control.css ? control.css(value) : String(value)
    );
  }

  /* The one setting that cannot be a custom property: @page has no access to
     them, so the margin sliders rewrite the rule itself. Without this the
     sliders would move the margins on screen and leave the PDF unchanged. */
  function applyPageMargins() {
    var rule = document.getElementById('page-rule');
    if (!rule) return;
    rule.textContent =
      '@page { size: A4; margin: ' + settings.padY + 'mm ' + settings.padX + 'mm; }';
  }

  function applyAll() {
    CONTROLS.forEach(apply);
    applyPageMargins();
  }

  // ---- Page fit -------------------------------------------------------------

  var PAGE_H_MM = 297;
  var PX_PER_MM = 96 / 25.4;

  var fitBadge;

  /* Compares the rendered content height against the usable height of one A4
     page, so raising the text size shows its cost immediately rather than after
     a download. The grid uses align-items:start, so each column reports its own
     height instead of being stretched to the row. */
  function measureFit() {
    if (!fitBadge) return;

    var header = document.getElementById('resume-header');
    var main = document.getElementById('resume-main');
    var aside = document.getElementById('resume-aside');
    if (!header || !main || !aside) return;

    var top = header.getBoundingClientRect().top;
    var bottom = Math.max(
      main.getBoundingClientRect().bottom,
      aside.getBoundingClientRect().bottom
    );

    var contentH = bottom - top;
    var usableH = (PAGE_H_MM - 2 * settings.padY) * PX_PER_MM;
    var pages = Math.max(1, Math.ceil(contentH / usableH - 0.001));
    var slackMm = (usableH * pages - contentH) / PX_PER_MM;

    fitBadge.classList.toggle('fit--over', pages > 1);
    fitBadge.textContent =
      pages === 1
        ? 'Fits 1 page · ' + Math.round(slackMm) + 'mm to spare'
        : pages + ' pages · ' + Math.round(slackMm) + 'mm free on the last';
  }

  /* Fonts land after first paint and change every measurement, so re-measure
     once they are ready, and again whenever the page reflows. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measureFit);
  }
  if (window.ResizeObserver) {
    var observer = new ResizeObserver(measureFit);
    ['resume-main', 'resume-aside'].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) observer.observe(node);
    });
  }

  // ---- Panel ----------------------------------------------------------------

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function formatValue(control) {
    var value = settings[control.key];
    return value + (control.unit || '');
  }

  var panel = document.getElementById('controls');
  if (!panel) return;

  var body = el('div', 'panel__body');
  var valueLabels = {};
  var inputs = {};

  panel.appendChild(el('h2', 'panel__title', 'Design'));

  CONTROLS.forEach(function (control) {
    var field = el('div', 'field');

    var label = el('label', 'field__label');
    label.appendChild(el('span', null, control.label));
    if (control.type === 'range') {
      var readout = el('span', 'field__value', formatValue(control));
      valueLabels[control.key] = readout;
      label.appendChild(readout);
    }
    field.appendChild(label);

    var input;

    if (control.type === 'select') {
      input = el('select', 'field__input');
      control.options.forEach(function (option) {
        var opt = el('option', null, option.label);
        opt.value = option.value;
        input.appendChild(opt);
      });
      input.value = settings[control.key];
    } else if (control.type === 'color') {
      input = el('input', 'field__color');
      input.type = 'color';
      input.value = settings[control.key];
    } else {
      input = el('input', 'field__range');
      input.type = 'range';
      input.min = control.min;
      input.max = control.max;
      input.step = control.step;
      input.value = settings[control.key];
    }

    input.id = 'control-' + control.key;
    label.htmlFor = input.id;
    inputs[control.key] = input;

    input.addEventListener('input', function () {
      settings[control.key] =
        control.type === 'range' ? parseFloat(input.value) : input.value;
      apply(control);
      if (control.key === 'padX' || control.key === 'padY') applyPageMargins();
      if (valueLabels[control.key]) {
        valueLabels[control.key].textContent = formatValue(control);
      }
      save(settings);
      measureFit();
    });

    field.appendChild(input);

    if (control.presets) {
      var swatches = el('div', 'swatches');
      control.presets.forEach(function (color) {
        var swatch = el('button', 'swatch');
        swatch.type = 'button';
        swatch.style.background = color;
        swatch.title = color;
        swatch.addEventListener('click', function () {
          settings[control.key] = color;
          input.value = color;
          apply(control);
          save(settings);
        });
        swatches.appendChild(swatch);
      });
      field.appendChild(swatches);
    }

    body.appendChild(field);
  });

  panel.appendChild(body);

  var footer = el('div', 'panel__footer');

  fitBadge = el('p', 'fit', 'Measuring…');
  footer.appendChild(fitBadge);

  var download = el('button', 'btn btn--primary', 'Download PDF');
  download.type = 'button';
  download.addEventListener('click', function () { window.print(); });
  footer.appendChild(download);

  footer.appendChild(
    el('p', 'panel__hint', 'Pick "Save as PDF" as the destination and leave margins on Default.')
  );

  var reset = el('button', 'btn btn--ghost', 'Reset to defaults');
  reset.type = 'button';
  reset.addEventListener('click', function () {
    Object.keys(DEFAULTS).forEach(function (key) { settings[key] = DEFAULTS[key]; });
    CONTROLS.forEach(function (control) {
      inputs[control.key].value = settings[control.key];
      if (valueLabels[control.key]) {
        valueLabels[control.key].textContent = formatValue(control);
      }
    });
    applyAll();
    save(settings);
    measureFit();
  });
  footer.appendChild(reset);

  panel.appendChild(footer);

  // Narrow screens: the panel slides away behind a toggle.
  var toggle = document.getElementById('panel-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      document.body.classList.toggle('panel-open');
    });
  }

  applyAll();
  measureFit();
})();
