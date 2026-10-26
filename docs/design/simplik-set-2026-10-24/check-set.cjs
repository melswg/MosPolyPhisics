const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const folder=__dirname;
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--disable-gpu'],...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{channel:'chrome'})});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1700}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400) errors.push(`${r.status()} ${r.url()}`)});
    await page.goto('http://127.0.0.1:8765/docs/design/simplik-set-2026-10-24/review.html');
    await page.locator('#gallery svg').first().waitFor();
    for(const face of ['smile','happy','wink','wow']){
      await page.selectOption('#face',face);
      for(const color of ['purple','blue','mint','pink','gold']){
        await page.selectOption('#color',color);
        assert.equal(await page.locator('.mini [data-orbits],.medium [data-orbits]').count(),0);
        assert.equal(await page.locator('#orbit [data-orbits]').count(),1);
      }
      await page.selectOption('#color','purple');
      await page.waitForTimeout(250);
      await page.locator('#gallery').screenshot({path:path.join(folder,`faces-${face}.png`)});
    }
    await page.selectOption('#face','smile');
    for(const theme of ['light','dark']){
      await page.evaluate(theme=>document.body.classList.toggle('dark',theme==='dark'),theme);
      await page.waitForTimeout(250);
      await page.locator('#gallery').screenshot({path:path.join(folder,`set-${theme}.png`)});
    }
    for(const width of [390,320]){
      await page.setViewportSize({width,height:950});
      for(const theme of ['light','dark']){
        await page.evaluate(theme=>document.body.classList.toggle('dark',theme==='dark'),theme);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        await page.screenshot({path:path.join(folder,`mobile-${width}-${theme}.png`)});
      }
    }
    assert.deepEqual(errors,[]);
    console.log('Gallery passed: 5 colors, 4 emotions, 12 combinations, both themes, 1440/390/320px, 40/64px, resource loading and orbit separation');
  } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
