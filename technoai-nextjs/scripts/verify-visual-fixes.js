const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');

async function main() {
  const base = process.env.BASE_URL || 'http://localhost:3100';
  const output = path.resolve(__dirname, '../screenshots/verification');
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390]) {
      for (const reducedMotion of ['no-preference', 'reduce']) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
        try {
          await page.goto(base, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(2400);
          if (width === 1440) {
            const cue = page.locator('.hx-scroll');
            const alignment = await cue.evaluate(e => {
              const r = e.getBoundingClientRect(), hero = e.closest('.hx-hero').getBoundingClientRect();
              return { offset: r.x + r.width / 2 - (hero.x + hero.width / 2), opacity: getComputedStyle(e).opacity };
            });
            console.log({ width, reducedMotion, alignment });
            assert(Math.abs(alignment.offset) < 1, 'Hero scroll cue must stay horizontally centered');
            assert.equal(alignment.opacity, '1');
          }
          if (process.argv.includes('--check-skip')) {
            const skip = page.locator('.skip-link');
            await skip.focus();
            assert(await skip.evaluate(e => {
              const r = e.getBoundingClientRect();
              return e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
            }), 'Focused skip link must not be covered by the header');
            await page.screenshot({ path: path.join(output, `skip-${width}-${reducedMotion}.png`) });
            await page.keyboard.press('Enter');
            assert.equal(await page.evaluate(() => document.activeElement.id), 'main', 'Skip link must move focus into main content');
          }
          await page.screenshot({ path: path.join(output, `hero-${width}-${reducedMotion}.png`) });
          await page.getByRole('button', { name: 'Open menu' }).click();
          await page.waitForTimeout(900);
          assert(await page.getByRole('dialog').isVisible());
          await page.keyboard.press('Escape');
          assert.equal(await page.getByRole('dialog').count(), 0);
          assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Open menu');
        } finally { await page.close(); }
      }
    }
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
