import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';

// A solid diagnostic texture reveals an opening that accidentally cuts into
// the door trim or column. It retains the real sprite dimensions and motion.
const solid=spawnSync('python',['-c',"from PIL import Image;import io,base64; b=io.BytesIO();Image.new('RGBA',(733,1509),(255,0,255,255)).save(b,'PNG');print(base64.b64encode(b.getvalue()).decode())"],{encoding:'utf8'});
assert.equal(solid.status,0);
let html=await readFile('/workspace/courtyard-restored.html','utf8');
const sprite=/(<div class="plant" data-key="gap"[^>]*>\s*<img[^>]*src=")[^"]+/;
assert(sprite.test(html));
html=html.replace(sprite,(_,prefix)=>prefix+'data:image/png;base64,'+solid.stdout.trim());
for(const webgl of [false,true]){
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox',...(webgl?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--disable-webgl'])]});
 try{
  const page=await browser.newPage({viewport:{width:1538,height:954}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/courtyard-restored.html',route=>route.fulfill({body:html,contentType:'text/html'}));
  await page.goto('http://127.0.0.1:5180/courtyard-restored.html');
  await page.waitForFunction(w=>w?window.__threeReady:window.__ready,webgl);
    await page.locator('#start-game').click();
  await page.locator('#narration').evaluate(e=>e.style.visibility='hidden'); // Inspect scene pixels underneath the screen-space dialogue.
  async function check(label){
   const points=await page.evaluate(()=>[[884,400],[916,300],[916,500],[897,400]].map(([x,y])=>{
    const marker=document.createElement('i');Object.assign(marker.style,{position:'absolute',left:(x/1538*100)+'%',top:(y/954*100)+'%',width:'1px',height:'1px'});
    document.getElementById('stage').appendChild(marker);const r=marker.getBoundingClientRect();marker.remove();return [Math.round(r.x),Math.round(r.y)];
   }));
   const png=await page.screenshot({path:`tests/results/gap-${webgl?'webgl':'css'}-${label}.png`});
   const result=spawnSync('python',['-c',"from PIL import Image;import io,sys,json;im=Image.open(io.BytesIO(sys.stdin.buffer.read()));print(json.dumps([im.getpixel(tuple(p))[:3] for p in json.loads(sys.argv[1])]))",JSON.stringify(points)],{input:png});
   assert.equal(result.status,0,result.stderr.toString());
   const colors=JSON.parse(result.stdout);
   for(const [i,c] of colors.entries()){
    if(i<3)assert(c[2]<120&&c[0]>c[1],`${webgl} ${label}: architecture obscures gap tree at ${points[i]}: ${c}`);
    else assert(c[0]>180&&c[2]>150&&c[1]<100,`${webgl} ${label}: tree visible inside opening: ${c}`);
   }
  }
  await check('rest');
  await page.evaluate(()=>{for(let i=0;i<8;i++)dispatchEvent(new WheelEvent('wheel',{deltaY:300,cancelable:true}))});
  await page.waitForFunction(()=>window.__sceneDebug.zoom>2.399&&window.__sceneDebug.walkEnergy<.01);
  for(const [name,x,sign] of [['left',10,1],['right',1528,-1]]){
   await page.mouse.move(x,477);await page.waitForFunction(s=>window.__sceneDebug.x*s>55,sign);await check(name);
  }
  const motion=await page.evaluate(()=>window.__sceneDebug.motion.gap);
  assert(Math.abs(motion.shift)>.1&&motion.grow>1&&Math.abs(motion.sway)>0);
  assert.deepEqual(errors,[]);
  console.log(`PASS ${webgl?'WebGL':'CSS'}: door and column mask the moving gap tree at rest and maximum zoom with both mouse directions; depth motion remains active.`);
 }finally{await browser.close()}
}
