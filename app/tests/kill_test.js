// Kill: the DM selects an enemy token and kills it (falling over, or exploding). It comes off the map at once, the death plays (flash, blood spray,
// topple, fade), a pool of blood is left as an object once the body is down, and one undo brings the token back without
// the blood. Party characters can't be killed; "Leave blood" off kills without a pool. Run after `python3 app/build_dustmap.py`.
const {chromium}=require('playwright');const path=require('path');const {pathToFileURL}=require('url');
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:960}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));const fail=m=>{errs.push(m);console.log('FAIL',m)};
// sheet 0 is a Party cowboy, 44 a rattlesnake (Enemies), 8 a desperado (Townsfolk)
const map={v:3,cols:24,rows:16,seed:5,rag:4,base:0,ops:[],objects:[],tokens:[{s:0,x:104,y:136,o:0},{s:44,x:184,y:136,o:2},{s:8,x:264,y:136,o:5}],skip:[]};
await p.goto(PAGE);await p.evaluate(m=>{localStorage.clear();localStorage.setItem('dustmap-v2',JSON.stringify(m))},map);await p.reload();await p.waitForTimeout(1500);
const S=()=>p.evaluate(()=>window.__dustmap());
const scr=async(x,y)=>{const d=await S(),box=await (await p.$('#map')).boundingBox();return[box.x+(x-d.cam.x)*d.Z,box.y+(y-d.cam.y)*d.Z]};
const toks=async()=>(await S()).st.tokens.map(t=>t.s);
const blood=async()=>(await S()).st.objects.filter(o=>o.k==='blood');
await p.keyboard.press('v');
// a party token offers no Kill
await p.mouse.click(...await scr(104,124));await p.waitForTimeout(200);
if((await S()).sel?.type!=='token')fail('clicking the cowboy should select it');
if(await p.locator('#selbar button[aria-label="Kill"]').count())fail('a party token should not offer Kill');
await p.keyboard.press('k');await p.waitForTimeout(100);if((await toks()).length!==3)fail('K should not kill a party token');
// the rattlesnake does
await p.mouse.click(...await scr(184,124));await p.waitForTimeout(200);
if(!(await p.locator('#selbar button[aria-label="Kill"]').count()))fail('an enemy token should offer Kill');
if(!(await p.locator('#selbar button[aria-label="Leave blood: on"]').count()))fail('Leave blood should default to on');
await p.screenshot({path:path.join(OUT,'kill_selected.png')});
const h0=(await S()).hist;
await p.locator('#selbar button[aria-label="Kill"]').click();await p.waitForTimeout(60);
let s=await S();if(s.st.tokens.some(t=>t.s===44))fail('the rattlesnake should come off the map at once');
if(s.kills!==1)fail('the death should be playing');if(s.hist!==h0+1)fail('a kill should be one undo step');
await p.waitForTimeout(150);await p.screenshot({path:path.join(OUT,'kill_spray.png')});
await p.waitForTimeout(350);await p.screenshot({path:path.join(OUT,'kill_fall.png')});
if((await blood()).length)fail('the pool should not be an object until the body is down');
await p.waitForTimeout(700);
let bl=await blood();if(bl.length!==1)fail('a pool of blood should be left, got '+bl.length);
else if(Math.hypot(bl[0].x-184,bl[0].y-134)>8)fail('the pool should be at the rattlesnake\'s feet, got '+[bl[0].x,bl[0].y]);
await p.screenshot({path:path.join(OUT,'kill_down.png')});
await p.waitForTimeout(1600);if((await S()).kills!==0)fail('the death should be over');
await p.screenshot({path:path.join(OUT,'kill_after.png')});
// one undo: the rattlesnake is back and the blood is gone
await p.keyboard.press('Control+z');await p.waitForTimeout(300);
if(!(await toks()).includes(44)||(await blood()).length)fail('undo should bring the rattlesnake back without the blood');
// undo while it's still falling: no blood turns up afterwards
await p.mouse.click(...await scr(184,124));await p.waitForTimeout(200);await p.keyboard.press('k');await p.waitForTimeout(200);
await p.keyboard.press('Control+z');await p.waitForTimeout(1200);
if(!(await toks()).includes(44)||(await blood()).length)fail('undo mid-fall should leave the rattlesnake and no blood');
// Leave blood off: no pool, and the choice is remembered
await p.mouse.click(...await scr(264,124));await p.waitForTimeout(200);
await p.locator('#selbar button[aria-label="Leave blood: on"]').click();await p.waitForTimeout(100);
if(!(await p.locator('#selbar button[aria-label="Leave blood: off"]').count()))fail('the toggle should switch off');
await p.keyboard.press('k');await p.waitForTimeout(1400);
if((await toks()).includes(8))fail('the desperado should be dead');if((await blood()).length)fail('no blood with Leave blood off');
if(await p.evaluate(()=>localStorage.getItem('dustmap-killblood'))!=='0')fail('Leave blood off should be remembered');
await p.evaluate(()=>localStorage.setItem('dustmap-killblood','1'));
await p.keyboard.press('Control+z');await p.waitForTimeout(300);
// explode: the style button switches it, "next hit kills" carries the style, and the kill leaves gore
await p.mouse.click(...await scr(264,124));await p.waitForTimeout(200);
if(!(await p.locator('#selbar button[aria-label="Death: fall over"]').count()))fail('death style should default to fall over');
await p.locator('#selbar button[aria-label="Leave blood: off"]').click();await p.waitForTimeout(100);
await p.locator('#selbar button[aria-label="Next hit kills: off"]').click();await p.waitForTimeout(100);
if((await S()).st.tokens.find(t=>t.s===8).kl!=='f')fail('next hit kills should mark it (fall)');
await p.locator('#selbar button[aria-label="Death: fall over"]').click();await p.waitForTimeout(100);
if((await S()).st.tokens.find(t=>t.s===8).kl!=='x')fail('switching to explode should update the mark');
await p.screenshot({path:path.join(OUT,'kill_explode_selected.png')});
await p.locator('#selbar button[aria-label="Kill"]').click();await p.waitForTimeout(60);
{const d=await S();if(d.kills<1||d.st.tokens.some(t=>t.s===8))fail('the desperado should be exploding: kills '+d.kills+' toks '+JSON.stringify(d.st.tokens.map(t=>t.s)))}
await p.waitForTimeout(250);await p.screenshot({path:path.join(OUT,'kill_explode.png')});
await p.waitForTimeout(600);
const gore=(await S()).st.objects.filter(o=>o.k==='gore');if(gore.length!==1||(await blood()).length)fail('an explosion should leave gore, not a blood pool');
await p.waitForTimeout(3200);if((await S()).kills!==0)fail('the explosion should be over');
await p.keyboard.press('Control+z');await p.waitForTimeout(300);
if(!(await toks()).includes(8)||(await S()).st.objects.some(o=>o.k==='gore'))fail('undo should bring the desperado back without the gore');
console.log(errs.length?'FAILED\n'+errs.join('\n'):'kill_test: all checks passed');await b.close();process.exit(errs.length?1:0)})();
