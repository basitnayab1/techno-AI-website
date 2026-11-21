/* Run: node scripts/screenshot.js [--all] [--resume] [--jobs=3] [--label=baseline] [/route/ ...]
 * Start the site separately. BASE_URL defaults to http://localhost:3100.
 * PLAYWRIGHT_BROWSERS_PATH can point to an existing browser installation.
 */
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');

async function main() {
  const args = process.argv.slice(2);
  const base = process.env.BASE_URL || 'http://localhost:3100';
  const label = (args.find(a => a.startsWith('--label=')) || '--label=latest').slice(8);
  if (!/^[\w-]+$/.test(label)) throw new Error('Label must contain only letters, digits, underscores or hyphens.');
  const root = path.resolve(__dirname, '..');
  const routes = args.includes('--all')
    ? [...new Set(['/', ...Object.keys(JSON.parse(await fs.readFile(path.join(root, 'content/templated.json'), 'utf8'))), ...Object.keys(JSON.parse(await fs.readFile(path.join(root, 'content/routes.json'), 'utf8')))])]
    : args.filter(a => a.startsWith('/'));
  if (!routes.length) routes.push('/');
  const output = path.join(root, 'screenshots', label);
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = args.includes('--resume')
    ? JSON.parse(await fs.readFile(path.join(output, 'audit.json'), 'utf8').catch(() => '[]'))
    : [];
  const jobs = Math.max(1, Math.min(3, Number((args.find(a => a.startsWith('--jobs=')) || '--jobs=1').slice(7)) || 1));
  const tasks = [1440, 390].flatMap(width => routes.map(route => ({ width, route })))
    .filter(t => !results.some(r => r.width === t.width && r.route === t.route && r.captures.length && !r.errors.length));
  let save = Promise.resolve();
  try {
    await Promise.all(Array.from({ length: jobs }, async () => {
      while (tasks.length) {
      const { width, route } = tasks.shift();
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, isMobile: width === 390, hasTouch: width === 390 });
        const page = await context.newPage();
        const result = { route, width, errors: [], failedRequests: [], captures: [] };
        page.on('pageerror', e => result.errors.push(e.message));
        page.on('response', r => { if (r.status() >= 400) result.failedRequests.push({ url: r.url(), status: r.status() }); });
        try {
          const response = await page.goto(new URL(route, base).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
          result.status = response.status();
          await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 5000))]));
          await page.waitForTimeout(2200);
          if (width !== 390) await page.mouse.move(0, 450);
          // Move through the page incrementally so intersection observers and scroll scenes run.
          const height = await page.evaluate(() => document.documentElement.scrollHeight);
          const stops = [...new Set([0, .25, .5, .75, 1].map(p => Math.round(Math.max(0, height - 900) * p)))];
          let y = 0;
          for (const target of stops) {
            while (y < target) {
              y = Math.min(y + 600, target);
              await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
              await page.waitForTimeout(100);
            }
            await page.waitForTimeout(1400);
            const state = await page.evaluate(() => ({
              y: window.scrollY, height: document.documentElement.scrollHeight,
              overflow: document.documentElement.scrollWidth - window.innerWidth,
              headings: [...document.querySelectorAll('h1,h2')].filter(e => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).map(e => e.textContent.trim()),
              hiddenReveals: [...document.querySelectorAll('[data-reveal]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom < innerHeight * .9 && +getComputedStyle(e).opacity < .1; }).map(e => e.className),
            }));
            const filename = `${route.replace(/[^a-z0-9]+/gi, '-') || 'home'}-${width}-${target}.png`;
            await page.screenshot({ path: path.join(output, filename) });
            result.captures.push({ file: filename, ...state });
          }
        } catch (e) { result.errors.push(e.message); }
        finally { await context.close(); }
        const previous = results.findIndex(r => r.route === route && r.width === width);
        if (previous >= 0) results.splice(previous, 1);
        results.push(result);
        const snapshot = JSON.stringify(results, null, 2);
        save = save.then(() => fs.writeFile(path.join(output, 'audit.json'), snapshot));
        await save;
        console.log(JSON.stringify({ route, width, status: result.status, errors: result.errors.length, captures: result.captures.length }));
      }
    }));
  } finally { await browser.close(); }
  if (results.some(r => r.status >= 400 || r.errors.length)) process.exitCode = 1;
}
main().catch(e => { console.error(e); process.exitCode = 1; });
