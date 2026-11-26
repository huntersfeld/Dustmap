// Trigger zones: the DM places an invisible zone, links dynamite, a torch and a door to it, and paints fog over a room
// beside it. A party token walking through the zone reveals that room (and only it), lights the torch, locks the door,
// lights the fuse and shows the message; a once-only zone is then spent. An "Ask me first" zone that goes off every time
// waits for Fire / Skip. Zones never reach the map image.
// Run after `python3 app/build_dustmap.py`.
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
const fail=m=>{throw new Error(m)};
(async()=>{const b=await chromium.launch();let code=0;
try{const ctx=await b.newContext({viewport:{width:1280,height:860}});await ctx.addInitScript('window.__starterExample=true');const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
await p.click('#more');await p.uncheck('#anim');await p.keyboard.press('Escape');
const S=()=>p.evaluate(()=>window.__dustmap());
const scr=async(x,y)=>{const d=await S(),box=await (await p.$('#map')).boundingBox();return[box.x+(x-d.cam.x)*d.Z,box.y+(y-d.cam.y)*d.Z]};
const clickMap=async(x,y)=>{const q=await scr(x,y);await p.mouse.click(...q);await p.waitForTimeout(150)};
const dragMap=async(from,to,n=12)=>{const a=await scr(...from),c=await scr(...to);await p.mouse.move(...a);await p.mouse.down();
  for(let k=1;k<=n;k++){await p.mouse.move(a[0]+(c[0]-a[0])*k/n,a[1]+(c[1]-a[1])*k/n);await p.waitForTimeout(20)}await p.mouse.up();await p.waitForTimeout(300)};
const zones=st=>st.objects.filter(o=>o.k==='zone');

// a fresh 20 x 14 map with a party token, dynamite, a torch and a door
await p.keyboard.press('n');await p.waitForTimeout(200);await p.selectOption('#newsize','20x14');await p.fill('#newname','Trap room');await p.press('#newname','Enter');await p.waitForTimeout(900);
await p.evaluate(()=>{window.__dustmap().st.tokens=[{s:0,x:24,y:104,o:0}]});
await p.keyboard.press('o');await p.click('#oc-interact');await p.click('#o-dynamite');await clickMap(232,200);
await p.click('#oc-light');await p.click('#o-torch');await clickMap(168,40);
await p.click('#oc-interact');await p.click('#o-door');await clickMap(296,40);await p.click('#ptdone');
// put the torch out from the selection bar
await p.keyboard.press('v');await clickMap(168,40);await p.click('#selbar [aria-label="Put it out"]');
let st=(await S()).st;if(!st.objects.find(o=>o.k==='torch').off)fail('Put it out should mark the torch off');
if((await S()).litFires!==0)fail('an unlit torch gives no light');

// place a zone: it snaps to squares and opens its editor
await p.keyboard.press('o');await p.click('#oc-interact');await p.click('#o-zone');await clickMap(90,90);
if(await p.isHidden('#zoneedit'))fail('placing a zone should open its editor');
let z=zones((await S()).st)[0];
if(!z||!z.id||z.w!==2||z.h!==2||z.x!==96||z.y!==96)fail('zone should be 2x2 on whole squares: '+JSON.stringify(z));
await p.fill('#zname','Tripwire');await p.fill('#zmsg','Click. Something hisses in the dark.');
await p.click('#zwp');z=zones((await S()).st)[0];if(z.w!==3||z.x!==104)fail('wider should grow to the right: '+JSON.stringify(z));
// link the dynamite, the torch and the door
await p.click('#zlink');await clickMap(232,198);await clickMap(168,38);await clickMap(296,40);await p.click('#zlink');
z=zones((await S()).st)[0];if(z.tg.length!==3)fail('three things should be linked: '+JSON.stringify(z.tg));
if(!/1 dynamite, 1 fire, 1 door/.test(await p.textContent('#zlinked')))fail('linked summary: '+await p.textContent('#zlinked'));
if(await p.isHidden('#zdrrow'))fail('door action should show once a door is linked');
await p.screenshot({path:path.join(OUT,'zones_editor.png')});
await p.click('#zdone');
st=(await S()).st;if(st.objects.length!==4)fail('linking should not place or move objects: '+st.objects.length);

// fog: a room right of the zone (columns 8-12, rows 3-9) and a separate patch far away (columns 15-18, rows 10-12)
await p.evaluate(()=>{const s=window.__dustmap().st;let f='';for(let r=0;r<s.rows;r++)for(let c=0;c<s.cols;c++)f+=(c>=8&&c<=12&&r>=3&&r<=9)||(c>=15&&c<=18&&r>=10&&r<=12)?'1':'0';s.fog=f});
await p.screenshot({path:path.join(OUT,'zones_dm_view.png')});

// walk the cowboy through the zone and out the other side
await p.keyboard.press('v');await p.keyboard.press('Escape');await dragMap([24,94],[56+8,94]);   // first a short step, still outside
st=(await S()).st;if(zones(st)[0].done)fail('a step that stays outside should not set it off');
const t=st.tokens[0];await dragMap([t.x,t.y-10],[t.x+80,t.y-10]);
st=(await S()).st;z=zones(st)[0];
if(!z.done)fail('walking through should set it off and spend it');
const f=st.fog||'',at=(c,r)=>f[r*st.cols+c];
if(at(10,6)!=='0'||at(8,3)!=='0'||at(12,9)!=='0')fail('the room beside the zone should be revealed');
if(at(16,11)!=='1')fail('the separate patch should stay hidden');
if(st.objects.find(o=>o.k==='torch').off)fail('the linked torch should be lit');
if(!st.objects.find(o=>o.k==='door').lock)fail('the linked door should be locked');
if((await S()).fuses<1)fail('the dynamite fuse should be burning');
const msg=await p.textContent('#portmsg');if(!/Tripwire/.test(msg)||!/hisses/.test(msg))fail('DM should see what happened: '+msg);
await p.waitForTimeout(2200);st=(await S()).st;
if(st.objects.some(o=>o.k==='dynamite'))fail('the dynamite should have gone off');
if(!st.ops.some(o=>o.blast))fail('there should be a crater');
await p.screenshot({path:path.join(OUT,'zones_after.png')});
// spent: walking back through does nothing
await p.evaluate(()=>{window.__dustmap().st.objects.find(o=>o.k==='door').lock=0});
const t2=st.tokens[0];await dragMap([t2.x,t2.y-10],[24,t2.y-10]);
if((await S()).st.objects.find(o=>o.k==='door').lock)fail('a spent zone should not go off again');

// Ask me first, every time
await p.keyboard.press('o');await p.click('#oc-interact');await p.click('#o-zone');await clickMap(40,184);
await p.fill('#zname','Bell');await p.fill('#zmsg','A bell rings.');await p.selectOption('#zrep','1');await p.check('#zask');await p.uncheck('#zrv');await p.click('#zdone');
await p.keyboard.press('v');await p.keyboard.press('Escape');
let tk=(await S()).st.tokens[0];await dragMap([tk.x,tk.y-10],[40,190-10]);
if(await p.isHidden('#zoneask'))fail('an Ask me first zone should ask');
if(!/stepped into “Bell”/.test(await p.textContent('#zatext')))fail('ask text: '+await p.textContent('#zatext'));
await p.screenshot({path:path.join(OUT,'zones_ask.png')});
await p.click('#zaskip');if(!(await p.isHidden('#zoneask')))fail('Skip should close the card');
if(/bell rings/.test(await p.textContent('#portmsg')))fail('Skip should not fire');
tk=(await S()).st.tokens[0];await dragMap([tk.x,tk.y-10],[tk.x+64,tk.y-10]);await dragMap([tk.x+64,tk.y-10],[40,180]);
if(await p.isHidden('#zoneask'))fail('every time: stepping in again should ask again');
await p.click('#zafire');if(!/bell rings/.test(await p.textContent('#portmsg')))fail('Fire should set it off');
if(zones((await S()).st).find(o=>o.nm==='Bell').done)fail('an every-time zone is never spent');

// select a zone by clicking inside it, and Delete removes it
await clickMap(58,204);if(!(await p.isVisible('#selbar [aria-label="Edit trigger"]')))fail('a selected zone should offer Edit trigger');
await p.keyboard.press('Delete');if(zones((await S()).st).length!==1)fail('Delete should remove the zone');
if(errs.length)fail('page errors: '+errs.join(' | '));
console.log('PASS: trigger zones');
}catch(e){console.error('FAIL',e.message);code=1}finally{await b.close();process.exit(code)}})();
