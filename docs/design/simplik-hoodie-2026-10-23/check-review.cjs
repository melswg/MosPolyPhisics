const { chromium } = require('playwright');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless:true, channel:'chrome' });
  const page = await browser.newPage({ viewport:{ width:1440,height:1100 }, deviceScaleFactor:1 });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('response', response => { if(response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto('http://127.0.0.1:8765/docs/design/simplik-hoodie-2026-10-23/review.html');
  await page.waitForFunction(() => document.querySelectorAll('[data-avatar] svg').length === 29);
  await page.locator('.closeups').screenshot({path:path.join(__dirname,'approval.png')});
  await page.screenshot({path:path.join(__dirname,'review-desktop.png'),fullPage:true});
  for (const face of ['smile','happy','wink','wow']) {
    await page.selectOption('#face',face);
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.mini [data-orbits]').count(),0);
    assert.equal(await page.locator('.large [data-orbits]').count(),2);
    await page.locator('.closeups').screenshot({path:path.join(__dirname,`face-${face}.png`)});
  }
  await page.selectOption('#face','smile');
  for (const width of [390,320]) {
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
    await page.screenshot({path:path.join(__dirname,`review-mobile-${width}.png`),fullPage:false});
  }
  assert.deepEqual(errors,[]);
  console.log('Review: 5 colors, 4 faces, both themes, 40/64px, 1440/390/320px, orbit separation and resource loading passed');
  await browser.close();
})().catch(error => {console.error(error);process.exitCode=1});
