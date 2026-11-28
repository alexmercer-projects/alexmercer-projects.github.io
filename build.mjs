#!/usr/bin/env node
// Builds the static site into ./dist from pieces.json, site.json, ./pieces and ./src.
// No dependencies: needs Node 18 or newer. Run: node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { markdown } from './src/lib/markdown.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PIECES_DIR = path.join(ROOT, 'pieces');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const pieces = JSON.parse(fs.readFileSync(path.join(ROOT, 'pieces.json'), 'utf8'));

// ---------- helpers ----------
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const mailto = `mailto:${site.email}?subject=${encodeURIComponent(site.mailSubject)}`;
const pad = (n) => String(n).padStart(2, '0');
const groupOf = (cat) => (site.filterGroups && site.filterGroups[cat]) || cat;
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const copyDir = (from, to) => fs.cpSync(from, to, { recursive: true });
const ensure = (d) => fs.mkdirSync(d, { recursive: true });
const sizeOf = (f) => {
  const b = fs.statSync(f).size;
  return b >= 1024 * 1024 ? (b / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
};
const fail = (msg) => { console.error('\n  Build stopped: ' + msg + '\n'); process.exit(1); };

const icon = {
  arrow: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 12L12 2M5 2h7v7"/></svg>',
  down: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 1v11M2 7l5 5 5-5"/></svg>',
  dl: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 1v8M3 5.5L7 9.5l4-4M1.5 12.5h11"/></svg>',
  copy: '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4.5" y="4.5" width="9" height="9"/><path d="M10.5 4.5V1.5h-9v9h3"/></svg>',
  mail: '<svg aria-hidden="true" width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1.5" width="14" height="11"/><path d="M1 2l7 6 7-6"/></svg>',
};

// ---------- validate ----------
const REQUIRED = ['id', 'title', 'short', 'category', 'label', 'folder', 'summary', 'cover'];
const ids = new Set();
pieces.forEach((p, i) => {
  for (const k of REQUIRED) if (!p[k]) fail(`piece #${i + 1} (${p.id || 'no id'}) is missing "${k}" in pieces.json`);
  if (ids.has(p.id)) fail(`two pieces share the id "${p.id}"`);
  ids.add(p.id);
  if (!/^[a-z0-9-]+$/.test(p.id)) fail(`id "${p.id}" should only use lowercase letters, numbers and dashes`);
  const need = [p.cover, p.coverWide, p.coverPhone, p.demo, p.reading, ...(p.downloads || []).map((d) => (typeof d === 'string' ? d : d.file)),
    ...(p.gallery || []).map((g) => g.src), ...(p.snippets || []).map((s) => s.file)].filter(Boolean);
  for (const f of need) if (!fs.existsSync(path.join(PIECES_DIR, f))) fail(`"${p.id}" points at pieces/${f}, which does not exist`);
});
const featured = pieces.find((p) => p.featured) || null;

// ---------- paths inside dist ----------
// Each piece lives at /work/<id>/ with demo/, files/ and img/ beside its index.html.
const assetUrl = (p, rel) => {
  // rel is relative to pieces/. Files inside the piece's demo folder are served from that demo copy.
  if (/^https?:\/\//.test(rel)) return rel; // outside links (e.g. a source repo) pass through
  const inFolder = rel.startsWith(p.folder + '/') ? rel.slice(p.folder.length + 1) : rel;
  if (inFolder.startsWith('demo/')) return inFolder;
  if (rel === p.cover) return 'img/cover.webp';
  if (rel === p.coverWide) return 'img/cover-wide.webp';
  if (rel === p.coverPhone) return 'img/cover-phone.webp';
  return 'img/' + path.basename(rel);
};
const dlName = (d) => (typeof d === 'string' ? d : d.file);

// ---------- shared chrome ----------
// The live address is optional. While site.json "url" is empty, canonical links and the
// sitemap are left out and the share image uses a relative path. Set it before publishing.
const SITE_URL = (site.url || '').replace(/\/$/, '');
function head({ title, description, root, canonical, image, noindex, baseScript }) {
  const url = SITE_URL;
  const robots = noindex || site.noindex ? '\n<meta name="robots" content="noindex">' : '';
  const abs = url ? `
<link rel="canonical" href="${url}${canonical}">
<meta property="og:url" content="${url}${canonical}">` : '';
  const img = url ? url + image : root + image.replace(/^\//, '');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">${baseScript || ''}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">${robots}${abs}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#e7e7e2">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${root}assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${root}assets/apple-touch-icon.png">
<link rel="preload" href="${root}assets/fonts/SchibstedGrotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${root}assets/css/site.css">
<script>document.documentElement.classList.add('js')</script>
<script src="${root}assets/js/site.js" defer></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header" id="top">
  <div class="wrap">
    <a class="brand" href="${root ? root + 'index.html' : '#top'}" aria-label="${esc(site.name)}, back to the top of the homepage"><b>${esc(site.name)}</b></a>
    <nav class="site-nav" aria-label="Main">
      <a class="navlink" href="${root}index.html#work">Work</a>
      <a class="navlink" href="${root}index.html#services">Services</a>
      <a class="btn btn--accent nav-mail" href="${mailto}">Email Alex <span class="nav-mail__icon">${icon.arrow}</span></a>
      <details class="menu">
        <summary class="menu__btn"><span class="menu__open">Menu</span><span class="menu__close">Close</span></summary>
        <div class="menu__panel">
          <a href="${root}index.html#work">Work</a>
          <a href="${root}index.html#services">Services</a>
          <a href="${mailto}">Email Alex</a>
        </div>
      </details>
    </nav>
  </div>
</header>
`;
}

function contact(heading, line) {
  const [user, domain] = site.email.split('@');
  return `<section class="contact on-accent" aria-labelledby="contact-title">
  <div class="wrap">
    <div>
      <h2 id="contact-title" class="label" style="margin-bottom:14px">${heading}</h2>
      <a class="contact__mail" href="${mailto}">${esc(user)}<wbr>@${esc(domain)}</a>
    </div>
    <div class="contact__side">
      <p class="contact__text">${line}</p>
      <div class="contact__actions">
        <a class="btn btn--ink" href="${mailto}">${icon.mail} Email Alex</a>
        <button class="btn btn--line js-only" type="button" data-copy="${esc(site.email)}" data-status="copy-status">${icon.copy} <span class="copy-label">Copy email</span></button>
      </div>
      <p id="copy-status" class="copy-status" role="status" aria-live="polite"></p>
    </div>
  </div>
</section>`;
}

const footer = (root) => `<footer class="site-footer">
  <div class="wrap">
    <span>${esc(site.business)} &#183; US-based &#183; <a href="${mailto}">${esc(site.email)}</a></span>
    <span>Concept demos use made-up businesses and example data. Spec samples are unpublished.</span>
  </div>
</footer>
</body>
</html>
`;

// ---------- homepage ----------
function card(p, n) {
  // Same order on every card: live demo, PDF, read online, other downloads.
  // Cards without a live demo lead with their main link instead.
  const kinds = (p.downloads || []).map((d) => path.extname(dlName(d)).slice(1).toLowerCase());
  const others = [...new Set(kinds.filter((e) => e !== 'pdf'))].map((e) => '.' + e);
  const pdf = kinds.includes('pdf') ? ['PDF'] : [];
  const read = p.reading ? ['Read online'] : [];
  let exts;
  if (p.demo) exts = [/case-study/.test(p.demo) ? 'Before / after' : 'Live demo', ...pdf, ...read, ...others];
  else {
    exts = [...pdf, ...read, ...others];
    const main = others.includes('.xlsx') && /spreadsheet/i.test(p.category) ? '.xlsx' : p.reading ? 'Read online' : null;
    if (main) exts = [main, ...exts.filter((e) => e !== main)];
  }
  const cover = `work/${p.id}/img/cover.webp`;
  return `<li data-group="${esc(groupOf(p.category))}"${featured && p === featured ? ' data-featured' : ''}>
  <a class="card" href="work/${p.id}/index.html">
    <span class="card__meta label"><span>N&#186; ${pad(n)} &#183; ${esc(p.category)}</span><span class="lab">${esc(p.label)}</span></span>
    <img src="${cover}" alt="${esc(p.coverAlt || p.title)}" width="1200" height="900" loading="lazy" decoding="async">
    <span class="card__body"><span class="card__title">${esc(p.title)}</span><span class="card__sum">${esc(p.summary)}</span></span>
    <span class="card__foot">${exts.map((e) => `<span>${esc(e)}</span>`).join('')}</span>
  </a>
</li>`;
}

// Services table rows: [service, typical job, free sample, fixed price or '' for "Quoted per job", extra class].
// Only two fixed prices are allowed on the site. Everything else is quoted per job.
const SERVICES = [
  ['WordPress formatting', 'Get a batch of drafts live, with headings, images and SEO fields, once the copy and images are ready.', 'One of your posts, formatted and ready to publish.', 'From $20 / article'],
  ['Facebook &amp; Instagram ads', 'Six feed ads with headlines and captions, plus a 15-second Reel script.', 'Two of the six ads, with headlines and captions.', 'From $175 / ad set'],
  ['Small-business websites', 'A one-pager for a trade, shop, nonprofit or community group, plus WordPress and Shopify fixes. It works on phones and has tap-to-call or a contact link. Usually 2 to 3 days.', 'The top section of your homepage, on desktop and phone.', ''],
  ['Spreadsheets &amp; dashboards', 'A budget, payment log or job tracker in Excel or Google Sheets.', 'One working tab, built around your own columns.', ''],
  ['Writing &amp; scripts', 'Video and YouTube scripts, listings, posting plans and articles.', 'The opening section, or the first 30 seconds of a script.', ''],
  ['Automations &amp; admin', 'Moving orders or data between tools, trackers, voice notes to tasks, inbox and calendar setup.', 'One working step of the setup, tested on your files.', ''],
  ['Something else?', "If it's done on a computer, I can probably help. Data cleanup, file conversions, automations, research, fixing a broken page. Send it over and I'll tell you straight if it's a fit.", '', '', 'service--else'],
];

function homepage() {
  const counts = {};
  pieces.forEach((p) => { const g = groupOf(p.category); counts[g] = (counts[g] || 0) + 1; });
  const order = [...(site.filterOrder || []), ...Object.keys(counts).filter((g) => !(site.filterOrder || []).includes(g))]
    .filter((g) => counts[g]);
  const fn = featured ? pieces.indexOf(featured) + 1 : 0;
  const chips = [`<button class="chip" type="button" data-filter="all" aria-pressed="true">All <span>${pieces.length}</span></button>`,
    ...order.map((g) => `<button class="chip" type="button" data-filter="${esc(g)}" data-slug="${slugify(g)}" aria-pressed="false">${esc(g)} <span>${counts[g]}</span></button>`)].join('\n      ');
  const fImg = featured ? (featured.coverWide ? `work/${featured.id}/img/cover-wide.webp` : `work/${featured.id}/img/cover.webp`) : '';
  const fPhone = featured && featured.coverPhone ? `work/${featured.id}/img/cover-phone.webp` : '';
  const FILTER_SLUGS = [...order.map((g) => slugify(g)), ...(order.includes('Automation') ? ['automations'] : [])];
  // Each tile opens the matching filtered work. "Something else" has no work of its own, so it opens that Services row.
  const STRIP = [['Websites', 'websites'], ['Spreadsheets', 'spreadsheets'], ['Ads', 'ads'], ['Writing', 'writing'], ['Automations', 'automation'], ['Something else', 'something-else']];
  const fDl = featured ? ((featured.downloads || []).find((d) => /\.xlsx$/i.test(dlName(d))) || (featured.downloads || [])[0]) : null;

  return head({
    title: `${site.name} · websites, spreadsheets, ads and writing`,
    description: 'Alex Mercer is a US-based freelancer who builds small-business websites, spreadsheets, ads and writing. You get a free sample first. Most jobs are done within 24 hours.',
    root: '', canonical: '/', image: '/assets/og.png',
  }) + `
<main id="main">
<section class="hero" aria-labelledby="hero-title">
  <div class="wrap">
    <div class="hero__grid${featured ? '' : ' hero__grid--plain'}">
      <div class="hero__copy">
        <p class="eyebrow label"><i aria-hidden="true"></i>Freelancer &#183; US-based &#183; Available now</p>
        <h1 id="hero-title">I build websites, spreadsheets, ads and writing for small businesses.</h1>
        <p class="hero__intro">I'm Alex. Email me the job and I can usually start the same day.</p>
      </div>

      ${featured ? `<figure class="featured">
        <a class="featured__img" href="work/${featured.id}/index.html" tabindex="-1" aria-hidden="true">
          <picture>
            ${fPhone ? `<source media="(max-width: 699px)" srcset="${fPhone}" width="780" height="940">` : ''}
            <img src="${fImg}" alt="" width="1600" height="1000" fetchpriority="high" decoding="async">
          </picture>
        </a>
        <figcaption class="featured__cap">
          <div>
            <p class="featured__l1 label"><span class="fig">Fig. 1</span>N&#186; ${pad(fn)} &#183; ${esc(featured.category)} &#183; ${esc(featured.label)}</p>
            <p class="featured__l2"><a href="work/${featured.id}/index.html">${esc(featured.featuredTitle || featured.title)}.</a> ${esc(featured.featuredLine || featured.summary)}</p>
          </div>
          <div class="featured__actions">
            ${featured.demo ? `<a class="btn btn--accent" href="work/${featured.id}/${esc(assetUrl(featured, featured.demo))}">${esc(featured.demoLabel || 'Open the demo')} ${icon.arrow}</a>` : ''}
            ${fDl ? `<a class="btn btn--panel" href="work/${featured.id}/files/${esc(path.basename(dlName(fDl)))}" download>${icon.dl} ${path.extname(dlName(fDl)) === '.xlsx' ? 'Download .xlsx' : 'Download'}</a>` : ''}
            <a class="btn" href="work/${featured.id}/index.html">Details</a>
          </div>
        </figcaption>
      </figure>` : ''}

      <div class="hero__steps">
        <h2 class="label steps-head">How it works</h2>
        <ol class="steps">
          <li><span class="num" aria-hidden="true">01</span><span class="txt">Email me the job.<small>Say what you need and attach any files you have.</small></span></li>
          <li><span class="num" aria-hidden="true">02</span><span class="txt">See a free sample.<small>Before you pay anything. If the sample isn't right, you don't owe anything.</small></span></li>
          <li><span class="num" aria-hidden="true">03</span><span class="txt">Approve it and I finish the rest.<small>Most jobs within 24 hours. Bigger jobs are quoted up front.</small></span></li>
        </ol>
      </div>
    </div>
    <nav class="strip" aria-label="See the work by type">
      <ul>
        ${STRIP.map(([t, h]) => `<li><a href="#${h}"><span>${t}</span>${icon.down}</a></li>`).join('\n        ')}
      </ul>
    </nav>
  </div>
</section>

<section class="section" id="work" aria-labelledby="work-title">
  ${FILTER_SLUGS.map((s) => `<span class="anchor" id="${s}" aria-hidden="true"></span>`).join('')}
  <div class="wrap">
    <div class="section-head">
      <div>
        <p class="label" style="color:var(--muted);margin-bottom:8px">Index of work &#183; ${pieces.length} items</p>
        <h2 id="work-title">The work is the sample.</h2>
      </div>
    </div>

    <div class="filters" role="group" aria-label="Filter the work by category">
      ${chips}
    </div>
    <ul class="grid" id="work-grid" data-initial="${site.initialGridCount || 9}">
${pieces.map((p, i) => card(p, i + 1)).join('\n')}
    </ul>
    <p id="grid-status" class="grid-status label" role="status" aria-live="polite"></p>
    <div class="more" id="more">
      <button class="btn" type="button" aria-controls="work-grid" aria-expanded="false" data-less="Show less &#8593;">Show all ${pieces.length} items ${icon.down}</button>
    </div>
  </div>
</section>

<section class="section" id="services" aria-labelledby="services-title">
  <div class="wrap">
    <div class="section-head">
      <h2 id="services-title">Services</h2>
      <p class="label price-note">Anything without a price is quoted per job.</p>
    </div>
    <div class="services">
      <div class="services-head label" aria-hidden="true"><span>Service</span><span>Typical job</span><span style="text-align:right">Price</span></div>
      ${SERVICES.map(([name, job, sample, price, extra]) => `<div class="service${extra ? ' ' + extra : ''}"${extra ? ' id="something-else"' : ''}><h3>${name}</h3><div class="service__job"><p>${job}</p>${sample ? `<p class="sample"><b>Free sample.</b> ${sample}</p>` : ''}</div><p class="price${price ? '' : ' quoted'}">${price || 'Quoted per job'}</p></div>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="section about" id="about" aria-labelledby="about-title">
  <div class="wrap about__grid">
    <h2 id="about-title">About</h2>
    <div class="about__body">
      <p class="about__lead">I'm Alex, a US-based freelancer. I build small websites, write and format copy, and make spreadsheets and ads. I work by email and can usually start the same day.</p>
      <dl class="expect">
        <div><dt>Replies</dt><dd>I usually reply the same day.</dd></div>
        <div><dt>Your files</dt><dd>You own the finished files once it's paid for, and small revisions are included.</dd></div>
      </dl>
    </div>
  </div>
</section>
</main>
` + contact('Got a specific job?', 'Email me the brief and any files and I will get started.') + footer('');
}

// ---------- project page ----------
function downloadLabel(d, all) {
  if (typeof d !== 'string' && d.label) return d.label;
  const f = dlName(d);
  const ext = path.extname(f).slice(1).toLowerCase();
  const kind = { pdf: 'PDF', xlsx: '.xlsx workbook', py: '.py script', php: '.php script', zip: '.zip of all files', md: '.md file' }[ext] || '.' + ext;
  const sameKind = all.filter((x) => path.extname(dlName(x)).toLowerCase() === '.' + ext).length > 1;
  if (!sameKind) return 'Download ' + kind;
  const nice = path.basename(f, path.extname(f)).replace(/[-_]+/g, ' ').replace(/\b(SAMPLE|DEMO|SPEC|EXAMPLE)\b/g, '').replace(/\s+/g, ' ').trim();
  return `Download ${kind}: ${nice}`;
}

function projectPage(p, i) {
  const n = i + 1;
  const prev = pieces[(i - 1 + pieces.length) % pieces.length];
  const next = pieces[(i + 1) % pieces.length];
  const dls = p.downloads || [];
  const actions = [];
  if (p.demo) actions.push(`<a class="btn btn--accent" href="${esc(assetUrl(p, p.demo))}">${esc(p.demoLabel || 'Open the demo')} ${icon.arrow}</a>`);
  (p.extraLinks || []).forEach((l) => actions.push(`<a class="btn btn--panel" href="${esc(assetUrl(p, l.href))}">${esc(l.label)} ${icon.arrow}</a>`));
  dls.forEach((d) => {
    const f = dlName(d);
    actions.push(`<a class="btn btn--panel dl" href="files/${esc(path.basename(f))}" download><span>${icon.dl} ${esc(downloadLabel(d, dls))}</span><small>${sizeOf(path.join(PIECES_DIR, f))}</small></a>`);
  });
  if (p.reading) actions.push(`<a class="btn" href="#read">Read it on this page ${icon.down}</a>`);

  const coverSrc = p.coverWide ? 'img/cover-wide.webp' : 'img/cover.webp';
  const gallery = (p.gallery || []).length ? `
  <section class="p-section" aria-labelledby="g-title">
    <h2 id="g-title">A closer look</h2>
    <div class="gallery ${p.galleryStyle ? 'gallery--' + p.galleryStyle : p.gallery.length >= 3 ? 'gallery--3' : ''}">
      ${p.gallery.map((g) => `<figure><a href="${esc(assetUrl(p, g.src))}"><img src="${esc(assetUrl(p, g.src))}" alt="${esc(g.alt)}" loading="lazy" decoding="async"></a><figcaption>${esc(g.alt)}</figcaption></figure>`).join('\n      ')}
    </div>
  </section>` : '';

  let features = p.features;
  if (!features) {
    const readme = path.join(PIECES_DIR, p.folder, 'README.md');
    if (fs.existsSync(readme)) {
      const m = fs.readFileSync(readme, 'utf8').match(/## Key features\s*\n([\s\S]*?)(\n## |\s*$)/);
      if (m) features = m[1].split('\n').filter((l) => /^- /.test(l)).map((l) => l.slice(2).trim());
    }
  }
  const inlineMd = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
  const feats = features && features.length ? `
  <section class="p-section" aria-labelledby="f-title">
    <h2 id="f-title">What's in it</h2>
    <ol class="features">${features.map((f) => `<li><span>${inlineMd(f)}</span></li>`).join('')}</ol>
  </section>` : '';

  const snippets = (p.snippets || []).map((s, k) => {
    let text = fs.readFileSync(path.join(PIECES_DIR, s.file), 'utf8').replace(/\t/g, '  ');
    if (s.lines) text = text.split('\n').slice(s.lines[0] - 1, s.lines[1]).join('\n');
    return `<figure class="snippet" style="margin:0 0 20px"><figcaption class="reading__bar label"><span>${esc(path.basename(s.file))}</span><span>${esc(s.caption || '')}</span></figcaption><pre tabindex="0"><code>${esc(text.trimEnd())}</code></pre></figure>`;
  }).join('\n');
  const snip = snippets ? `
  <section class="p-section" aria-labelledby="s-title">
    <h2 id="s-title">${p.category === 'Automation' ? 'The output' : 'The code'}</h2>
    ${snippets}
  </section>` : '';

  const reading = p.reading ? `
  <section class="p-section" id="read" aria-labelledby="r-title">
    <h2 id="r-title">${esc(p.readingTitle || 'Read the sample')}</h2>
    <article class="reading">
      <div class="reading__bar label"><span>${esc(p.short)}</span><span>${esc(p.label)}</span></div>
      <div class="prose">
${markdown(fs.readFileSync(path.join(PIECES_DIR, p.reading), 'utf8'), { headingOffset: 1 })}
      </div>
    </article>
  </section>` : '';

  return head({
    title: `${p.title} | ${site.name}`,
    description: p.summary,
    root: '../../', canonical: `/work/${p.id}/`, image: `/work/${p.id}/img/cover.webp`,
  }) + `
<main id="main">
<div class="wrap">
  <nav class="crumbs label" aria-label="Breadcrumb"><a href="../../index.html#work">Index of work</a><span aria-hidden="true">/</span><span>N&#186; ${pad(n)} &#183; ${esc(p.short)}</span></nav>
  <div class="p-head">
    <div>
      <p class="p-meta"><span class="tag">N&#186; ${pad(n)}</span><span class="tag">${esc(p.category)}</span><span class="tag tag--label">${esc(p.label)}</span></p>
      <h1>${esc(p.title)}</h1>
      <p class="p-summary">${esc(p.summary)}</p>
    </div>
    <aside class="p-side" aria-label="Open or download">
      <div class="p-actions">
        ${actions.join('\n        ')}
      </div>
      <p class="honesty"><b>${esc(p.label)}</b>${esc(p.labelNote || (site.labelNotes || {})[p.label] || '')}</p>
    </aside>
  </div>
  <figure class="p-cover" style="margin:0">
    <img src="${coverSrc}" alt="${esc(p.coverAlt || p.title)}" fetchpriority="high" decoding="async">
    <figcaption class="figcap"><span>Fig. 1 &#183; ${esc(p.short)}</span><span>${esc(p.label)}</span></figcaption>
  </figure>
${gallery}${feats}${snip}${reading}
  <nav class="pager" aria-label="More work">
    <a class="prev" href="../${prev.id}/index.html"><span class="label">&larr; Previous</span><span class="t">${esc(prev.title)}</span></a>
    <a class="next" href="../${next.id}/index.html"><span class="label">Next &rarr;</span><span class="t">${esc(next.title)}</span></a>
  </nav>
</div>
</main>
` + contact('Want something like this?', 'Email me the job. You get a free sample first. Most jobs are done within 24 hours once I have the brief and the files.') + footer('../../');
}

// ---------- write ----------
fs.rmSync(DIST, { recursive: true, force: true });
ensure(DIST);
copyDir(path.join(ROOT, 'src/assets'), path.join(DIST, 'assets'));

pieces.forEach((p, i) => {
  const out = path.join(DIST, 'work', p.id);
  ensure(path.join(out, 'img'));
  const src = path.join(PIECES_DIR, p.folder);
  if (fs.existsSync(path.join(src, 'demo'))) copyDir(path.join(src, 'demo'), path.join(out, 'demo'));
  const imgs = [p.cover, p.coverWide, p.coverPhone, ...(p.gallery || []).map((g) => g.src)].filter(Boolean);
  for (const rel of imgs) {
    const url = assetUrl(p, rel);
    if (url.startsWith('img/')) fs.copyFileSync(path.join(PIECES_DIR, rel), path.join(out, url));
  }
  if ((p.downloads || []).length) {
    ensure(path.join(out, 'files'));
    for (const d of p.downloads) fs.copyFileSync(path.join(PIECES_DIR, dlName(d)), path.join(out, 'files', path.basename(dlName(d))));
  }
  fs.writeFileSync(path.join(out, 'index.html'), projectPage(p, i));
});

fs.writeFileSync(path.join(DIST, 'index.html'), homepage());
// GitHub Pages serves 404.html for any missing address, at that address. A <base> tag points its
// relative links back at the site root: the live address when site.json has one, otherwise the
// the part of the address before /work/ or /assets/, or else the first folder of a github.io
// project address (https://<name>.github.io/<repo>/).
const base404 = SITE_URL
  ? `\n<base href="${SITE_URL}/">`
  : `\n<script>(function(){var l=location.pathname,i=l.indexOf('/work/'),a=l.indexOf('/assets/'),p=l.split('/'),b='/';if(i>=0)b=l.slice(0,i+1);else if(a>=0)b=l.slice(0,a+1);else if(/\\.github\\.io$/.test(location.hostname)&&p.length>2)b='/'+p[1]+'/';document.write('<base href="'+b+'">');})()</script>`;
fs.writeFileSync(path.join(DIST, '404.html'), head({ title: `Page not found | ${site.name}`, description: 'Page not found.', root: '', canonical: '/404', image: '/assets/og.png', noindex: true, baseScript: base404 }) +
  `<main id="main"><div class="wrap" style="padding-block:72px 96px"><p class="label" style="color:var(--muted)">Error 404</p><h1 style="font-weight:800;font-size:clamp(40px,9vw,88px);letter-spacing:-.045em;line-height:.92;margin:12px 0 20px">That page isn't here.</h1><p style="font-size:19px;max-width:30em;margin-bottom:28px">The work and the email address are still where they were.</p><p style="display:flex;flex-wrap:wrap;gap:12px"><a class="btn btn--ink" href="index.html#work">See the work</a><a class="btn btn--accent" href="${mailto}">Email Alex</a></p></div></main>` + footer(''));
// GitHub Pages: .nojekyll serves every file as it is, without a Jekyll pass.
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
// A CNAME file keeps the custom domain attached when Actions publishes dist/.
if (SITE_URL) {
  fs.writeFileSync(path.join(DIST, 'CNAME'), `${new URL(SITE_URL).hostname}\n`);
}
fs.writeFileSync(path.join(DIST, 'robots.txt'), site.noindex ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n${SITE_URL ? `\nSitemap: ${SITE_URL}/sitemap.xml\n` : ''}`);
if (SITE_URL) {
  const urls = ['/', ...pieces.map((p) => `/work/${p.id}/`)];
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE_URL}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
}

console.log(`Built ${pieces.length} pieces into dist/${featured ? ` (featured: ${featured.id})` : ' (no featured piece)'}.`);
