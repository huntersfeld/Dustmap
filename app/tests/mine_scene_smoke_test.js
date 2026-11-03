const {chromium}=require('playwright');const path=require('path');const {pathToFileURL}=require('url');
// Repo-relative paths: the built page lives at app/dustmap.html (run `python3 app/build_dustmap.py` first);
// screenshots go to app/tests/output/ (git-ignored).
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');require('fs').mkdirSync(OUT,{recursive:true});const out=f=>path.join(OUT,f);

(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:960}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(2500);
await p.uncheck('#anim');
await p.click('#clear');await p.click('#clear');await p.waitForTimeout(800);
const box=await (await p.$('#map')).boundingBox();
const z=await p.evaluate(()=>parseInt(document.getElementById('zlabel').textContent)/100);
const mapW=640*z,mapH=448*z,mx=box.x+(box.width-mapW)/2,my=box.y+(box.height-mapH)/2;const m=(x,y)=>[mx+x*z,my+y*z];
const shape=async pts=>{for(const q of pts){const [a,c]=m(...q);await p.mouse.click(a,c);await p.waitForTimeout(330)}await p.keyboard.press('Enter');await p.waitForTimeout(400)};
await p.keyboard.press('d');await p.keyboard.press('8');await shape([[60,60],[400,50],[420,300],[80,320]]);           // stone floor
// cave walls are raised stone: Elevation tab, High cliff (key 4)
await p.click('#tab-height');await p.keyboard.press('4');await shape([[60,60],[400,50],[400,110],[260,100],[180,125],[60,110]]);   // cave wall band at top
await shape([[300,200],[360,190],[380,250],[330,270],[290,240]]);                                                        // rock pillar
// rail via brush
await p.click('#t-brush');await p.click('#tab-ground');await p.click('#p-g9');
let [a,c]=m(90,280);await p.mouse.move(a,c);await p.mouse.down();for(const q of [[150,250],[220,240],[260,200],[250,150]]){const [x,y]=m(...q);await p.mouse.move(x,y,{steps:8})}await p.mouse.up();await p.waitForTimeout(500);
// objects
await p.keyboard.press('o');
const place=async(k,x,y)=>{await p.click('#o-'+k);await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(100);const [q,r]=m(x,y);await p.mouse.click(q,r);await p.waitForTimeout(150)};
await place('lantern',120,160);await place('lantern',230,150);await place('cart',236,190);await place('crystals',360,140);await place('timber',150,128);await place('rubble',330,170);
// 4x2 crates grid
await p.click('#o-crates');await (await p.$('#gridpick')).scrollIntoViewIfNeeded();{const cell=async(c,r)=>{const bb=await (await p.$(`#gridpick span[data-c="${c}"][data-r="${r}"]`)).boundingBox();return[bb.x+bb.width/2,bb.y+bb.height/2]};
 const [s1,s2]=await cell(1,1),[e1,e2]=await cell(4,2);await p.mouse.move(s1,s2);await p.mouse.down();await p.mouse.move(e1,e2,{steps:6});await p.mouse.up()}   // drag-fill 4 x 2
await p.evaluate(()=>window.scrollTo(0,0));[a,c]=m(140,215);await p.mouse.click(a,c);await p.waitForTimeout(200);
// box-select the crates + rubble? select crates group by clicking one then save stamp
await p.keyboard.press('v');[a,c]=m(122,209);await p.mouse.click(a,c);await p.waitForTimeout(200);
const hint1=await p.textContent('#hint');console.log('HINT',hint1.slice(0,80));
await p.click('text=Save as stamp');await p.waitForTimeout(300);
[a,c]=m(330,295);await p.mouse.click(a,c);await p.waitForTimeout(400);
// token drag with marker (add a token? example tokens cleared? tokens stay) 
await p.keyboard.press('v');{const [q,r]=m(232,206);await p.mouse.move(q-0,r-0);}
await p.screenshot({path:out('m_full.png'),clip:{x:box.x,y:box.y,width:box.width,height:box.height}});
console.log('objs',await p.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('dustmap-v2')).objects.map(o=>[o.k,o.x,o.y]))));console.log('stamps',await p.evaluate(()=>localStorage.getItem('dustmap-stamps')));
// token drag marker: drag the wizard (example token at 184,366)
{const [q,r]=m(184,358);await p.mouse.move(q,r);await p.mouse.down();const [q2,r2]=m(262,331);await p.mouse.move(q2,r2,{steps:6});await p.waitForTimeout(150);
 await p.screenshot({path:out('m_drag.png'),clip:{x:q2-90,y:r2-90,width:180,height:180}});await p.mouse.up();await p.waitForTimeout(150);
 await p.screenshot({path:out('m_drop.png'),clip:{x:q2-90,y:r2-90,width:180,height:180}})}
console.log(JSON.stringify(errs));await b.close();
console.log(errs.length?'FAIL: page errors':'PASS: mine scene built without page errors');
if(errs.length)process.exit(1)})().catch(e=>{console.error(e);process.exit(1)});
