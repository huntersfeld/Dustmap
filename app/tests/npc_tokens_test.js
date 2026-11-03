// NPC / enemy tokens: pick from the Tokens dropdown in the Objects tool, place one and a 2x2 group,
// select + delete one in Select, check they survive a reload. Run `python3 app/build_dustmap.py` first.
const {chromium}=require('playwright');const path=require('path');const {pathToFileURL}=require('url');
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');require('fs').mkdirSync(OUT,{recursive:true});
const ok=(c,m)=>{if(!c){console.log('FAIL: '+m);process.exit(1)}};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:960}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
await p.click('#clear');await p.click('#clear');
const tokens=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-v2')).tokens);
const n0=(await tokens()).length;
await p.keyboard.press('o');
await p.click('#tokdrop > summary');
const count=await p.$$eval('.tokbtn',els=>els.length);ok(count===79,'expected 79 token buttons, got '+count);
const rows=await p.$$eval('.tokrow .tn',els=>els.map(e=>e.textContent));ok(rows.includes('Bandit')&&rows.includes('Rattlesnake')&&rows[0]==='Cowboys','rows '+rows.slice(0,3));
// Bandit variant B
const s=await p.evaluate(()=>[...document.querySelectorAll('.tokbtn')].findIndex(b=>b.title==='Bandit (B)'));ok(s>3,'bandit B button');
await p.click(`#tk-${s}`);
const hint=await p.textContent('#hint');ok(/Bandit \(B\)/.test(hint),'hint shows token: '+hint);
const box=await (await p.$('#map')).boundingBox();
const z=await p.evaluate(()=>parseInt(document.getElementById('zlabel').textContent)/100);
const mapW=640*z,mapH=448*z,mx=box.x+(box.width-mapW)/2,my=box.y+(box.height-mapH)/2;const m=(x,y)=>[mx+x*z,my+y*z];
await p.evaluate(()=>window.scrollTo(0,0));
let [x,y]=m(203,183);await p.mouse.move(x,y);await p.waitForTimeout(100);await p.mouse.click(x,y);await p.waitForTimeout(150);
let t=await tokens();ok(t.length===n0+1,'one token placed');const last=t[t.length-1];
ok(last.s===s&&last.x===200&&last.y===184,'snapped to 8 px: '+JSON.stringify(last));
// 2x2 group of rattlesnakes (variant A), one square apart
const snake=await p.evaluate(()=>[...document.querySelectorAll('.tokbtn')].findIndex(b=>b.title==='Rattlesnake (A)'));
await p.click(`#tk-${snake}`);await (await p.$('#gridpick')).scrollIntoViewIfNeeded();
const cell=async(c,r)=>{const bb=await (await p.$(`#gridpick span[data-c="${c}"][data-r="${r}"]`)).boundingBox();return[bb.x+bb.width/2,bb.y+bb.height/2]};
{const [a1,a2]=await cell(1,1),[e1,e2]=await cell(2,2);await p.mouse.move(a1,a2);await p.mouse.down();await p.mouse.move(e1,e2,{steps:4});await p.mouse.up()}
await p.evaluate(()=>window.scrollTo(0,0));[x,y]=m(328,296);await p.mouse.move(x,y);await p.waitForTimeout(150);
await p.screenshot({path:path.join(OUT,'tok_ghost.png'),clip:{x:x-120,y:y-120,width:240,height:240}});
await p.mouse.click(x,y);await p.waitForTimeout(150);
t=await tokens();ok(t.length===n0+5,'2x2 group placed: '+t.length);
const grp=t.slice(-4);ok(grp.every(q=>q.s===snake),'all snakes');
const xs=[...new Set(grp.map(q=>q.x))].sort((a,b)=>a-b),ys=[...new Set(grp.map(q=>q.y))].sort((a,b)=>a-b);
ok(xs.length===2&&ys.length===2&&xs[1]-xs[0]===16&&ys[1]-ys[0]===16,'one square apart '+xs+' / '+ys);
await p.screenshot({path:path.join(OUT,'tok_placed.png'),clip:{x:x-160,y:y-200,width:320,height:280}});
// select the bandit and delete it
await p.keyboard.press('v');[x,y]=m(200,172);await p.mouse.click(x,y);await p.waitForTimeout(150);
ok(/Bandit \(B\) selected/.test(await p.textContent('#hint')),'bandit selected');
await p.keyboard.press('Delete');await p.waitForTimeout(150);
t=await tokens();ok(t.length===n0+4&&!t.some(q=>q.s===s),'bandit deleted');
await p.click('#undo');await p.waitForTimeout(150);t=await tokens();ok(t.length===n0+5,'undo brings it back');
// survives reload (map library validation keeps NPC sheet indices)
await p.reload();await p.waitForTimeout(1200);t=await tokens();ok(t.length===n0+5,'tokens kept after reload: '+t.length);
console.log(JSON.stringify(errs));await b.close();
console.log(errs.length?'FAIL: page errors':'PASS: NPC tokens place, group, select, delete and persist')})();
