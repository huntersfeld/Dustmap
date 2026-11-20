// Objects tool: right-click (or R) turns the grid pattern / stamp a quarter turn; right-drag still pans.
// Run after `python3 app/build_dustmap.py`.
const {chromium}=require('playwright');const path=require('path');const {pathToFileURL}=require('url');
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:960}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));const fail=m=>{errs.push(m);console.log('FAIL',m)};
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(2000);
await p.uncheck('#anim');await p.click('#clear');await p.click('#clear');await p.waitForTimeout(500);
await p.keyboard.press('o');
const cell=async(c,r)=>{const h=await p.$(`#gridpick span[data-c="${c}"][data-r="${r}"]`);await h.scrollIntoViewIfNeeded();const bb=await h.boundingBox();return[bb.x+bb.width/2,bb.y+bb.height/2]};
const drag=async(a,z)=>{const [x1,y1]=await cell(...a),[x2,y2]=await cell(...z);await p.mouse.move(x1,y1);await p.mouse.down();await p.mouse.move(x2,y2,{steps:6});await p.mouse.up()};
const on=()=>p.$$eval('#gridpick span.on',els=>els.map(e=>e.dataset.c+','+e.dataset.r).sort().join(' '));
const objs=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-v2')).objects);
const box=await (await p.$('#map')).boundingBox();const mid=[box.x+box.width/2,box.y+box.height/2];
const rclick=async()=>{await p.evaluate(()=>window.scrollTo(0,0));await p.mouse.click(mid[0],mid[1],{button:'right'});await p.waitForTimeout(100)};

// 4 x 1 row of barrels turns into a 1 x 4 column
await p.click('#o-barrels');await drag([1,1],[4,1]);
if((await on())!=='1,1 2,1 3,1 4,1')fail('setup row: '+await on());
await rclick();
if((await on())!=='1,1 1,2 1,3 1,4')fail('right-click should turn the row into a column: '+await on());
if((await p.textContent('#gridlbl')).trim()!=='1 × 4')fail('label should read 1 × 4');
// an L shape turns clockwise each time and comes back after four turns
await p.click('#gridreset');await p.mouse.click(...await cell(1,2));await p.mouse.click(...await cell(1,3));await p.mouse.click(...await cell(2,3));
const L=await on();if(L!=='1,1 1,2 1,3 2,3')fail('setup L: '+L);
await rclick();if((await on())!=='1,1 1,2 2,1 3,1')fail('L after one turn: '+await on());
await p.evaluate(()=>window.scrollTo(0,0));await p.mouse.move(mid[0],mid[1]);await p.keyboard.press('r');if((await on())!=='1,1 2,1 2,2 2,3')fail('R key should also turn: '+await on());
await rclick();await rclick();if((await on())!==L)fail('four turns should return the L: '+await on());
// right-drag pans and does not turn
const pat=await on();await p.mouse.move(mid[0],mid[1]);await p.keyboard.press('=');await p.keyboard.press('=');await p.waitForTimeout(200);
const camA=await p.evaluate(()=>window.__dustmap().cam);
await p.mouse.move(mid[0],mid[1]);await p.mouse.down({button:'right'});await p.mouse.move(mid[0]-120,mid[1]-80,{steps:8});await p.mouse.up({button:'right'});
const camB=await p.evaluate(()=>window.__dustmap().cam);
if((await on())!==pat)fail('right-drag should not turn the pattern');
if(camA.x===camB.x&&camA.y===camB.y)fail('right-drag should still pan');
await p.keyboard.press('0');await p.waitForTimeout(200);
// placed objects follow the turned layout (column: same x, different y)
await p.click('#gridreset');await drag([1,1],[3,1]);await rclick();
const n0=(await objs()).length;await p.evaluate(()=>window.scrollTo(0,0));await p.mouse.click(mid[0],mid[1]);await p.waitForTimeout(200);
const col=(await objs()).slice(n0);if(col.length!==3||new Set(col.map(o=>o.x)).size!==1||new Set(col.map(o=>o.y)).size!==3)fail('turned row should place a column: '+JSON.stringify(col));
// stamps turn too: save that column as a stamp, one turn makes it a row
await p.keyboard.press('v');await p.evaluate(()=>window.scrollTo(0,0));await p.mouse.click(mid[0],mid[1]);await p.waitForTimeout(200);
await p.click('text=Save as stamp');await p.waitForTimeout(300);
await rclick();if(!/90°/.test(await p.textContent('#gridlbl')))fail('stamp label should show 90°: '+await p.textContent('#gridlbl'));
const m0=(await objs()).length;await p.evaluate(()=>window.scrollTo(0,0));await p.mouse.click(mid[0]-150,mid[1]);await p.waitForTimeout(200);
const sp=(await objs()).slice(m0);if(sp.length!==3||new Set(sp.map(o=>o.y)).size!==1||new Set(sp.map(o=>o.x)).size!==3)fail('turned stamp should be a row: '+JSON.stringify(sp));
await b.close();
console.log(errs.length?'FAIL: '+JSON.stringify(errs):'PASS: right-click rotation');if(errs.length)process.exit(1)})().catch(e=>{console.error(e);process.exit(1)});
