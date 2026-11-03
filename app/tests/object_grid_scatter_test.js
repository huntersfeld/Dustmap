// Objects tool: 6 x 6 picker (drag fills a rectangle, click toggles one square) and the random-mix scatter.
// Run after `python3 app/build_dustmap.py`.
const {chromium}=require('playwright');const path=require('path');const {pathToFileURL}=require('url');
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:960}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));const fail=m=>{errs.push(m);console.log('FAIL',m)};
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(2000);
await p.uncheck('#anim');await p.click('#clear');await p.click('#clear');await p.waitForTimeout(500);
await p.keyboard.press('o');
const cell=async(c,r)=>{const h=await p.$(`#gridpick span[data-c="${c}"][data-r="${r}"]`);await h.scrollIntoViewIfNeeded();const bb=await h.boundingBox();return[bb.x+bb.width/2,bb.y+bb.height/2]};
const drag=async(a,z)=>{const [x1,y1]=await cell(...a),[x2,y2]=await cell(...z);await p.mouse.move(x1,y1);await p.mouse.down();await p.mouse.move(x2,y2,{steps:6});await p.mouse.up()};
const on=()=>p.$$eval('#gridpick span.on',els=>els.map(e=>e.dataset.c+','+e.dataset.r).sort());
const objs=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-v2')).objects);
const box=await (await p.$('#map')).boundingBox();const mid=[box.x+box.width/2,box.y+box.height/2];
const place=async(dx=0)=>{await p.evaluate(()=>window.scrollTo(0,0));await p.mouse.click(mid[0]+dx,mid[1]);await p.waitForTimeout(200)};

// drag fills a 3 x 2 block
await p.click('#o-barrels');await drag([2,2],[4,3]);
let s=await on();if(s.length!==6)fail('drag should fill 6 squares, got '+s);
if((await p.textContent('#gridlbl')).trim()!=='3 × 2')fail('label should read 3 × 2');
// a single click toggles one square on, another click toggles it off
await p.mouse.click(...await cell(6,6));s=await on();if(!s.includes('6,6')||s.length!==7)fail('click should add 6,6: '+s);
await p.mouse.click(...await cell(3,2));s=await on();if(s.includes('3,2')||s.length!==6)fail('click should remove 3,2: '+s);
if(!/6 squares/.test(await p.textContent('#gridlbl')))fail('pattern label should count squares');
await place();let o=await objs();if(o.length!==6)fail('expected 6 barrels placed, got '+o.length);
// Reset goes back to one
await p.click('#gridreset');if((await on()).length!==1)fail('reset should leave one square');

// random mix
await p.check('#omix');await p.click('#o-rock');await p.click('#o-cactus');await p.click('#o-crates');
const pressed=await p.$$eval('#objs .terr[aria-pressed="true"]',els=>els.map(e=>e.id));
if(!['o-barrels','o-rock','o-cactus','o-crates'].every(k=>pressed.includes(k)))fail('mix should hold barrels, rock, cactus, crates: '+pressed);
await drag([1,1],[6,6]);await p.fill('#odens','100');await p.dispatchEvent('#odens','input');
const before=(await objs()).length;await place(-200);o=await objs();const added=o.slice(before);
if(added.length!==36)fail('100% fill of 6 x 6 should add 36, got '+added.length);
const kinds=new Set(added.map(x=>x.k));if(kinds.size<3)fail('mix should use several kinds, got '+[...kinds]);
if([...kinds].some(k=>!['barrels','rock','cactus','crates'].includes(k)))fail('unexpected kind in mix '+[...kinds]);
// each click re-rolls, so a second scatter differs from the first
await place(200);const second=(await objs()).slice(before+36);
const sig=a=>a.map(x=>x.k).join();if(sig(second)===sig(added))fail('second scatter should re-roll');
// lower fill leaves gaps
await p.fill('#odens','30');await p.dispatchEvent('#odens','input');const b3=(await objs()).length;await place(0);const n3=(await objs()).length-b3;
if(n3<1||n3>=36)fail('30% fill should place some but not all, got '+n3);
await p.screenshot({path:path.join(OUT,'scatter.png'),clip:box});
await b.close();
console.log(errs.length?'FAIL: '+JSON.stringify(errs):'PASS: grid picker and random mix');if(errs.length)process.exit(1)})().catch(e=>{console.error(e);process.exit(1)});
