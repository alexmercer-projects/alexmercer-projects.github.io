// Optional helper: renders tools/og.html into src/assets/og.png (1200 x 630), the image shown when the site is shared.
// Needs Playwright (npm i -D playwright && npx playwright install chromium). The site build does not need this.
// Usage: node tools/make-og.mjs, then node build.mjs
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(pathToFileURL(path.join(ROOT, 'tools/og.html')).href, { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(ROOT, 'src/assets/og.png') });
await browser.close();
console.log('Wrote src/assets/og.png');
