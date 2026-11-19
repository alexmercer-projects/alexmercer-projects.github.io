// Optional helper: turns a Markdown sample into a clean, typeset PDF.
// Needs Playwright (npm i -D playwright && npx playwright install chromium). The site build does not need this.
// Usage: node tools/make-pdfs.mjs <input.md> <output.pdf> "<label line>"
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { markdown } from '../src/lib/markdown.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const font = (f) => pathToFileURL(path.join(ROOT, 'src/assets/fonts', f)).href;

const jobs = [];
if (process.argv.length >= 4) jobs.push([process.argv[2], process.argv[3], process.argv[4] || '']);
else {
  console.error('Usage: node tools/make-pdfs.mjs <input.md> <output.pdf> "<label line>"');
  process.exit(1);
}

const css = `
@font-face{font-family:'Schibsted Grotesk';src:url('${font('SchibstedGrotesk-latin.woff2')}') format('woff2');font-weight:400 900}
@font-face{font-family:'JetBrains Mono';src:url('${font('JetBrainsMono-latin.woff2')}') format('woff2');font-weight:400 800}
@page{size:Letter;margin:0.7in 0.75in 0.8in}
body{font-family:'Schibsted Grotesk',sans-serif;font-size:11pt;line-height:1.55;color:#151512;margin:0}
.top{display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:8pt;letter-spacing:.05em;text-transform:uppercase;border-bottom:1.5px solid #0f0f0f;padding-bottom:7px;margin-bottom:22px}
.top b{background:#ff4a1c;padding:1px 5px;font-weight:500;color:#0f0f0f}
h1{font-weight:800;font-size:25pt;line-height:1.02;letter-spacing:-.03em;margin:0 0 10px}
h2{font-weight:800;font-size:15pt;letter-spacing:-.015em;margin:22px 0 6px;break-after:avoid}
h3{font-weight:700;font-size:12pt;margin:16px 0 4px;break-after:avoid}
p,ul,ol,blockquote,table{margin:0 0 9px}
ul,ol{padding-left:18px} li{margin-bottom:3px}
li.check{list-style:none;margin-left:-18px;display:flex;gap:8px} li.check .box{width:10px;height:10px;border:1px solid #0f0f0f;margin-top:4px;flex:none}
blockquote{border:1px solid #0f0f0f;background:#f3f3ef;padding:8px 12px;break-inside:avoid}
code{font-family:'JetBrains Mono',monospace;font-size:9pt;background:#eee;padding:0 3px}
hr{border:0;border-top:1px solid #0f0f0f;margin:16px 0}
table{border-collapse:collapse;width:100%;font-size:9pt;line-height:1.4}
th,td{text-align:left;vertical-align:top;padding:5px 7px;border-bottom:1px solid #c9c9c2}
th{font-family:'JetBrains Mono',monospace;font-size:7.5pt;text-transform:uppercase;border-bottom:1.5px solid #0f0f0f}
a{color:inherit}
`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [input, output, label] of jobs) {
  const body = markdown(fs.readFileSync(input, 'utf8'), { slug: false });
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css}</style></head><body>
<div class="top"><span>Alex Mercer &#183; alexmercer.projects@gmail.com</span><b>${label}</b></div>${body}</body></html>`;
  const tmp = path.join(path.dirname(output), '.pdf-source.html');
  fs.writeFileSync(tmp, html);
  await page.goto(pathToFileURL(tmp).href);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: output, format: 'Letter', printBackground: true, preferCSSPageSize: true });
  fs.rmSync(tmp);
  console.log('wrote', output);
}
await browser.close();
