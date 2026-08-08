/* =============================================================================
   RESUME CONTENT — this is the only file you need to edit for a new resume.
   The design lives in index.html; this file is just the words.

   Formatting inside any bullet or paragraph:
     **bold text**   ->  rendered bold + darker (used for metrics and impact)

   Keep `fileName` in sync with the person's name — it becomes the suggested
   filename in the browser's Save-as-PDF dialog.
   ========================================================================== */

window.RESUME = {
  fileName: 'Pratik_Patil_Product_Designer_Resume',

  name: 'Pratik Patil',
  title: 'Product Designer | UX Designer',
  tagline: '4+ Years · B2B SaaS · Enterprise · Healthcare · Complex Workflows',

  // Shown top-right of the header, one per line.
  links: [
    { label: 'prateekdesigns.framer.website', href: 'https://prateekdesigns.framer.website' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/uiuxpratik' },
    { label: 'Behance', href: 'https://www.behance.net/uiuxpratik' }
  ],

  // Shown as a single divided row under the header.
  contact: [
    { label: 'Phone', value: '992-135-4164', href: 'tel:+919921354164' },
    { label: 'Email', value: 'uiuxpratik@gmail.com', href: 'mailto:uiuxpratik@gmail.com' },
    { label: 'Location', value: 'Bangalore, India' }
  ],

  summary:
    'Product Designer with 4+ years of experience designing complex B2B, SaaS, and ' +
    'enterprise products across healthcare and IT domains. Experienced in user research, ' +
    'problem discovery, workflow design, interaction design, prototyping, usability ' +
    'testing, and design systems. Worked closely with product managers and engineers to ' +
    'translate complex user and business requirements into clearer, scalable product ' +
    'experiences, with experience contributing to measurable improvements in issue ' +
    'resolution and product conversion.',

  experience: [
    {
      company: 'Global Software Resource',
      role: 'UX Designer',
      client: 'Client: Siemens Healthineers',
      dates: 'May 2024 — Present',
      bullets: [
        'Designed user experiences for an **enterprise troubleshooting platform used by medical technicians at Siemens Healthineers**, translating complex diagnostic workflows and stakeholder requirements into clearer product experiences.',
        'Contributed to an **AI-assisted support platform handling 300–400 diagnostic tickets per day**, working across research, interaction design, and product delivery for the Siemens Healthineers project.',
        'Conducted **user interviews and usability testing** to identify workflow issues and improve clarity, contributing to an estimated **~30% faster issue resolution**.',
        'Collaborated with **product managers, requirement engineers, and developers** to translate requirements into UX solutions and support iterative product delivery.',
        'Worked within agile teams to refine workflows, communicate design decisions, and support feature delivery from design through development.'
      ]
    },
    {
      company: 'BETSOL',
      role: 'UX Designer',
      dates: 'June 2022 — April 2024',
      bullets: [
        'Designed UX for an **enterprise backup and monitoring product used by IT administrators**, working across complex product workflows and administrative experiences.',
        'Contributed to improvements in key product flows that supported **~40%+ higher trial-to-paid conversion**.',
        'Redesigned onboarding and core workflows to **reduce setup complexity and improve usability** for enterprise users.',
        'Built and maintained **reusable design components**, improving consistency across product experiences and supporting efficient design-to-development handoff.',
        'Collaborated within agile delivery teams, working with product and engineering stakeholders through design iteration, feedback, and implementation.'
      ]
    },
    {
      company: 'HIE-HQ',
      role: 'UX Trainee',
      dates: 'January 2022 — May 2022',
      bullets: [
        'Supported research, wireframing, and prototyping across multiple client projects.',
        'Assisted in creating internal **design systems and shared design tools** used by designers.',
        'Participated in design reviews and feedback sessions to improve design quality and communication.',
        'Developed foundational experience in UX research, interaction design, collaboration, and design execution.'
      ]
    }
  ],

  education: [
    {
      school: 'Mumbai University',
      dates: '2022',
      degree: 'Bachelor of Engineering — Computer Engineering'
    }
  ],

  skills: [
    {
      group: 'Product & UX Design',
      items: 'Product Design, User Research, Problem Discovery, Interaction Design, Information Architecture, User Flows, Journey Mapping, Usability Testing, Wireframing, Prototyping'
    },
    {
      group: 'Product & Collaboration',
      items: 'Problem Framing, Design Critique, Stakeholder Collaboration, Cross-functional Collaboration, Design Storytelling, Feedback & Iteration, Agile/Scrum, Design-to-Development Handoff'
    },
    {
      group: 'Design Systems & Quality',
      items: 'Design Systems, Component Design, Accessibility, WCAG 2.1 AA, Visual Design, Interaction Design, Responsive Design'
    }
  ],

  tools: 'Figma, FigJam, Miro, Adobe Illustrator, Photoshop, Claude, Lovable',

  recognition: [
    'Best Performing Employee — Siemens Healthineers',
    'Top 10% UX Designer — Upwork'
  ]
};
