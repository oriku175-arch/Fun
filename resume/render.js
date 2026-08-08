/* =============================================================================
   Renders window.RESUME (from resume-data.js) into the template markup.

   Deliberately a classic script, not an ES module, so index.html can be opened
   straight off disk with a double-click (file:// blocks module imports).
   ========================================================================== */

(function () {
  'use strict';

  var data = window.RESUME;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* Escapes HTML, then turns **runs** into <strong>. Escaping first means resume
     content can never inject markup, however it is copied and pasted in. */
  function richText(source) {
    var escaped = String(source)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  function setRich(node, source) {
    node.innerHTML = richText(source);
    return node;
  }

  var columns = {
    main: document.getElementById('resume-main'),
    aside: document.getElementById('resume-aside')
  };

  /* A section: indigo heading plus its body. `column` picks which of the two
     grid tracks it is appended to. The DOM order that results — header,
     summary, experience, education, skills, tools, recognition — is also the
     order text is extracted from the printed PDF, which is exactly the order an
     ATS wants to read. */
  function section(title, column) {
    var wrap = el('section', 'section');
    wrap.appendChild(el('h2', 'section__title', title));
    columns[column].appendChild(wrap);
    return wrap;
  }

  // ---- Header ---------------------------------------------------------------

  var header = document.getElementById('resume-header');
  var identity = el('div', 'identity');
  identity.appendChild(el('h1', 'identity__name', data.name));
  identity.appendChild(el('p', 'identity__title', data.title));
  if (data.tagline) identity.appendChild(el('p', 'identity__tagline', data.tagline));

  var linkList = el('ul', 'links');
  (data.links || []).forEach(function (link) {
    var li = el('li');
    var a = el('a', 'links__link', link.label);
    a.href = link.href;
    li.appendChild(a);
    linkList.appendChild(li);
  });

  header.appendChild(identity);
  header.appendChild(linkList);

  var contactRow = el('p', 'contact');
  (data.contact || []).forEach(function (item, index) {
    if (index > 0) contactRow.appendChild(el('span', 'contact__divider', '|'));
    var group = el('span', 'contact__item');
    if (item.label) group.appendChild(el('span', 'contact__label', item.label + ' : '));
    if (item.href) {
      var a = el('a', 'contact__value contact__value--link', item.value);
      a.href = item.href;
      group.appendChild(a);
    } else {
      group.appendChild(el('span', 'contact__value', item.value));
    }
    contactRow.appendChild(group);
  });
  header.appendChild(contactRow);

  if (data.summary) {
    header.appendChild(setRich(el('p', 'summary'), data.summary));
  }

  // ---- Body -----------------------------------------------------------------

  // Experience (left column)
  if ((data.experience || []).length) {
    var experience = section('Experience', 'main');
    data.experience.forEach(function (job) {
      var entry = el('article', 'entry');

      var heading = el('h3', 'entry__heading');
      heading.appendChild(el('span', 'entry__company', job.company));
      if (job.role) {
        heading.appendChild(el('span', 'entry__sep', '|'));
        heading.appendChild(el('span', 'entry__role', job.role));
      }
      if (job.client) {
        heading.appendChild(el('span', 'entry__sep', '|'));
        heading.appendChild(el('span', 'entry__client', job.client));
      }
      entry.appendChild(heading);

      if (job.dates) entry.appendChild(el('p', 'entry__dates', job.dates));

      var list = el('ul', 'bullets');
      (job.bullets || []).forEach(function (bullet) {
        list.appendChild(setRich(el('li'), bullet));
      });
      entry.appendChild(list);

      experience.appendChild(entry);
    });
  }

  // Education (right column)
  if ((data.education || []).length) {
    var education = section('Education', 'aside');
    data.education.forEach(function (item) {
      var entry = el('div', 'entry');
      entry.appendChild(el('h3', 'entry__heading', item.school));
      if (item.dates) entry.appendChild(el('p', 'entry__dates', item.dates));
      if (item.degree) entry.appendChild(el('p', 'entry__body', item.degree));
      education.appendChild(entry);
    });
  }

  // Skills (right column)
  if ((data.skills || []).length) {
    var skills = section('Skills', 'aside');
    data.skills.forEach(function (group) {
      var entry = el('div', 'entry');
      entry.appendChild(el('h3', 'entry__heading', group.group));
      entry.appendChild(el('p', 'entry__body', group.items));
      skills.appendChild(entry);
    });
  }

  // Tools (right column)
  if (data.tools) {
    var tools = section('Tools', 'aside');
    tools.appendChild(el('p', 'entry__body', data.tools));
  }

  // Recognition (right column)
  if ((data.recognition || []).length) {
    var recognition = section('Recognition', 'aside');
    data.recognition.forEach(function (item) {
      recognition.appendChild(el('p', 'recognition__item', item));
    });
  }

  // ---- Download -------------------------------------------------------------

  /* The browser's own print-to-PDF is what keeps the download an exact replica:
     it writes real vector text, so the file both looks identical and stays
     readable by ATS scanners. The page title becomes the suggested filename. */
  if (data.fileName) document.title = data.fileName;

  var button = document.getElementById('download');
  if (button) {
    button.addEventListener('click', function () {
      window.print();
    });
  }
})();
