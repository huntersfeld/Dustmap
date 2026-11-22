// Signs: the DM places a signpost, writes on it and picks a script; hovering shows the card;
// players read it unless it stands in fog, and see only the script unless the DM lets them read the translation.
// Run after `python3 app/build_dustmap.py`.
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:860}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));const fail=m=>{errs.push(m);console.log('FAIL',m)};
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
await p.click('#more');await p.uncheck('#anim');await p.click('#clear');await p.click('#clear');await p.waitForTimeout(400);
const box=await (await p.$('#map')).boundingBox();const mid=[box.x+box.width/2,box.y+box.height/2];
const objs=()=>p.evaluate(()=>window.__dustmap().st.objects);
// place: the editor opens straight away
await p.keyboard.press('o');await p.click('#o-sign');await p.mouse.click(mid[0],mid[1]);await p.waitForTimeout(200);
if(await p.isHidden('#signedit'))fail('placing a sign should open the editor');
await p.keyboard.type('Beware the mine. Gold inside!');await p.waitForTimeout(100);
let o=(await objs()).find(o=>o.k==='sign');if(!o||o.txt!=='Beware the mine. Gold inside!'||o.lang!=='common')fail('sign text should save: '+JSON.stringify(o));
// keys typed in the editor stay out of the editor's shortcuts (the "b" and "e" above did not switch tools)
if(await p.evaluate(()=>window.__dustmap().tool)!=='object')fail('typing in the sign should not switch tools');
await p.selectOption('#sglang','dwarvish');await p.click('#sgstyle button:nth-child(2)');await p.click('#sgdone');
o=(await objs()).find(o=>o.k==='sign');if(o.lang!=='dwarvish'||o.v!==1)fail('script and board should save: '+JSON.stringify(o));
if(await p.isVisible('#signedit'))fail('Done should close the editor');
// one undo takes the whole edit back to a blank sign
await p.click('#undo');o=(await objs()).find(o=>o.k==='sign');if(!o||o.txt)fail('undo should restore the blank sign: '+JSON.stringify(o));
await p.click('#undo');if((await objs()).some(o=>o.k==='sign'))fail('second undo should remove the sign');
// write it again from Select: double-click opens the editor
await p.keyboard.press('o');await p.click('#o-sign');await p.mouse.click(mid[0],mid[1]);await p.waitForTimeout(150);await p.keyboard.press('Escape');
await p.keyboard.press('v');await p.mouse.click(mid[0]+200,mid[1]+150);await p.waitForTimeout(100);
await p.mouse.dblclick(mid[0],mid[1]-2);await p.waitForTimeout(200);if(await p.isHidden('#signedit'))fail('double-click should open the editor');
await p.fill('#sgtext','The old mine lies east. Dragons sleep below.');await p.selectOption('#sglang','elvish');await p.click('#sgdone');
// hover shows the card with the script and, for the DM, the translation
await p.mouse.click(mid[0]+200,mid[1]+150);await p.keyboard.press('m');await p.mouse.move(mid[0],mid[1]-2);await p.waitForTimeout(200);
if(await p.isHidden('#signcard'))fail('hovering a sign should show its card');
if(!(await p.$('#sgplank canvas')))fail('an Elvish sign should be drawn in pixel glyphs');
if(!/Dragons sleep below/.test(await p.textContent('#sgtrn')))fail('the DM should see the translation');
await p.screenshot({path:path.join(OUT,'sign_card_dm.png'),clip:{x:mid[0]-220,y:mid[1]-220,width:440,height:300}});
await p.mouse.move(mid[0]+300,mid[1]+200);await p.waitForTimeout(150);if(await p.isVisible('#signcard'))fail('card should hide when the mouse leaves');
// every script renders and differs
for(const id of ['dwarvish','draconic','infernal','celestial','orc','common']){await p.keyboard.press('v');await p.mouse.dblclick(mid[0],mid[1]-2);await p.waitForTimeout(100);await p.selectOption('#sglang',id);await p.click('#sgdone');
  await p.keyboard.press('m');await p.mouse.move(mid[0],mid[1]-2);await p.waitForTimeout(120);await p.screenshot({path:path.join(OUT,`sign_${id}.png`),clip:{x:mid[0]-220,y:mid[1]-220,width:440,height:300}})}
// player view through fog preview: hidden sign shows nothing
await p.keyboard.press('f');await p.click('#fog-all');await p.click('#fogprev');await p.keyboard.press('m');await p.mouse.move(mid[0]+5,mid[1]+5);await p.mouse.move(mid[0],mid[1]-2);await p.waitForTimeout(150);
if(await p.isVisible('#signcard'))fail('a sign in fog should not show its card');
await p.click('#fogprev');
// saved maps keep the message
await p.reload();await p.waitForTimeout(1200);o=(await objs()).find(o=>o.k==='sign');if(!o||o.txt!=='The old mine lies east. Dragons sleep below.')fail('the sign should survive a reload: '+JSON.stringify(o));
// the tour map opens as a new map in the library, with its signs and the cave hidden
await p.click('#more');await p.click('#tour');await p.waitForTimeout(800);
const tour=await p.evaluate(()=>{const d=window.__dustmap();return{n:d.st.objects.filter(o=>o.k==='sign'&&o.txt).length,fog:(d.st.fog||'').includes('1'),title:document.title,fire:d.st.objects.some(o=>o.k==='campfire')&&d.st.objects.some(o=>o.k==='torch'),topics:['NEW MAPS','TORCHES AND CAMPFIRES','FOG OF WAR','TOKENS'].filter(h=>!d.st.objects.some(o=>o.k==='sign'&&(o.txt||'').startsWith(h))),langs:[...new Set(d.st.objects.filter(o=>o.k==='sign').map(o=>o.lang))]}});
if(!tour.fire||tour.topics.length)fail('tour map is missing newer features: '+JSON.stringify(tour));
if(tour.n<10||!tour.fog||!/Dustmap tour/.test(tour.title)||tour.langs.length<3)fail('tour map: '+JSON.stringify(tour));
const nmaps=await p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-library')).maps.length);if(nmaps!==2)fail('tour should be added as a second map, got '+nmaps);
await b.close();
console.log(errs.length?'FAIL: '+JSON.stringify(errs):'PASS: signs');if(errs.length)process.exit(1)})().catch(e=>{console.error(e);process.exit(1)});
