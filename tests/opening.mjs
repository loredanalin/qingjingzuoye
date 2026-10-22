import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const url=process.env.APP_URL||'http://127.0.0.1:5180/courtyard-restored.html';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-webgl']});
try{
  const page=await browser.newPage({viewport:{width:1672,height:941},reducedMotion:'reduce'}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
  await page.goto(url);await page.waitForFunction(()=>window.__ready);
  await page.locator('#opening-image').evaluate(i=>i.decode());
  assert.equal(await page.locator('#opening').isVisible(),true);
  assert.equal(await page.locator('#narration').isVisible(),false);
  assert.equal(await page.locator('#stage').evaluate(e=>e.inert),true);
  const art=await page.locator('#opening-image').boundingBox(),button=await page.locator('#start-game').boundingBox();
  assert(Math.abs(button.x+button.width/2-(art.x+art.width*.508))<2);
  assert(Math.abs(button.y+button.height/2-(art.y+art.height*.727))<2);
  await page.mouse.click(20,100);await page.mouse.wheel(0,300);await page.keyboard.press('+');
  assert.equal(await page.locator('#opening').isVisible(),true);
  assert.equal(await page.evaluate(()=>window.__sceneDebug.targetZoom),1,'opening inputs do not move courtyard');
  await page.screenshot({path:'tests/results/opening-desktop.png'});
  await page.locator('#start-game').click();
  assert.equal(await page.locator('#opening').isVisible(),false);
  assert.equal(await page.locator('#narration-speaker').textContent(),'旁白','start click does not also advance dialogue');
  assert.equal(await page.locator('#narration').isVisible(),true);
  assert.equal(await page.locator('#stage').evaluate(e=>e.inert),false);
  await page.mouse.click(20,100);assert.equal(await page.locator('#narration-speaker').textContent(),'白居易');
  await page.mouse.click(20,100);assert.equal(await page.locator('#narration').isVisible(),false);
  for(const id of ['#knowledge-hotspot','#column-knowledge-hotspot','#railing-knowledge-hotspot']){
    await page.locator(id).click();await page.locator('#knowledge-image').evaluate(i=>i.decode());await page.keyboard.press('Escape');
  }
  for(let i=0;i<3;i++){await page.mouse.wheel(0,300);await page.waitForTimeout(100);}
  await page.waitForFunction(()=>window.__departed);assert.equal(await page.locator('#departure').textContent(),'出行');
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[url]);
  console.log('PASS desktop: image button aligns; outside/scroll ignored; start preserves first narration; two dialogues, three posters and departure work offline.');

  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await mobile.goto(url);await mobile.waitForFunction(()=>window.__ready);
  await mobile.locator('#opening-image').evaluate(i=>i.decode());
  const m=await mobile.locator('#start-game').boundingBox();assert(m.x>=0&&m.x+m.width<=390&&m.height>=44);
  await mobile.screenshot({path:'tests/results/opening-mobile.png'});
  await mobile.locator('#start-game').tap();assert.equal(await mobile.locator('#narration-speaker').textContent(),'旁白');
  await mobile.touchscreen.tap(100,50);assert.equal(await mobile.locator('#narration-speaker').textContent(),'白居易');
  console.log('PASS mobile: complete artwork fits; button has touch target; tap enters narration without skipping.');

  const keyboard=await browser.newPage();await keyboard.goto(url);await keyboard.waitForFunction(()=>window.__ready);
  await keyboard.keyboard.press('Tab');assert.equal(await keyboard.evaluate(()=>document.activeElement.id),'start-game');
  await keyboard.keyboard.press('Enter');assert.equal(await keyboard.locator('#opening').isVisible(),false);
  assert.equal(await keyboard.locator('#narration-speaker').textContent(),'旁白');
  console.log('PASS keyboard: Tab and Enter start game without skipping narration.');
}finally{await browser.close()}
