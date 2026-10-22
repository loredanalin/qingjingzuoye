"""Rebuild the video-confirmed compatibility edition as one offline HTML."""
import base64
import io
import json
import subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
W, H = 1538, 954


def inline(name, size=(1280, 900), quality=80):
    im = Image.open(ASSETS / f'{name}.png')
    im.thumbnail(size, Image.Resampling.LANCZOS)
    out = io.BytesIO()
    im.save(out, 'WEBP', quality=quality, method=4)
    return 'data:image/webp;base64,' + base64.b64encode(out.getvalue()).decode()


layout = [
    # Alpha-weighted X anchor, bottom support line, width, relative depth.
    ('gap-tree', .583, .690, .150, .04, 'gap'),
    ('rear-tree', .655, .490, .190, .10, 'rear'),
    ('near-tree', 1.055, .610, .200, .18, 'far-right'),
    ('near-tree', .728, .715, .270, .35, 'near'),
    ('flowers', .960, .715, .340, .42, 'flowers'),
]
sprites = {}
for name, *_ in layout:
    if name not in sprites:
        sprites[name] = inline(name, (680, 780), 80)
sprites['far-fence'] = inline('far-fence', (1000, 400), 85)
sprites['railing'] = inline('railing', (1120, 520), 86)


def node(name, cx, base, width, depth, key):
    a = json.loads((ASSETS / f'{name}.json').read_text())
    centroid, ground = a['centroidX'] / a['width'], a['groundY'] / a['height']
    style = (f'left:{(cx-centroid*width)*100:.5f}%;top:{base*100:.5f}%;width:{width*100:.5f}%;'
             f'aspect-ratio:{a["width"]}/{a["height"]};--ground:{ground*100:.5f}%;'
             f'transform-origin:{centroid*100:.5f}% {ground*100:.5f}%;')
    return (f'<div class="plant" data-key="{key}" data-depth="{depth}" data-x="{cx}" data-base="{base}" data-width="{width}" style="{style}">'
            f'<img alt="" draggable="false" src="{sprites[name]}"></div>')


plants = '\n'.join(node(*item) for item in layout)
distant = node('far-fence', .875, .656, .380, 0, 'far-fence')
railing = node('railing', .861, .748, .440, 0, 'railing')
reference = inline('reference', (1538, 954), 86)
clean = inline('clean', (1538, 954), 84)
column = 'data:image/png;base64,' + base64.b64encode((ASSETS / 'red-column.png').read_bytes()).decode()
dialogue_frame = 'data:image/svg+xml;base64,' + base64.b64encode((ASSETS / 'dialogue-frame.svg').read_bytes()).decode()
bundle = subprocess.check_output(['node', '--input-type=module', '-e',
    "import {buildSync} from 'esbuild'; const r=buildSync({entryPoints:['scripts/webgl.js'],bundle:true,format:'iife',write:false,minify:true,target:'es2019'});process.stdout.write(r.outputFiles[0].text)"], cwd=ROOT).decode()
html = '''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#bb9568"><link rel="icon" href="data:,"><title>庭院 · 录像恢复版</title>
<style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#bb9568;overscroll-behavior:none}
#stage{position:fixed;left:50%;top:50%;width:max(104vw,167.7vh);aspect-ratio:1538/954;isolation:isolate;pointer-events:none;
transform:translate(-50%,-50%) translate3d(var(--px,0px),var(--py,0px),0) perspective(1800px) rotateX(var(--pitch,0deg)) rotateZ(var(--roll,0deg)) scale(var(--zoom,1));
transform-origin:76% 45%;will-change:transform}
#room,#architecture,#garden,#fence,#distant,#column{position:absolute;inset:0;width:100%;height:100%;display:block}
#room{z-index:0}#garden{z-index:1}#architecture{z-index:5}#distant{z-index:3}#fence{z-index:4}#column{z-index:6}
.plant{position:absolute;transform:translateY(calc(0% - var(--ground))) translateX(var(--shift,0px)) rotateY(var(--sway,0deg)) rotateZ(var(--lean,0deg)) scale(var(--grow,1));backface-visibility:hidden}
.plant img{display:block;width:100%;height:100%;user-select:none}
#focus{position:absolute;left:76%;top:45%;width:0;height:0}
#webgl-scene{position:fixed;inset:0;width:100%;height:100%;z-index:5;opacity:0;pointer-events:none}body.render-3d #webgl-scene{opacity:1}body.render-3d #stage{visibility:hidden}
#paper{z-index:10;position:fixed;inset:0;pointer-events:none;opacity:.035;mix-blend-mode:multiply;
background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='128' height='128' filter='url(%23p)' opacity='.6'/%3E%3C/svg%3E");background-size:128px 128px}
@media(prefers-reduced-motion:reduce){#stage{will-change:auto}}
#narration{position:fixed;z-index:20;left:51.2%;bottom:max(.9vh,env(safe-area-inset-bottom));transform:translateX(-50%);
width:min(85vw,158.4vh);aspect-ratio:3.6;height:auto;container-type:inline-size;color:#775539;
font-family:"KaiTi","楷体","Kaiti SC","STKaiti","Noto Serif CJK SC","SimSun",serif;pointer-events:none}
#narration-frame{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 3px 5px #34221130)}
#narration-speaker{position:absolute;left:0;top:0;width:41.8%;height:25%;display:grid;place-items:center;
font-size:clamp(20px,2.73cqw,44px);font-weight:400;letter-spacing:.26em;text-indent:.26em;color:#f5e5b2;text-shadow:0 1px 1px #57281750}
#narration-text{position:absolute;left:6%;right:6%;top:51%;bottom:12%;margin:0;
font-size:clamp(16px,2.55cqw,42px);line-height:1.75;letter-spacing:.12em;overflow-wrap:anywhere;pointer-events:auto;user-select:text}
@media(max-width:700px){#narration{left:50%;width:calc(100vw - 20px);height:280px;aspect-ratio:auto;bottom:max(12px,env(safe-area-inset-bottom))}
#narration-speaker{font-size:23px;letter-spacing:.18em}#narration-text{left:7%;right:7%;top:34%;bottom:10%;display:grid;align-content:center;font-size:18px;line-height:1.8;letter-spacing:.04em}}
@media(max-width:700px) and (max-height:500px){#narration{height:auto;aspect-ratio:3.6;bottom:max(.9vh,env(safe-area-inset-bottom))}#narration-speaker{font-size:clamp(17px,2.73cqw,23px)}#narration-text{top:42%;bottom:10%;font-size:clamp(14px,2.55cqw,18px);line-height:1.7}}
</style></head><body>
<div id="stage"><i id="focus" aria-hidden="true"></i>
<svg id="room" viewBox="0 0 1538 954" preserveAspectRatio="none" aria-hidden="true"><defs>
<image id="reference-picture" width="1538" height="954" href="__REFERENCE__"/>
<image id="clean-picture" width="1538" height="954" href="__CLEAN__"/>
<filter id="soft-repair"><feGaussianBlur stdDeviation="7"/></filter>
<mask id="repair"><path fill="white" filter="url(#soft-repair)" d="M883 180H922V669H883Z M984 -40H1600V713H984Z M-40 878H74V1000H-40Z M1370 795H1600V1000H1250V938H1370Z"/></mask>
</defs><use href="#reference-picture"/><use href="#clean-picture" mask="url(#repair)"/></svg>
<div id="garden">__PLANTS__</div>
<svg id="architecture" viewBox="0 0 1538 954" preserveAspectRatio="none" aria-hidden="true"><defs>
<clipPath id="column-door"><path clip-rule="evenodd" d="M0 0H985L984 640L1003 675L1000 700H0Z M886 224H909V530L908 642L900 655H886Z"/></clipPath>
</defs><use href="#reference-picture" clip-path="url(#column-door)"/></svg>
<div id="distant">__DISTANT__</div>
<div id="fence">__RAILING__</div>
<svg id="column" viewBox="0 0 1538 954" preserveAspectRatio="none" aria-hidden="true"><defs>
<image id="column-picture" width="267" height="1493" href="__COLUMN__"/>
<clipPath id="column-silhouette"><path d="M916 0H985V640L1003 675L1000 700H896V675L900 655L908 642L909 530V224H916Z"/></clipPath>
<clipPath id="column-upper"><rect x="870" y="0" width="160" height="520"/></clipPath>
<clipPath id="column-gold"><rect x="870" y="520" width="160" height="134"/></clipPath>
<clipPath id="column-stone"><rect x="870" y="654" width="160" height="46"/></clipPath>
</defs><g clip-path="url(#column-silhouette)">
<g clip-path="url(#column-upper)"><use href="#column-picture" transform="translate(877 0) scale(0.531835206 0.514851485)"/></g>
<g clip-path="url(#column-gold)"><use href="#column-picture" transform="translate(877 144.055556) scale(0.531835206 0.372222222)"/></g>
<g clip-path="url(#column-stone)"><use href="#column-picture" transform="translate(877 124.420168) scale(0.531835206 0.386554622)"/></g>
</g></svg></div><div id="paper"></div>
<aside id="narration" aria-labelledby="narration-speaker">
<img id="narration-frame" src="__DIALOGUE_FRAME__" alt="" draggable="false" aria-hidden="true">
<span id="narration-speaker">旁白</span>
<p id="narration-text">晨光初透，长安渐醒。元和三年，白居易居于长安。新的一日，从庭院中的第一缕阳光开始。</p>
</aside>
<script>__BUNDLE__</script>
<script>
(function(){'use strict';
var stage=document.getElementById('stage'),plants=document.querySelectorAll('#garden .plant');
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)');
var mx=0,my=0,x=0,y=0,zoom=1,target=1,last=0,phase=0,energy=0,pitch=0;
var focus={x:.76,y:.45},minZoom=1,maxZoom=2.4;
window.addEventListener('pointermove',function(e){mx=Math.max(-1,Math.min(1,e.clientX/innerWidth*2-1));my=Math.max(-1,Math.min(1,e.clientY/innerHeight*2-1));},{passive:true});
document.documentElement.addEventListener('pointerleave',function(){mx=my=0;});
window.addEventListener('blur',function(){mx=my=0;});
window.addEventListener('wheel',function(e){e.preventDefault();var unit=e.deltaMode===1?16:e.deltaMode===2?innerHeight:1;
var delta=Math.max(-300,Math.min(300,e.deltaY*unit));target=Math.max(minZoom,Math.min(maxZoom,target*Math.exp(delta*.001)));},{passive:false});
window.addEventListener('keydown',function(e){if(e.key==='0'||e.key==='Home'){target=1;mx=my=0;}
else if(e.key==='+'||e.key==='=')target=Math.min(maxZoom,target*1.12);else if(e.key==='-')target=Math.max(minZoom,target/1.12);});
function tick(time){
var dt=last?Math.min((time-last)/1000,.1):.016;last=time;
var quiet=reduce&&reduce.matches,damp=1-Math.exp(-4.2*dt),before=zoom;
zoom+=(target-zoom)*(quiet?1:damp);var delta=zoom-before,walk=Math.max(0,Math.min(1,(zoom-1)/1.4));
phase+=Math.abs(delta)*23;var activity=quiet?0:Math.min(1,Math.abs(delta)/Math.max(.001,dt)*1.4);
energy+=(activity-energy)*(1-Math.exp(-7*dt));
var bob=quiet?0:Math.sin(phase*2)*1.6*energy,drift=quiet?0:Math.sin(phase)*.5*energy;
var range=20*(1+1.35*(zoom-1));x+=((quiet?0:-mx*range)-x)*damp;y+=((quiet?0:-my*10*(1+.6*(zoom-1)))-y)*damp;
pitch+=((quiet?0:-my*.32+bob*.055)-pitch)*damp;
stage.style.setProperty('--px',(x+drift).toFixed(3)+'px');stage.style.setProperty('--py',(y+bob).toFixed(3)+'px');
stage.style.setProperty('--zoom',zoom.toFixed(5));stage.style.setProperty('--pitch',pitch.toFixed(4)+'deg');
stage.style.setProperty('--roll',(quiet?0:Math.sin(phase)*.085*energy).toFixed(4)+'deg');
var motion={};var stageWidth=stage.offsetWidth;
for(var i=0;i<plants.length;i++){
var el=plants[i],depth=Number(el.getAttribute('data-depth')),key=el.getAttribute('data-key');
var shift=0,lean=0,grow=1,sway=0;
if(!quiet){var cx=Number(el.getAttribute('data-x'));
shift=(cx-focus.x)*stageWidth*walk*.125-mx*(3+walk*10)*(1-depth);
shift+=Math.sin(phase*.65+i*.9)*energy*(2.5+walk*2);
lean=Math.sin(phase*.9+i*.7)*.8*energy;grow=1+walk*(.035+depth*.025);
sway=(-x/range)*depth*.7*(1+.35*(zoom-1));
if(key==='gap'){shift*=.35;lean*=.4;grow=1+(grow-1)*.4;}
if(key==='rear'){shift*=.5;lean*=.45;grow=1+(grow-1)*.55;}
if(key==='flowers')lean*=.7;
}
el.style.setProperty('--shift',shift.toFixed(3)+'px');el.style.setProperty('--lean',lean.toFixed(4)+'deg');
el.style.setProperty('--grow',grow.toFixed(5));el.style.setProperty('--sway',sway.toFixed(4)+'deg');
motion[key]={shift:shift,lean:lean,grow:grow,sway:sway};
}
window.__ready=true;window.__sceneDebug={zoom:zoom,targetZoom:target,x:x,y:y,panRange:range,focus:focus,walkEnergy:energy,motion:motion,pixelX:x+drift,pixelY:y+bob,pitch:pitch,roll:quiet?0:Math.sin(phase)*.085*energy,offline:true,renderer:window.__threeReady?'three-perspective':'layered-compatible'};
if(window.__renderThree)window.__renderThree(window.__sceneDebug);
requestAnimationFrame(tick);
}
if(window.__renderThree)window.__renderThree(window.__sceneDebug);
requestAnimationFrame(tick);
})();
</script></body></html>'''
for token, value in [('__REFERENCE__', reference), ('__CLEAN__', clean), ('__COLUMN__', column), ('__DIALOGUE_FRAME__', dialogue_frame), ('__PLANTS__', plants), ('__RAILING__', railing), ('__DISTANT__', distant), ('__BUNDLE__', bundle)]:
    html = html.replace(token, value)
if remainders := [t for t in __import__('re').findall(r'__[A-Z_]+__', html) if t not in ('__THREE__', '__THREE_DEVTOOLS__')]:
    raise ValueError(remainders)
output = ROOT.parent / 'courtyard-restored.html'
output.write_text(html)
output.chmod(0o644)
(ROOT / 'index.html').write_text(html)
archive = ROOT.parent / 'courtyard-restored.zip'
with ZipFile(archive, 'w', ZIP_DEFLATED) as z:
    z.write(output, 'courtyard.html')
archive.chmod(0o644)
with ZipFile(archive) as z:
    assert z.testzip() is None and z.read('courtyard.html') == output.read_bytes()
print(f'Built {output}: {output.stat().st_size/1024:.0f} KiB; ZIP verified')
