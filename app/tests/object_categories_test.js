// Objects tray categories: Decoration / Light sources / Interaction, like the Tokens tray's Party / Town / Enemies.
// Run after `python3 app/build_dustmap.py`.
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:860}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));const fail=m=>{errs.push(m);console.log('FAIL',m)};
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
await p.click('#more');await p.uncheck('#anim');await p.click('#clear');await p.click('#clear');await p.waitForTimeout(400);
const shown=()=>p.$$eval('#objs .sw',els=>els.filter(e=>e.offsetParent).map(e=>e.id.slice(2)));
const pressed=()=>p.$$eval('#objs .seg button',els=>els.filter(e=>e.getAttribute('aria-pressed')==='true').map(e=>e.id));
await p.keyboard.press('o');
const want={decor:['shack','saloon','barrels','cactus','cart','timber'],light:['torch','campfire','lantern','crystals'],interact:['sign','dynamite','door','stairsdown','landing','zone']};
const never={decor:['torch','lantern','sign','door','zone'],light:['saloon','sign','dynamite'],interact:['torch','barrels','saloon']};
for(const c of ['decor','light','interact']){await p.click('#oc-'+c);await p.waitForTimeout(100);const s=await shown();
  if(!want[c].every(k=>s.includes(k)))fail(c+' should show '+want[c]+': '+s);
  if(never[c].some(k=>s.includes(k)))fail(c+' should not show '+never[c]+': '+s);
  if((await pressed()).join()!=='oc-'+c)fail('only '+c+' tab pressed: '+await pressed());
  await p.screenshot({path:path.join(OUT,'objcat_'+c+'.png'),clip:{x:0,y:700,width:1280,height:160}})}
// switching to a tab picks its first object; number keys count within the tab
await p.click('#oc-light');if(await p.getAttribute('#o-torch','aria-pressed')!=='true')fail('Lights tab should pick the torch');
await p.keyboard.press('2');if(await p.getAttribute('#o-campfire','aria-pressed')!=='true')fail('2 in Lights should pick the campfire');
// placing works from a tab
const box=await (await p.$('#map')).boundingBox();await p.mouse.click(box.x+box.width/2,box.y+box.height/2);await p.waitForTimeout(150);
if(!(await p.evaluate(()=>window.__dustmap().st.objects)).some(o=>o.k==='campfire'))fail('campfire should place');
// a mix can span tabs
await p.click('#oc-decor');await p.click('#o-barrels');await p.click('#oc-light');await p.click('#o-torch',{modifiers:['Control']});
if(await p.isVisible('#o-barrels'))fail('Lights tab should stay open while mixing');
const mix=await p.$$eval('#objs .sw[aria-pressed="true"]',els=>els.map(e=>e.id));if(!(mix.includes('o-barrels')&&mix.includes('o-torch')))fail('mix should hold barrels and torch: '+mix);
console.log(JSON.stringify(errs));await b.close();process.exit(errs.length?1:0)})();
