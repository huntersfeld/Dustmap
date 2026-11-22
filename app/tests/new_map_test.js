const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
// New map: header + button and N open the dialog; the chosen ground fills the whole map; size, ground choice remembered;
// ground can be changed later from the ⋯ menu and undone; partial redraws match a full redraw on a non-sand ground.
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});const out=f=>path.join(OUT,f);
const fail=m=>{throw new Error(m)};
const cur=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-v2')));
const lib=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-library')));
// average colour of the terrain canvas sampled at a few spots away from tokens
const tone=p=>p.evaluate(()=>{const c=document.createElement('canvas'),m=document.getElementById('map');c.width=m.width;c.height=m.height;
  const g=c.getContext('2d');g.drawImage(m,0,0);let r=0,gg=0,b=0,n=0;for(const[fx,fy]of[[.15,.2],[.85,.2],[.15,.85],[.85,.85],[.5,.15]]){
  const d=g.getImageData(Math.floor(m.width*fx),Math.floor(m.height*fy),6,6).data;for(let i=0;i<d.length;i+=4){r+=d[i];gg+=d[i+1];b+=d[i+2];n++}}return[r/n,gg/n,b/n].map(Math.round)});

(async()=>{const b=await chromium.launch();let code=0;
try{
const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
await p.keyboard.press('0');await p.waitForTimeout(200);

// header + button opens the dialog with every base ground
await p.click('#newbtn');await p.waitForTimeout(200);
if(!await p.isVisible('#newmodal'))fail('+ should open the new map dialog');
const names=await p.$$eval('#newbases .basesw',bs=>bs.map(b=>b.textContent));
if(names.join()!=='Sand,Scrub,Mesa,Water,Badlands,Stone')fail('unexpected ground list: '+names);
if(await p.getAttribute('#newbases .basesw:first-child','aria-checked')!=='true')fail('sand should be picked by default');
await p.screenshot({path:out('new_map_dialog.png')});
// Escape cancels without adding a map
await p.keyboard.press('Escape');if(await p.isVisible('#newmodal'))fail('Escape should close the dialog');
if((await lib(p)).maps.length!==1)fail('cancel should not add a map');

// N opens it; pick Stone, 30x20, type a name, Enter creates
const sand=await tone(p);
await p.keyboard.press('n');await p.waitForTimeout(200);if(!await p.isVisible('#newmodal'))fail('N should open the dialog');
await p.click('#newbases .basesw:has-text("Stone")');await p.selectOption('#newsize','30x20');
await p.fill('#newname','Deep mine');await p.press('#newname','Enter');await p.waitForTimeout(900);
if(await p.isVisible('#newmodal'))fail('dialog should close after creating');
let s=await cur(p),L=await lib(p);
if(s.base!==7||s.cols!==30||s.rows!==20||s.ops.length)fail('new map wrong: '+JSON.stringify({base:s.base,cols:s.cols,rows:s.rows,ops:s.ops.length}));
if(L.maps.length!==2||L.maps.find(m=>m.id===L.cur).name!=='Deep mine')fail('map not added with its name');
if(s.tokens.length!==4||s.tokens.some(t=>t.x<0||t.y<0||t.x>s.cols*16||t.y>s.rows*16))fail('party tokens should start inside the map');
const stone=await tone(p);await p.screenshot({path:out('new_map_stone.png')});
if(Math.abs(stone[0]-sand[0])+Math.abs(stone[1]-sand[1])+Math.abs(stone[2]-sand[2])<60)fail('stone ground looks like sand: '+stone+' vs '+sand);

// the last choice is remembered next time
await p.click('#newbtn');await p.waitForTimeout(200);
if(await p.getAttribute('#newbases .basesw:has-text("Stone")','aria-checked')!=='true')fail('last ground should be remembered');
if(await p.inputValue('#newsize')!=='30x20')fail('last size should be remembered');
await p.click('#newclose');

// change the ground from the ⋯ menu, then undo
await p.click('#more');await p.selectOption('#mbase','3');await p.waitForTimeout(700);
if((await cur(p)).base!==3)fail('menu should change the ground to water');
const water=await tone(p);await p.screenshot({path:out('new_map_water.png')});
if(!(water[2]>water[0]))fail('water ground should look blue: '+water);
await p.keyboard.press('Escape');await p.keyboard.press('Control+z');await p.waitForTimeout(700);
if((await cur(p)).base!==7)fail('undo should restore stone');
if(await p.inputValue('#mbase')!=='7')fail('menu should show the restored ground');

// paint a scrub stroke on stone: the partial redraw must match a full redraw
const box=await (await p.$('#map')).boundingBox();const c=[box.x+box.width/2,box.y+box.height/2];
await p.click('#t-paint').catch(()=>{});await p.keyboard.press('b');await p.keyboard.press('2');
await p.mouse.move(c[0]-80,c[1]);await p.mouse.down();for(let i=0;i<=10;i++)await p.mouse.move(c[0]-80+i*16,c[1]+Math.sin(i)*20);await p.mouse.up();await p.waitForTimeout(700);
if((await cur(p)).ops.length!==1)fail('stroke not painted');
await p.click('#more');await p.uncheck('#anim');await p.uncheck('#grid');await p.keyboard.press('Escape');await p.mouse.move(5,5);await p.waitForTimeout(400);
const sb=await (await p.$('#map')).boundingBox();const clip={x:sb.x,y:sb.y,width:sb.width,height:sb.height};
const shotRegion=await p.screenshot({path:out('new_map_region.png'),clip});
await p.evaluate(()=>document.getElementById('rag').dispatchEvent(new Event('input')));await p.waitForTimeout(1200);
const shotFull=await p.screenshot({path:out('new_map_full.png'),clip});
if(!shotRegion.equals(shotFull))fail('partial redraw differs from a full redraw on stone (see output/new_map_region.png vs new_map_full.png)');

// survives reload, and the base reaches libClean-ed saves
await p.reload();await p.waitForTimeout(1500);if((await cur(p)).base!==7)fail('ground should survive reload');
if(errs.length)fail('page errors: '+errs.join(' | '));
console.log('new map test passed');
}catch(e){console.error('FAIL:',e.message);code=1}finally{await b.close();process.exit(code)}})();
