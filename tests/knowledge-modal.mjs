import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const url=process.env.APP_URL||'http://127.0.0.1:5180/courtyard-restored.html';
for(const webgl of [false,true]){
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox',...(webgl?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--disable-webgl'])]});
  try{
    const page=await browser.newPage({viewport:{width:1538,height:954}}),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
    await page.goto(url);
    await page.waitForFunction(w=>w?window.__threeReady:window.__ready,webgl);
    assert.equal(await page.locator('#knowledge-hotspot').isVisible(),false);
    await page.mouse.click(20,100);
    assert.equal(await page.locator('#knowledge-hotspot').isVisible(),false);
    await page.mouse.click(20,100);
    assert.equal(await page.locator('#narration').isVisible(),false);
    assert.equal(await page.locator('#knowledge-hotspot').isVisible(),true);
    await page.screenshot({path:`tests/results/knowledge-hotspot-${webgl?'webgl':'css'}.png`});
    await page.locator('#knowledge-hotspot').click();
    assert.equal(await page.locator('#knowledge-modal').isVisible(),true);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'knowledge-close');
    await page.locator('#knowledge-image').evaluate(i=>i.decode());
    const image=await page.locator('#knowledge-image').boundingBox();
    assert(image.width<=1538*.9+1&&image.height<=954*.88+1);
    assert.equal(await page.locator('#knowledge-image').evaluate(i=>{
      const c=document.createElement('canvas');c.width=c.height=1;
      const g=c.getContext('2d');g.drawImage(i,0,0);return g.getImageData(0,0,1,1).data[3];
    }),0,'poster outer background remains transparent');
    await page.screenshot({path:`tests/results/knowledge-modal-${webgl?'webgl':'css'}.png`});
    const state=()=>page.evaluate(()=>{const s=window.__sceneDebug;return [s.zoom,s.targetZoom,s.x,s.y]});
    const frozen=await state();
    await page.mouse.move(1500,800);await page.mouse.wheel(0,300);await page.keyboard.press('+');
    await page.waitForTimeout(250);
    assert.deepEqual(await state(),frozen,'reading does not move or zoom the scene');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'knowledge-zoom');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'knowledge-close');
    await page.locator('#knowledge-zoom').click();
    assert.equal(await page.locator('#knowledge-zoom').getAttribute('aria-pressed'),'true');
    assert(await page.locator('#knowledge-viewport').evaluate(e=>e.scrollWidth>e.clientWidth));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#knowledge-modal').isVisible(),false);
    assert.equal(await page.evaluate(()=>document.getElementById('stage').inert),false);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'knowledge-hotspot');
    await page.mouse.wheel(0,300);await page.waitForFunction(()=>window.__sceneDebug.zoom>1.2);
    await page.keyboard.press('Home');await page.waitForFunction(()=>window.__sceneDebug.zoom<1.001);
    await page.locator('#knowledge-hotspot').click();
    await page.mouse.click(5,5);
    assert.equal(await page.locator('#knowledge-modal').isVisible(),false);
    await page.locator('#knowledge-hotspot').click();
    await page.locator('#knowledge-close').click();
    assert.equal(await page.locator('#knowledge-modal').isVisible(),false);
    assert.equal(await page.locator('#narration').isVisible(),false);
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[url]);
    console.log(`PASS ${webgl?'WebGL':'CSS'}: hotspot after two dialogues; transparent poster; dark modal; reading zoom; frozen scene; focus; Escape/backdrop/button close; scene resumes; offline.`);
    if(!webgl){
      const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
      await mobile.goto(url);await mobile.waitForFunction(()=>window.__ready);
      await mobile.touchscreen.tap(100,50);await mobile.touchscreen.tap(100,50);
      await mobile.locator('#knowledge-hotspot').tap();
      assert.equal(await mobile.locator('#knowledge-modal').isVisible(),true);
      const fit=await mobile.locator('#knowledge-image').boundingBox();assert(fit.width<=390*.9+1);
      await mobile.screenshot({path:'tests/results/knowledge-mobile.png'});
      await mobile.locator('#knowledge-zoom').tap();
      assert(await mobile.locator('#knowledge-viewport').evaluate(e=>e.scrollWidth>e.clientWidth&&e.scrollHeight>e.clientHeight));
      await mobile.locator('#knowledge-close').tap();
      assert.equal(await mobile.locator('#knowledge-modal').isVisible(),false);
      await mobile.close();
      console.log('PASS mobile: touch hotspot; poster fits; enlarged poster can pan; close returns to scene.');
    }
  }finally{await browser.close()}
}
