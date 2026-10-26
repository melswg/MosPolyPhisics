const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const base='http://127.0.0.1:8877';
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--disable-gpu'],...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{channel:'chrome'})});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1400}});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const name='simplik_'+Date.now();
    const register=await context.request.post(base+'/api/register',{data:{username:name,email:name+'@example.org',password:'SpriteReview2026',accepted_personal_data_processing:true}});
    assert.equal(register.status(),201);
    await page.goto(base+'/account');
    await page.locator('#avatar-color').waitFor();
    const options=await(await context.request.get(base+'/api/avatar/options')).json();
    const cases=[...options.presets.map(p=>p.config),
      {color:'pink',face:'happy',outfit:'hoodie',accessory:'headphones',hat:'graduate'},
      {color:'blue',face:'wow',outfit:'hoodie',accessory:'headphones',hat:'space'},
      {color:'purple',face:'smile',outfit:'labcoat',accessory:'glasses',hat:'none'}];
    for(const config of cases){
      for(const [key,value] of Object.entries(config))await page.selectOption('#avatar-'+key,value);
      const response=page.waitForResponse(r=>r.url().endsWith('/api/user/avatar')&&r.request().method()==='POST');
      await page.getByRole('button',{name:'Сохранить аватар',exact:true}).click();
      assert.equal((await response).status(),200);
      await page.getByText('Аватар сохранён',{exact:false}).waitFor();
      const saved=await(await context.request.get(base+'/api/user/me')).json();
      assert.deepEqual(saved.avatar,config);
      await page.reload();await page.locator('#avatar-color').waitFor();
      for(const [key,value]of Object.entries(config))assert.equal(await page.locator('#avatar-'+key).inputValue(),value);
      assert.equal(await page.locator('.profile [data-orbits]').count(),0);
      assert.equal(await page.locator('.avatar-editor__image [data-orbits]').count(),1);
      if(config.hat==='space'){
        assert.equal(await page.locator('.avatar-editor__image image[href*="hoodie"],.avatar-editor__image image[href*="headphones"]').count(),0);
        await page.getByText('Скафандр — цельный образ',{exact:false}).waitFor();
        await page.selectOption('#avatar-hat','none');
        assert.equal(await page.locator('#avatar-outfit').inputValue(),config.outfit);
        assert.equal(await page.locator('#avatar-accessory').inputValue(),config.accessory);
        assert.equal(await page.locator('.avatar-editor__image image[href*="headphones"]').count(),config.accessory==='headphones'?1:0);
      }
    }
    await page.locator('#avatar-color').focus();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'avatar-color');
    for(const width of [1440,390,320]){
      await page.setViewportSize({width,height:width===1440?1400:950});
      for(const theme of ['light','dark']){
        await page.evaluate(theme=>localStorage.setItem('mosphysics-theme',theme),theme);
        await page.reload();await page.locator('#avatar-color').waitFor();
        const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,items:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().width&&(el.getBoundingClientRect().right>innerWidth+1||el.scrollWidth>el.clientWidth+2)).slice(-12).map(el=>({tag:el.tagName,className:el.className,text:el.textContent.slice(0,90),width:el.clientWidth,scroll:el.scrollWidth}))}));
        assert.equal(overflow.scroll>overflow.width,false,`${width} ${theme}: ${JSON.stringify(overflow)}`);
        await page.locator('.avatar-editor').scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        if(width===1440)await page.locator('.avatar-editor').screenshot({path:path.join(__dirname,`account-${width}-${theme}.png`)});
        else await page.screenshot({path:path.join(__dirname,`account-${width}-${theme}.png`)});
        await page.locator('.header').screenshot({path:path.join(__dirname,`header-${width}-${theme}.png`)});
      }
    }
    assert.deepEqual(errors,[]);
    console.log('Account passed: 7 saved configurations, reload/API persistence, all 5 colors, conflict visibility/restoration, orbit-free header, keyboard focus, 1440/390/320px, both themes');
  } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
