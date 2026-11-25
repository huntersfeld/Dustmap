const {chromium}=require('playwright');const path=require('path');const {pathToFileURL}=require('url');
// Roads and mine rails drawn in shape mode (D) follow only the clicked segments: no closing edge back to the
// first point unless you click it, and a rail that doubles back over itself doesn't lay a second track.
// Run `python3 app/build_dustmap.py` first; screenshots go to app/tests/output/ (git-ignored).
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');require('fs').mkdirSync(OUT,{recursive:true});const out=f=>path.join(OUT,f);
const fails=[];const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fails.push(m)};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:960}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await p.goto(PAGE);await p.evaluate(()=>{localStorage.clear();localStorage.setItem('dustmap-toured','1')});await p.reload();await p.waitForTimeout(2000);
await p.evaluate(()=>{const t=document.querySelector('#tour,.tour');if(t)t.hidden=true});
await p.click('#more');if(await p.$('#anim'))await p.uncheck('#anim');
const reset=async()=>{await p.keyboard.press('Escape');if(await p.isHidden('#clear'))await p.click('#more');await p.click('#clear');await p.click('#clear');await p.keyboard.press('Escape');await p.waitForTimeout(500)};
await reset();await p.waitForTimeout(300);
const box=await (await p.$('#map')).boundingBox();
const z=await p.evaluate(()=>window.__dustmap().Z);
const [TW,TH]=await p.evaluate(()=>[window.__terrain().W,window.__terrain().H]),mapW=TW*z,mapH=TH*z,mx=box.x+(box.width-mapW)/2,my=box.y+(box.height-mapH)/2;const m=(x,y)=>[mx+x*z,my+y*z];
const clicks=async pts=>{for(const q of pts){const [a,c]=m(...q);await p.mouse.click(a,c);await p.waitForTimeout(330)}};
const shape=async(pts,enter=true)=>{await clicks(pts);if(enter)await p.keyboard.press('Enter');await p.waitForTimeout(500)};
// rail pixels (steel colour) in a box of the rendered terrain
const railPx=(x0,y0,x1,y1)=>p.evaluate(([x0,y0,x1,y1])=>{const d=window.__terrain().cv.getContext('2d').getImageData(x0,y0,x1-x0,y1-y0).data;let n=0;
  for(let i=0;i<d.length;i+=4)if(d[i]===168&&d[i+1]===168&&d[i+2]===174)n++;return n},[x0,y0,x1,y1]);
const lastOp=()=>p.evaluate(()=>{const o=window.__dustmap().st.ops;return JSON.parse(JSON.stringify(o[o.length-1]||null))});

// 1. right angle of mine rail: two legs, no hypotenuse
await p.keyboard.press('d');await p.click('#p-g9');
await shape([[60,60],[260,60],[260,200]]);
let op=await lastOp();ok(op&&op.kind==='stroke'&&op.t===9&&op.pts.length===3,'right-angle rail is an open path of 3 points ('+JSON.stringify(op&&{k:op.kind,n:op.pts.length})+')');
ok(await railPx(150,60,170,72)>0,'rail laid along the top leg');ok(await railPx(254,120,268,140)>0,'rail laid along the right leg');
ok(await railPx(140,120,180,150)===0,'no rail across the hypotenuse');
await p.screenshot({path:out('path_rail_angle.png'),clip:{x:mx,y:my,width:mapW,height:mapH}});

// 2. rail that goes out and comes back the same way: same track as one pass
await reset();await p.keyboard.press('d');await p.click('#p-g9');
await shape([[60,100],[300,100]]);const one=await railPx(0,80,320,120);
await reset();await p.keyboard.press('d');await p.click('#p-g9');
await shape([[60,100],[300,100],[60,100]]);const back=await railPx(0,80,320,120);
ok(one>0&&back<=one*1.1,`retraced rail isn't doubled (${back} steel px vs ${one} for one pass)`);

// 3. clicking the first point again closes the loop (and only then)
await reset();await p.keyboard.press('d');await p.click('#p-g9');
await shape([[60,60],[260,60],[260,200],[60,200],[60,60]],false);
op=await lastOp();ok(op&&op.kind==='stroke'&&op.pts.length===5&&op.pts[4][0]===op.pts[0][0]&&op.pts[4][1]===op.pts[0][1],'clicking the first point closes the rail loop');
ok(await railPx(54,120,68,140)>0,'closed loop lays the left side');ok(await railPx(140,110,180,150)===0,'loop interior stays empty');
await p.screenshot({path:out('path_rail_loop.png'),clip:{x:mx,y:my,width:mapW,height:mapH}});

// 4. road: open path, two points is enough, ground only along the drawn legs
await reset();await p.keyboard.press('d');await p.click('#p-g5');
await shape([[60,60],[260,60],[260,200]]);
op=await lastOp();ok(op&&op.kind==='stroke'&&op.t===5&&op.pts.length===3&&op.r>0,'right-angle road is an open path');
const road=await p.evaluate(()=>{const{L,W}=window.__terrain();return[L[200*W+160],L[60*W+160],L[130*W+260],L[130*W+160]]});
ok(road[1]===5&&road[2]===5&&road[3]!==5,'road ground follows the legs, not the inside ('+road+')');
await p.screenshot({path:out('path_road_angle.png'),clip:{x:mx,y:my,width:mapW,height:mapH}});
await reset();await p.keyboard.press('d');await p.click('#p-g5');await shape([[60,300],[300,300]]);
op=await lastOp();ok(op&&op.kind==='stroke'&&op.pts.length===2,'two clicks + Enter make a straight road');

// 5. other ground still makes filled shapes
await reset();await p.keyboard.press('d');await p.click('#p-g3');await shape([[60,60],[260,60],[260,200]]);
op=await lastOp();ok(op&&op.kind==='poly','water shape is still a filled polygon');

ok(!errs.length,'no page errors '+JSON.stringify(errs));await b.close();
console.log(fails.length?`FAIL: ${fails.length} check(s)`:'PASS: road and rail shapes follow the drawn path');if(fails.length)process.exit(1)})().catch(e=>{console.error(e);process.exit(1)});
