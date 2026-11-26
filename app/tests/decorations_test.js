// More decorations: clutter, dungeon and graveyard props and a key, in the Objects tray's Decor tab.
// Objects with looks (scroll rolled/unrolled, banner colours, cobweb corners...) change look from the right-click menu,
// and new ones of that kind are placed with the look picked last. Run after `python3 app/build_dustmap.py`.
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
const NEW=['papers','scroll','books','potions','sacks','table','bedroll','haybale','skulls','cobweb','mushrooms','stalagmites','banner','coffin','grave','key'];
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:860}});
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));const fail=m=>{errs.push(m);console.log('FAIL',m)};
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
await p.click('#more');await p.uncheck('#anim');await p.click('#clear');await p.click('#clear');await p.waitForTimeout(400);
await p.keyboard.press('o');await p.click('#oc-decor');
const shown=await p.$$eval('#objs .sw',els=>els.filter(e=>e.offsetParent).map(e=>e.id.slice(2)));
NEW.forEach(k=>{if(!shown.includes(k))fail('Decor tab should show '+k)});
await p.screenshot({path:path.join(OUT,'decor_tray.png'),clip:{x:0,y:640,width:1280,height:220}});
// place one of each, in every look, then draw them all
const box=await (await p.$('#map')).boundingBox();
await p.evaluate(ks=>{const s=window.__dustmap().st;ks.forEach((k,i)=>{for(let v=0;v<4;v++)s.objects.push({k,x:24+v*30,y:16+i*20,v})})},NEW);
await p.keyboard.press('v');await p.click('#more');await p.check('#anim');await p.click('#more');await p.waitForTimeout(300);
const n=await p.evaluate(()=>window.__dustmap().st.objects.length);if(n!==NEW.length*4)fail('expected '+NEW.length*4+' objects, got '+n);
// change a scroll's look from the right-click menu
await p.evaluate(()=>{const s=window.__dustmap().st;s.objects.length=0;s.objects.push({k:'scroll',x:160,y:112,v:4})});
await p.click('#more');await p.uncheck('#anim');await p.click('#more');await p.keyboard.press('0');await p.waitForTimeout(300);
const pt=await p.evaluate(()=>{const d=window.__dustmap();return[(160-d.cam.x)*d.Z,(112-d.cam.y)*d.Z]});
const cvb=await (await p.$('#map')).boundingBox();
await p.mouse.click(cvb.x+pt[0],cvb.y+pt[1],{button:'right'});await p.waitForTimeout(150);
const items=await p.$$eval('#qmenu button',els=>els.map(e=>e.textContent));
if(!items.includes('Scroll: Unrolled'))fail('right-click menu should offer “Scroll: Unrolled”: '+items);
if(items.includes('Scroll: Rolled'))fail('menu should not offer the look it already has: '+items);
await p.screenshot({path:path.join(OUT,'decor_look_menu.png'),clip:{x:cvb.x+pt[0]-120,y:cvb.y+pt[1]-80,width:420,height:300}});
await p.click('#qmenu button:has-text("Scroll: Unrolled")');await p.waitForTimeout(150);
const v1=await p.evaluate(()=>window.__dustmap().st.objects[0].v);if(v1%2!==1)fail('scroll should now be unrolled (odd v): '+v1);
// the next scroll placed takes the look picked last
await p.keyboard.press('o');await p.click('#o-scroll');await p.mouse.click(cvb.x+pt[0]+120,cvb.y+pt[1]);await p.waitForTimeout(150);
const placed=await p.evaluate(()=>window.__dustmap().st.objects.filter(o=>o.k==='scroll').map(o=>o.v%2));
if(placed.length!==2||placed[1]!==1)fail('new scroll should be unrolled: '+placed);
// undo puts the first scroll's look back
await p.keyboard.press('Control+z');await p.keyboard.press('Control+z');await p.waitForTimeout(150);
const v0=await p.evaluate(()=>window.__dustmap().st.objects.map(o=>o.v));if(v0.length!==1||v0[0]!==4)fail('undo should restore the rolled scroll: '+v0);
console.log(JSON.stringify(errs));await b.close();process.exit(errs.length?1:0)})();
