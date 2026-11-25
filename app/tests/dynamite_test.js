// Dynamite: light a bundle and it blasts a crater (default 2 levels below the ground under it), throws rocks around the
// rim, sets off dynamite nearby, and one undo puts it all back. Run after `python3 app/build_dustmap.py`.
const {chromium}=require('playwright');const path=require('path');const {pathToFileURL}=require('url');
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:960}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));const fail=m=>{errs.push(m);console.log('FAIL',m)};
// a 30×20 sand map with a two-level cliff plateau on the right
const map={v:3,cols:30,rows:20,seed:9,rag:4,base:0,ops:[{kind:'poly',layer:'height',h:2,s:1,pts:[[300,60],[460,60],[460,260],[300,260]],sid:3}],
  objects:[{k:'dynamite',x:120,y:160,v:0},{k:'dynamite',x:380,y:160,v:0,br:1},{k:'dynamite',x:150,y:250,v:0},{k:'dynamite',x:182,y:262,v:0}],tokens:[],skip:[]};
await p.goto(PAGE);await p.evaluate(m=>{localStorage.clear();localStorage.setItem('dustmap-v2',JSON.stringify(m))},map);await p.reload();await p.waitForTimeout(1500);
const S=()=>p.evaluate(()=>window.__dustmap());
const scr=async(x,y)=>{const d=await S(),box=await (await p.$('#map')).boundingBox();return[box.x+(x-d.cam.x)*d.Z,box.y+(y-d.cam.y)*d.Z]};
const dyn=async()=>(await S()).st.objects.filter(o=>o.k==='dynamite');
if((await dyn()).length!==4)fail('map did not load with 4 dynamite');
await p.keyboard.press('v');
// select the first bundle: the selection bar offers Light fuse, blast width and depth
await p.mouse.click(...await scr(120,160));await p.waitForTimeout(200);
if(!(await p.locator('#selbar button[aria-label="Light fuse"]').count()))fail('no Light fuse button');
const depth=p.locator('#selbar button[aria-label^="Blast depth"]');if((await depth.textContent()).trim()!=='−2')fail('default depth should read −2');
await p.waitForTimeout(150);await p.screenshot({path:path.join(OUT,'dynamite_selected.png')});
await p.keyboard.press('Enter');await p.waitForTimeout(300);
if((await S()).fuses!==1)fail('fuse should be burning');
if(!(await dyn()).some(o=>o.x===120))fail('dynamite went off before the fuse burned down');
await p.waitForTimeout(1350);await p.screenshot({path:path.join(OUT,'dynamite_blast.png')});
await p.waitForTimeout(500);let s=(await S()).st;
let crater=s.ops.filter(o=>o.blast);
if(crater.length!==1||crater[0].h!==-2||crater[0].s!==1)fail('expected one crater 2 levels down, got '+JSON.stringify(crater.map(o=>[o.h,o.s])));
if(s.objects.some(o=>o.k==='dynamite'&&o.x===120))fail('the bundle should be gone');
if(!s.objects.some(o=>o.k==='rock'))fail('rocks should land around the crater');
await p.waitForTimeout(800);await p.screenshot({path:path.join(OUT,'dynamite_crater.png')});
// one undo brings it all back
await p.keyboard.press('Control+z');await p.waitForTimeout(400);s=(await S()).st;
if(s.ops.some(o=>o.blast)||!s.objects.some(o=>o.k==='dynamite'&&o.x===120)||s.objects.some(o=>o.k==='rock'))fail('undo should restore the bundle and the ground');
// on the plateau (level 2), a small blast takes it down to the ground (level 0)
await p.mouse.dblclick(...await scr(380,160));await p.waitForTimeout(2000);s=(await S()).st;crater=s.ops.filter(o=>o.blast);
if(crater.length!==1||crater[0].h!==0)fail('plateau blast should drop to level 0, got '+JSON.stringify(crater.map(o=>o.h)));
const xs=crater[0].pts.map(q=>q[0]);if(Math.max(...xs)-Math.min(...xs)>40)fail('a 1-square-radius blast should be about 2 squares across');
// blast depth 3 clamps at −3; and a chain: the bundle next to it goes off too
await p.mouse.click(...await scr(150,250));await p.waitForTimeout(200);await depth.click();await p.waitForTimeout(100);
if((await S()).st.objects.find(o=>o.x===150).bd!==3)fail('depth button should set 3');
await p.keyboard.press('Enter');await p.waitForTimeout(2600);s=(await S()).st;
if(s.objects.some(o=>o.k==='dynamite'&&o.y>200))fail('the chained bundle should have gone off too');
if(!s.objects.some(o=>o.k==='dynamite'&&o.x===120))fail('the bundle far away should not go off');
crater=s.ops.filter(o=>o.blast);if(crater.length!==3)fail('expected 3 craters after the chain, got '+crater.length+' '+JSON.stringify(crater.map(o=>o.h))+' dyn:'+JSON.stringify(s.objects.filter(o=>o.k==='dynamite').map(o=>[o.x,o.y])));
if(!crater.some(o=>o.h===-3))fail('a 3-deep blast on flat ground should reach −3');
if((await S()).blasts.length<1)fail('blast effects should be playing');
await p.waitForTimeout(2600);await p.screenshot({path:path.join(OUT,'dynamite_chain.png')});
// selecting a crater names it
await p.mouse.click(...await scr(150,250));await p.waitForTimeout(200);
if(!(await p.textContent('#hint')).includes('Crater'))fail('a selected crater should be called Crater: '+(await p.textContent('#hint')));
console.log(errs.length?'FAILED\n'+errs.join('\n'):'dynamite_test: all checks passed');await b.close();process.exit(errs.length?1:0)})();
