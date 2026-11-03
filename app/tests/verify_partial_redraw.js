const {chromium}=require('playwright');const path=require('path');const {pathToFileURL}=require('url');
// Repo-relative paths: the built page lives at app/dustmap.html (run `python3 app/build_dustmap.py` first);
// screenshots go to app/tests/output/ (git-ignored).
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');require('fs').mkdirSync(OUT,{recursive:true});const out=f=>path.join(OUT,f);
const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:960}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(2500);
await p.uncheck('#anim');await p.uncheck('#grid');
await p.evaluate(()=>{window.__lt=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(Math.round(e.duration)))).observe({type:'longtask',buffered:false})});
const box=await (await p.$('#map')).boundingBox();
const z=await p.evaluate(()=>parseInt(document.getElementById('zlabel').textContent)/100);
const r=box;const mapW=640*z,mapH=448*z,mx=r.x+(r.width-mapW)/2,my=r.y+(r.height-mapH)/2;const m=(x,y)=>[mx+x*z,my+y*z];
// brush scrub loop with a gap in the middle, crossing sand
await p.keyboard.press('b');await p.keyboard.press('2');
let pts=[[300,120],[340,110],[370,130],[365,165],[330,175],[300,160],[298,125]];
let [a,c]=m(...pts[0]);await p.mouse.move(a,c);await p.mouse.down();for(const q of pts.slice(1)){const [x,y]=m(...q);await p.mouse.move(x,y,{steps:6})}await p.mouse.up();
await p.waitForTimeout(800);
// sculpt a cliff
await p.keyboard.press('e');[a,c]=m(100,140);await p.mouse.move(a,c);await p.mouse.down();await p.waitForTimeout(500);await p.mouse.move(a,c-60,{steps:5});await p.mouse.up();await p.waitForTimeout(800);
const lt=await p.evaluate(()=>window.__lt);console.log('long tasks during edits (ms):',JSON.stringify(lt));
const shotRegion=await p.screenshot({path:out('p1_region.png'),clip:{x:box.x,y:box.y,width:box.width,height:box.height}});
// force full redraw with identical state
await p.evaluate(()=>{const r=document.getElementById('rag');r.dispatchEvent(new Event('input'))});await p.waitForTimeout(1200);
const shotFull=await p.screenshot({path:out('p1_full.png'),clip:{x:box.x,y:box.y,width:box.width,height:box.height}});
console.log(JSON.stringify(errs));await b.close();
// Same encoder, same pixels => same PNG bytes. Any difference means the partial redraw drifted from a full redraw.
const same=shotRegion.equals(shotFull);
console.log(same?'PASS: partial redraw matches full redraw':'FAIL: partial redraw differs from full redraw (compare output/p1_region.png and output/p1_full.png)');
if(!same||errs.length)process.exit(1)})().catch(e=>{console.error(e);process.exit(1)});
