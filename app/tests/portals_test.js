// Doors, stairs and entrances: the DM links a door to another map in the library; a party token stepping on it (or
// Go through) opens that map with the party standing beside the door that leads back, or around a Landing spot the DM
// picked; Take it back undoes the trip; stairs can lead to another spot on the same map; landing spots never reach the map image.
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
const lib=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-library')));
const curName=async()=>{const l=await lib();return l.maps.find(m=>m.id===l.cur).name};
const scr=async(x,y)=>{const d=await S(),box=await (await p.$('#map')).boundingBox();return[box.x+(x-d.cam.x)*d.Z,box.y+(y-d.cam.y)*d.Z]};
const clickMap=async(x,y)=>{const q=await scr(x,y);await p.mouse.click(...q);await p.waitForTimeout(150)};
const dragMap=async(from,to)=>{const a=await scr(...from),c=await scr(...to);await p.mouse.move(...a);await p.mouse.down();
  for(let k=1;k<=8;k++){await p.mouse.move(a[0]+(c[0]-a[0])*k/8,a[1]+(c[1]-a[1])*k/8);await p.waitForTimeout(20)}await p.mouse.up();await p.waitForTimeout(600)};
const party=st=>st.tokens.filter(t=>t.s<4);
const cell=(x,y)=>[Math.floor(x/16),Math.floor(y/16)];
const home=await curName();

// a second map, "Cellar" (20 x 14), with a landing spot and a door in its top-right corner leading back home
await p.keyboard.press('n');await p.waitForTimeout(200);await p.selectOption('#newsize','20x14');await p.fill('#newname','Cellar');await p.press('#newname','Enter');await p.waitForTimeout(900);
if(await curName()!=='Cellar')fail('Cellar should be open');
await p.keyboard.press('o');await p.click('#oc-interact');await p.click('#o-landing');await clickMap(56,184);
await p.click('#oc-interact');await p.click('#o-door');await clickMap(300,40);
if(await p.isHidden('#portedit'))fail('placing a door should open its editor');
let st=(await S()).st;let door=st.objects.find(o=>o.k==='door');
if(!door||!door.id||door.x!==296||door.y!==40)fail('door should get an id and sit on a square: '+JSON.stringify(door));
if(!st.objects.find(o=>o.k==='landing').id)fail('landing spot should get an id');
const opts=await p.$$eval('#ptto option',os=>os.map(o=>o.textContent));
if(opts.join('|')!==`Nowhere yet|Another spot on this map|${home}`)fail('Leads to should list the other maps: '+opts);
await p.selectOption('#ptto',{label:home});await p.click('#ptdone');
door=(await S()).st.objects.find(o=>o.k==='door');if(!door.to||door.toN!==home)fail('door should lead home: '+JSON.stringify(door));
// landing spots are for the DM only: never painted into the map image
const ocanHasLanding=await p.evaluate(()=>window.__dustmap().st.objects.some(o=>o.k==='landing'));if(!ocanHasLanding)fail('landing kept');
await p.screenshot({path:path.join(OUT,'portals_cellar_editor.png')});

// back home: a door in the bottom-right corner leading to the Cellar, arriving automatically (beside the door back)
await p.click('#libbtn');await p.click('.libmap:has-text("'+home+'") button:has-text("Open")');await p.waitForTimeout(700);
st=(await S()).st;const W=st.cols*16,H=st.rows*16,dx=Math.floor((W-24)/16)*16+8,dy=Math.floor((H-24)/16)*16+8;
await p.keyboard.press('o');await p.click('#oc-interact');await p.click('#o-door');await clickMap(dx,dy);await p.selectOption('#ptto',{label:'Cellar'});
const ats=await p.$$eval('#ptat option',os=>os.map(o=>o.textContent));
if(ats.length!==3||!/Automatic/.test(ats[0])||!/Landing spot 1/.test(ats[1])||!/Beside the door/.test(ats[2]))fail('Arrive should list the cellar landing spot and door: '+ats);
await p.click('#ptdone');
const before=party((await S()).st);if(before.length!==4)fail('starter should have four party tokens');
// walk the first cowboy onto the door
await p.keyboard.press('v');const t0=before[0];await dragMap([t0.x,t0.y-10],[dx,dy-10]);await p.waitForTimeout(400);
if(await curName()!=='Cellar')fail('stepping on the door should open the Cellar, got '+await curName());
st=(await S()).st;let arr=party(st);
if(arr.length!==4)fail('all four party tokens should arrive: '+arr.length);
arr.forEach(t=>{const[c,r]=cell(t.x,t.y);if(Math.abs(c-18)>2||r>4||(c===18&&r===2))fail('party should stand beside the cellar door, not on it: '+JSON.stringify(arr))});
if(new Set(arr.map(t=>cell(t.x,t.y).join())).size!==4)fail('party should get a square each');
if(!arr.every(t=>t.x%16===8&&t.y%16===8))fail('arrivals should stand on square centres');
let homeMap=await p.evaluate(id=>JSON.parse(localStorage.getItem('dustmap-map:'+id)),(await lib()).maps.find(m=>m.name===home).id);
if(party(homeMap).length)fail('the party should have left the home map');
if(await p.isHidden('#portmsg'))fail('a message should say where the party went');
await p.screenshot({path:path.join(OUT,'portals_arrived.png')});

// Take it back
await p.click('#portmsg button');await p.waitForTimeout(600);
if(await curName()!==home)fail('Take it back should return home');
const back=party((await S()).st).map(t=>[t.s,t.x,t.y]).sort().join();if(back!==before.map(t=>[t.s,t.x,t.y]).sort().join())fail('Take it back should put the party where it was: '+back);

// the home door now arrives at the Cellar's landing spot; Go through from the selection bar
await clickMap(dx,dy);await p.waitForTimeout(150);if(await p.isHidden('#selbar'))fail('selecting a door should show the selection bar');
await p.click('#selbar [aria-label="Edit door"]');await p.selectOption('#ptat',{index:1});await p.click('#ptdone');
await clickMap(dx,dy);await p.click('#selbar [aria-label="Go through"]');await p.waitForTimeout(600);
if(await curName()!=='Cellar')fail('Go through should open the Cellar');
arr=party((await S()).st);arr.forEach(t=>{const[c,r]=cell(t.x,t.y);if(Math.max(Math.abs(c-3),Math.abs(r-11))>1)fail('party should gather around the landing spot: '+JSON.stringify(arr))});
// and the Cellar door leads home, arriving beside the home door (toward the middle of the map)
const ct=arr[0];await dragMap([ct.x,ct.y-10],[296,40-10]);await p.waitForTimeout(400);
if(await curName()!==home)fail('the cellar door should lead home');
arr=party((await S()).st);const hc=cell(dx,dy);arr.forEach(t=>{const[c,r]=cell(t.x,t.y);if(Math.max(Math.abs(c-hc[0]),Math.abs(r-hc[1]))>2||(c===hc[0]&&r===hc[1]))fail('party should arrive beside the home door: '+JSON.stringify(arr))});

// a door that only opens from Go through doesn't fire when stepped on; nor does a non-party token
await clickMap(dx,dy);await p.keyboard.press('Enter');await p.uncheck('#ptwalk');await p.click('#ptdone');
const pt=party((await S()).st)[0];await dragMap([pt.x,pt.y-10],[dx,dy-10]);await p.waitForTimeout(400);
if(await curName()!==home)fail('a walk-off door should not open when stepped on');
await p.click('#undo');await p.waitForTimeout(200);

// stairs to another spot on the same map, arriving at a landing spot
await p.keyboard.press('o');await p.click('#oc-interact');await p.click('#o-landing');await clickMap(40,40);
await p.click('#oc-interact');await p.click('#o-stairsdown');await clickMap(200,200);await p.selectOption('#ptto','here');{const v=await p.$eval('#ptat',s=>[...s.options].find(o=>/Landing spot/.test(o.textContent)).value);await p.selectOption('#ptat',v)}await p.click('#ptdone');
st=(await S()).st;const stairs=st.objects.find(o=>o.k==='stairsdown');if(stairs.to!=='here'||!stairs.at)fail('stairs should lead to a landing spot here: '+JSON.stringify(stairs));
await p.keyboard.press('v');const p2=party(st)[1];await dragMap([p2.x,p2.y-10],[stairs.x,stairs.y-10]);await p.waitForTimeout(400);
if(await curName()!==home)fail('same-map stairs should keep the map open');
arr=party((await S()).st);arr.forEach(t=>{const[c,r]=cell(t.x,t.y);if(Math.max(Math.abs(c-2),Math.abs(r-2))>1)fail('party should gather at the landing spot on this map: '+JSON.stringify(arr))});
// hover shows where it leads
await p.keyboard.press('m');const hq=await scr(stairs.x,stairs.y);await p.mouse.move(...hq);await p.waitForTimeout(200);
if(await p.isHidden('#portcard')||!/another spot on this map/.test(await p.textContent('#portcard')))fail('hovering stairs should say where they lead: '+await p.textContent('#portcard'));
await p.screenshot({path:path.join(OUT,'portals_home.png')});

// exported and re-imported maps lose their ids, so a door falls back to the map's name
const fallback=await p.evaluate(()=>{const s=window.__dustmap().st;return s.objects.filter(o=>o.k==='door').map(o=>o.toN)});if(!fallback.includes('Cellar'))fail('door should remember the map name');

// the tour map has stairs down into the cave and back up
await p.click('#libbtn');await p.click('#libtour');await p.waitForTimeout(800);
st=(await S()).st;if(!st.objects.some(o=>o.k==='stairsdown'&&o.to==='here'&&o.at==='tour-cave'))fail('tour should have stairs into the cave');
const tt=party(st)[3];await p.keyboard.press('v');await dragMap([tt.x,tt.y-10],[280,264-10]);await p.waitForTimeout(400);
arr=party((await S()).st);if(!arr.every(t=>t.y>320))fail('tour stairs should take the party into the cave: '+JSON.stringify(arr));
await p.screenshot({path:path.join(OUT,'portals_tour_cave.png')});

if(errs.length)fail('page errors: '+errs.join(' | '));
console.log('PASS: doors and stairs link maps and land the party');
}catch(e){console.log('FAIL',e.message);code=1}finally{await b.close();process.exit(code)}})();
