// Objects tool: "Random spots" placement (count + area, new layout every click) and torch / campfire fire objects
// (animated flame and glow, still hidden by fog). Run after `python3 app/build_dustmap.py`.
const {chromium}=require('playwright');const path=require('path');const {pathToFileURL}=require('url');
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:960}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));const fail=m=>{errs.push(m);console.log('FAIL',m)};
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(2000);
await p.click('#more');await p.click('#clear');await p.click('#clear');await p.keyboard.press('Escape');await p.waitForTimeout(400);
await p.keyboard.press('o');
const objs=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-v2')).objects);
const box=await (await p.$('#map')).boundingBox();const mid=[box.x+box.width/2,box.y+box.height/2];
const place=async(dx=0,dy=0)=>{await p.mouse.click(mid[0]+dx,mid[1]+dy);await p.waitForTimeout(200)};
const gp=async()=>{if(await p.isHidden('#gridpop'))await p.click('#gridbtn')};

// Random spots: 5 cacti in a 6-square-wide area
await p.click('#o-cactus');await gp();await p.click('#pl-scat');
if(!(await p.isHidden('#gridpick')))fail('grid picker should hide in Random spots');
await p.$eval('#scount',e=>{e.value=5;e.dispatchEvent(new Event('input'))});await p.$eval('#sarea',e=>{e.value=6;e.dispatchEvent(new Event('input'))});
if((await p.textContent('#gridbadge')).trim()!=='×5')fail('badge should read ×5');
await p.click('#gridbtn');   // close the popover
await place(-200);let a=await objs();if(a.length!==5)fail('expected 5 cacti, got '+a.length);
await place(200);let all=await objs();const b2=all.slice(5);if(b2.length!==5)fail('expected 5 more cacti');
const rel=l=>{const cx=l.reduce((s,o)=>s+o.x,0)/l.length,cy=l.reduce((s,o)=>s+o.y,0)/l.length;return l.map(o=>[Math.round(o.x-cx),Math.round(o.y-cy)].join()).sort().join(';')};
if(rel(a)===rel(b2))fail('two clicks gave the same layout');
const rad=6*16/2+2;a.forEach(o=>{const cx=a.reduce((s,q)=>s+q.x,0)/5;if(Math.abs(o.x-cx)>rad*2)fail('cactus outside the area')});
// grid mode still places a fixed grid
await gp();await p.click('#pl-grid');if(await p.isHidden('#gridpick'))fail('grid picker should be back');await p.click('#gridbtn');

// torches and a campfire
await p.click('#o-torch');await place(-60,120);await place(-20,120);await p.click('#o-campfire');await place(-40,150);
all=await objs();if(all.filter(o=>o.k==='torch').length!==2||all.filter(o=>o.k==='campfire').length!==1)fail('fire objects not placed');
await p.waitForTimeout(300);
const shot=async n=>{await p.screenshot({path:path.join(OUT,n)})};
// flame animates: two moments differ around the campfire
const fire=all.find(o=>o.k==='campfire');
const crop=async()=>p.evaluate(f=>{const c=document.getElementById('map');const g=c.getContext('2d');const d=window.devicePixelRatio||1;
  // map point -> canvas pixel not exposed; sample the whole canvas hash instead
  const im=g.getImageData(0,0,c.width,c.height).data;let h=0;for(let i=0;i<im.length;i+=97)h=(h*31+im[i])|0;return h},fire);
const h1=await crop();await p.waitForTimeout(330);const h2=await crop();if(h1===h2)fail('flames should animate');
await p.keyboard.press('Escape');await p.mouse.move(5,5);
await shot('fire_and_scatter.png');
// fog over the campfire hides flame and glow in the player preview
await p.evaluate(()=>{});
const sum=await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dustmap-v2'));return s.cols+'x'+s.rows});
await p.keyboard.press('f');await p.click('#fog-all').catch(()=>fail('no hide-all button'));await p.click('#fogprev');await p.waitForTimeout(300);
const f1=await crop();await p.waitForTimeout(330);const f2=await crop();if(f1!==f2)fail('nothing should flicker through full fog');
await shot('fire_under_fog.png');
console.log(errs.length?'FAILED\n'+errs.join('\n'):'scatter_fire_test: all checks passed');await b.close();process.exit(errs.length?1:0)})();
