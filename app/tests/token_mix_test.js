// Tokens tool: Ctrl/Cmd-click several tokens to mix them, then click the map to scatter one of each on random squares.
// The grid picker sets how many land; "Scatter randomly" works for a single token too; each placement re-rolls.
// Objects: Ctrl-click also starts a random mix. Run `python3 app/build_dustmap.py` first.
const {chromium}=require('playwright');const path=require('path');const {pathToFileURL}=require('url');
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');require('fs').mkdirSync(OUT,{recursive:true});
const ok=(c,m)=>{if(!c){console.log('FAIL: '+m);process.exit(1)}};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:960}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
await p.click('#more');await p.click('#clear');await p.click('#clear');
const S=()=>p.evaluate(()=>window.__dustmap());
const tokens=async()=>(await S()).st.tokens;
const scr=async(x,y)=>{const d=await S(),box=await (await p.$('#map')).boundingBox();return[box.x+(x-d.cam.x)*d.Z,box.y+(y-d.cam.y)*d.Z]};
const place=async(x,y)=>{const a=await scr(x,y);await p.mouse.move(a[0],a[1]);await p.waitForTimeout(120);await p.mouse.click(a[0],a[1]);await p.waitForTimeout(150)};
await p.keyboard.press('t');
// Ctrl-click three party cowboys
const party=await p.$$eval('#toks .sw',els=>els.map(e=>e.id));ok(party.length===4,'4 party tokens');
await p.click('#'+party[0]);await p.click('#'+party[1],{modifiers:['Control']});await p.click('#'+party[2],{modifiers:['Meta']});
const pressed=await p.$$eval('#toks .sw',els=>els.filter(e=>e.getAttribute('aria-pressed')==='true').length);ok(pressed===3,'three picked: '+pressed);
ok(/3 tokens/.test(await p.textContent('#hint')),'hint shows the mix: '+await p.textContent('#hint'));
// Ctrl-click one again removes it
await p.click('#'+party[2],{modifiers:['Control']});ok(await p.getAttribute('#'+party[2],'aria-pressed')==='false','ctrl-click removes');
await p.click('#'+party[2],{modifiers:['Control']});
const n0=(await tokens()).length;
await place(200,200);let t=await tokens();ok(t.length===n0+3,'one of each placed: '+(t.length-n0));
let a=t.slice(-3);const sheets=a.map(q=>q.s).sort().join();ok(sheets==='0,1,2','kinds '+sheets);
const sq=q=>Math.floor(q.x/16)+','+Math.floor(q.y/16);ok(new Set(a.map(sq)).size===3,'on different squares');
ok(a.every(q=>Math.abs(q.x-200)<=48&&Math.abs(q.y-200)<=48),'near the cursor '+JSON.stringify(a));
await p.screenshot({path:path.join(OUT,'tok_mix_scatter.png'),clip:{...(await scr(200,200)).reduce((o,v,i)=>({...o,[i?'y':'x']:v-150}),{}),width:300,height:300}});
// the same spot again lands differently (re-rolled)
await place(200,200);t=await tokens();const b2=t.slice(-3);ok(JSON.stringify(b2.map(q=>[q.s,q.x,q.y]))!==JSON.stringify(a.map(q=>[q.s,q.x,q.y])),'re-rolled after placing');
// the grid picker sets how many: 2x3 = 6 tokens drawn from the mix
await p.click('#gridbtn');ok(await p.isChecked('#omix'),'scatter is on while mixing');ok((await p.textContent('#omixlbl'))==='Scatter randomly','label');
const cell=async(c,r)=>{const bb=await (await p.$(`#gridpick span[data-c="${c}"][data-r="${r}"]`)).boundingBox();return[bb.x+bb.width/2,bb.y+bb.height/2]};
{const [a1,a2]=await cell(1,1),[e1,e2]=await cell(2,3);await p.mouse.move(a1,a2);await p.mouse.down();await p.mouse.move(e1,e2,{steps:4});await p.mouse.up()}
ok(/6 tokens/.test(await p.textContent('#mixlbl')),'mix label '+await p.textContent('#mixlbl'));
await place(400,240);t=await tokens();const c6=t.slice(-6);ok(t.length===n0+12,'six placed');ok(c6.every(q=>[0,1,2].includes(q.s)),'all from the mix');
ok(new Set(c6.map(q=>q.s)).size===3,'each kind appears');ok(new Set(c6.map(sq)).size===6,'six different squares');
// a plain click goes back to one token; scatter can be switched on for it
await p.keyboard.press('Escape');await p.click('#'+party[3]);ok(!/Mix/.test(await p.textContent('#hint')),'plain click ends the mix');
await p.click('#gridbtn');ok(!(await p.isChecked('#omix')),'scatter off for one token');
await place(300,120);t=await tokens();let g=t.slice(-6);ok(t.length===n0+18&&g.every(q=>q.s===3),'regular 2x3 block');
ok(new Set(g.map(q=>q.x)).size===2&&new Set(g.map(q=>q.y)).size===3,'block is a grid');
await p.click('#gridbtn');await p.check('#omix');
await place(520,120);t=await tokens();g=t.slice(-6);ok(t.length===n0+24&&g.every(q=>q.s===3),'six scattered');
ok(!(new Set(g.map(q=>q.x)).size===2&&new Set(g.map(q=>q.y)).size===3),'scattered, not a grid');
// spacing: the gap slider sets how many empty squares sit between tokens, evenly, every time
const gap=async v=>{await p.click('#gridbtn');await p.$eval('#tgap',(e,v)=>{e.value=v;e.dispatchEvent(new Event('input'))},v);await p.keyboard.press('Escape')};
await p.click('#gridbtn');await p.uncheck('#omix');await p.keyboard.press('Escape');
await gap(2);ok((await p.textContent('#tgaplbl'))==='2 squares between','gap label '+await p.textContent('#tgaplbl'));
await place(300,300);t=await tokens();g=t.slice(-6);
{const xs=[...new Set(g.map(q=>q.x))].sort((a,b)=>a-b),ys=[...new Set(g.map(q=>q.y))].sort((a,b)=>a-b);
 ok(xs.length===2&&ys.length===3&&xs[1]-xs[0]===48&&ys[1]-ys[0]===48&&ys[2]-ys[1]===48,'2x3 block three squares apart '+xs+' / '+ys)}
const rel=a=>JSON.stringify(a.map(q=>[q.x-a[0].x,q.y-a[0].y])),g1=rel(g);await place(400,300);t=await tokens();
ok(rel(t.slice(-6))===g1,'same layout every click');
await gap(0);await place(160,60);t=await tokens();g=t.slice(-6);
{const xs=[...new Set(g.map(q=>q.x))].sort((a,b)=>a-b);ok(xs[1]-xs[0]===16,'side by side at 0: '+xs)}
// scattered with a gap: random spots, but never closer than the gap allows and always on the spaced lattice
await gap(2);await p.click('#gridbtn');await p.check('#omix');await p.keyboard.press('Escape');
for(let k=0;k<3;k++){await place(600,300);t=await tokens();g=t.slice(-6);
  for(let i=0;i<6;i++)for(let j=i+1;j<6;j++){const dx=Math.abs(g[i].x-g[j].x),dy=Math.abs(g[i].y-g[j].y);
    ok(dx%48===0&&dy%48===0&&Math.max(dx,dy)>=48,'scattered tokens keep the gap '+JSON.stringify(g))}}
// a mix with Scatter randomly off: one of each, in a row, evenly spaced
await p.keyboard.press('Escape');await p.click('#'+party[0]);await p.click('#'+party[1],{modifiers:['Control']});await p.click('#'+party[2],{modifiers:['Control']});
await p.click('#gridbtn');ok(await p.isChecked('#omix'),'a new mix starts scattered');
await p.click('#gridreset');await p.uncheck('#omix');ok(/3 in the mix/.test(await p.textContent('#mixlbl')),'mix kept with scatter off');await p.keyboard.press('Escape');
await place(160,140);t=await tokens();g=t.slice(-3);
ok(g.map(q=>q.s).join()==='0,1,2'&&g[1].x-g[0].x===48&&g[2].x-g[1].x===48&&new Set(g.map(q=>q.y)).size===1,'mix in an even row '+JSON.stringify(g));
await p.screenshot({path:path.join(OUT,'tok_gap.png')});
// objects: Ctrl-click turns on the random mix
await p.keyboard.press('Escape');await p.keyboard.press('o');const ob=await p.$$eval('#objs .sw',els=>els.map(e=>e.id));
await p.click('#'+CSS_escape(ob[2]));await p.click('#'+CSS_escape(ob[3]),{modifiers:['Control']});
ok(await p.evaluate(()=>document.getElementById('omix').checked),'object mix switched on');
const op=await p.$$eval('#objs .sw',els=>els.filter(e=>e.getAttribute('aria-pressed')==='true').map(e=>e.id));ok(op.length===2&&op.includes(ob[2])&&op.includes(ob[3]),'two objects in the mix '+op);
console.log(JSON.stringify(errs));await b.close();
console.log(errs.length?'FAIL: page errors':'PASS: token mix scatters, grid count, re-roll, single-token scatter, token gap, even mix, object Ctrl-click mix')})();
function CSS_escape(s){return s.replace(/([:.])/g,'\\$1')}
