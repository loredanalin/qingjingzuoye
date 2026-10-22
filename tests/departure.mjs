import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const url=process.env.APP_URL||'http://127.0.0.1:5180/courtyard-restored.html';
for(const webgl of [false,true]){
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox',...(webgl?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--disable-webgl'])]});
  try{
    const page=await browser.newPage({viewport:{width:1538,height:954},reducedMotion:'reduce'}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);await page.waitForFunction(w=>w?window.__threeReady:window.__ready,webgl);
    await page.locator('#start-game').click();
    const progress=()=>page.evaluate(()=>window.__knowledgeProgress);
    const reset=async()=>{await page.keyboard.press('Home');await page.waitForFunction(()=>window.__sceneDebug.zoom===1);};
    const wheel=async(delta)=>{await page.mouse.wheel(0,delta);await page.waitForTimeout(150);};
    const view=async(id)=>{await page.locator(id).click();await page.locator('#knowledge-image').evaluate(i=>i.decode());await page.keyboard.press('Escape');};
    await page.mouse.click(20,100);await page.mouse.click(20,100);
    for(let i=0;i<4;i++)await wheel(300);
    assert.equal(await page.locator('#departure').isVisible(),false,'zoom alone cannot depart');
    await reset();
    await view('#knowledge-hotspot');await view('#knowledge-hotspot');
    assert.deepEqual((await progress()).viewed,['liangfang'],'repeat clicks count once');
    await view('#column-knowledge-hotspot');
    assert.equal((await progress()).ready,false);
    for(let i=0;i<4;i++)await wheel(300);
    assert.equal(await page.locator('#departure').isVisible(),false,'two topics cannot depart');
    await reset();
    await page.locator('#railing-knowledge-hotspot').click();
    assert.equal((await progress()).ready,true);
    await wheel(300);
    assert.equal(await page.locator('#departure').isVisible(),false,'reading the last poster cannot depart');
    await page.keyboard.press('Escape');
    for(let i=0;i<8;i++)await page.keyboard.press('+');
    await page.waitForFunction(()=>window.__sceneDebug.zoom>2);
    assert.equal(await page.locator('#departure').isVisible(),false,'keyboard zoom does not trigger wheel action');
    await page.locator('#railing-knowledge-hotspot').click();await page.keyboard.press('Escape');
    assert.equal(await page.locator('#departure').isVisible(),false,'closing a poster above threshold does not automatically depart');
    await wheel(-100);
    assert.equal(await page.locator('#departure').isVisible(),false,'forward scroll does not depart');
    await reset();
    await wheel(300);await wheel(300);
    assert.equal(await page.locator('#departure').isVisible(),false,'below 2x remains in scene');
    await wheel(150);
    await page.waitForFunction(()=>window.__departed);
    assert.equal(await page.locator('#departure').textContent(),'出行');
    assert.equal((await progress()).departed,true);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'departure');
    assert.equal(await page.locator('#stage').evaluate(e=>e.inert),true);
    assert.equal(await page.locator('#departure').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(0, 0, 0)');
    const box=await page.locator('#departure').boundingBox();assert.deepEqual(box,{x:0,y:0,width:1538,height:954});
    await page.screenshot({path:`tests/results/departure-${webgl?'webgl':'css'}.png`});
    await page.keyboard.press('Home');await wheel(-300);await page.mouse.click(20,100);
    assert.equal(await page.locator('#departure').isVisible(),true,'end screen stays until refresh');
    assert.deepEqual(errors,[]);
    console.log(`PASS ${webgl?'WebGL':'CSS'}: three distinct posters required; no reading/keyboard/forward-scroll trigger; backward scroll at 2x shows centered departure on black; terminal screen.`);
  }finally{await browser.close()}
}
