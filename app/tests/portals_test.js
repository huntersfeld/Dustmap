// Doors, stairs, cave entrances, trapdoors and holes (solo): Link a door by clicking where it leads, on this map or another
// one; a token that steps on it goes through alone; when the last party token is through, the map follows; Take it back;
// Send the party through moves everyone; same-map links make a landing spot on empty ground and link back both ways.
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
const mapByName=async n=>{const l=await lib();return p.evaluate(id=>JSON.parse(localStorage.getItem('dustmap-map:'+id)),l.maps.find(m=>m.name===n).id)};
const scr=async(x,y)=>{const d=await S(),box=await (await p.$('#map')).boundingBox();return[box.x+(x-d.cam.x)*d.Z,box.y+(y-d.cam.y)*d.Z]};
const clickMap=async(x,y)=>{const q=await scr(x,y);await p.mouse.click(...q);await p.waitForTimeout(150)};
const dragMap=async(from,to)=>{const a=await scr(...from),c=await scr(...to);await p.mouse.move(...a);await p.mouse.down();
  for(let k=1;k<=8;k++){await p.mouse.move(a[0]+(c[0]-a[0])*k/8,a[1]+(c[1]-a[1])*k/8);await p.waitForTimeout(20)}await p.mouse.up();await p.waitForTimeout(600)};
// drag a token by its sheet: grab it where no later token overlaps (the topmost token wins a click)
const moveTok=async(s,to)=>{const st=(await S()).st,t=st.tokens.find(t=>t.s===s);if(!t)fail('no token '+s);
  await p.keyboard.press('v');await dragMap([t.x,t.y-10],[to[0],to[1]-10]);
  const after=(await S()).st.tokens.find(t=>t.s===s);return after};
const openMap=async n=>{await p.click('#libbtn');await p.click('.libmap:has-text("'+n+'") button:has-text("Open")');await p.waitForTimeout(700)};
const party=st=>st.tokens.filter(t=>t.s<4);
const cell=(x,y)=>[Math.floor(x/16),Math.floor(y/16)];
const near=(t,c,r,d)=>{const q=cell(t.x,t.y);return Math.max(Math.abs(q[0]-c),Math.abs(q[1]-r))<=d&&!(q[0]===c&&q[1]===r)};
const home=await curName();

// the tray has the new kinds
for(const k of ['door','stairsdown','stairsup','entrance','trapdoor','hole','landing'])if(!(await p.$('#o-'+k)))fail('tray should have '+k);

// "Cellar" (20 x 14) with a door in its top-right corner, leading home through the dropdown
await p.keyboard.press('n');await p.waitForTimeout(200);await p.selectOption('#newsize','20x14');await p.fill('#newname','Cellar');await p.press('#newname','Enter');await p.waitForTimeout(900);
// keep the cellar's own cowboys out of the way: they'd be replaced by the arrivals anyway
await p.keyboard.press('o');await p.click('#oc-interact');await p.click('#o-door');await clickMap(300,40);
if(await p.isHidden('#portedit'))fail('placing a door should open its editor');
let st=(await S()).st;let cdoor=st.objects.find(o=>o.k==='door');
if(!cdoor||!cdoor.id||cdoor.x!==296||cdoor.y!==40)fail('door should get an id and sit on a square: '+JSON.stringify(cdoor));
await p.selectOption('#ptto',{label:home});await p.click('#ptdone');

// home: a door in the bottom-right corner, linked with Link… by clicking the cellar door on the other map
await openMap(home);
st=(await S()).st;const W=st.cols*16,H=st.rows*16,dx=Math.floor((W-24)/16)*16+8,dy=Math.floor((H-24)/16)*16+8;
await p.keyboard.press('o');await p.click('#oc-interact');await p.click('#o-door');await clickMap(dx,dy);await p.click('#ptlink');
if(await p.isHidden('#portmsg')||!/Click where/.test(await p.textContent('#portmsg')))fail('Link… should explain what to click');
await openMap('Cellar');await clickMap(296,40);await p.waitForTimeout(700);
if(await curName()!==home)fail('linking on another map should come back to the door: '+await curName());
let hdoor=(await S()).st.objects.find(o=>o.k==='door');const cellarId=(await lib()).maps.find(m=>m.name==='Cellar').id;
if(hdoor.to!==cellarId||hdoor.toN!=='Cellar'||hdoor.at!==cdoor.id)fail('home door should be linked to the cellar door: '+JSON.stringify(hdoor));
if(!/Linked/.test(await p.textContent('#portmsg')))fail('a message should confirm the link');
await p.screenshot({path:path.join(OUT,'portals_linked.png')});

// one cowboy walks onto the door: only it goes, into the Cellar's saved map, beside the cellar door
const before=party((await S()).st);if(before.length!==4)fail('starter should have four party tokens');
await moveTok(3,[dx,dy]);await p.waitForTimeout(400);
if(await curName()!==home)fail('one token going through should not move the map');
st=(await S()).st;if(party(st).length!==3||st.tokens.some(t=>t.s===3))fail('only the token that stepped on it should leave: '+JSON.stringify(party(st)));
let cel=await mapByName('Cellar');let w=cel.tokens.filter(t=>t.s===3);if(w.length!==1||!near(w[0],18,2,1))fail('it should stand beside the cellar door: '+JSON.stringify(w));
const msg=await p.textContent('#portmsg');if(!/rest of the party/.test(msg)||!/Follow/.test(msg)||!/Take it back/.test(msg))fail('message should offer Follow and Take it back: '+msg);
// Take it back: back where it started
await p.click('#portmsg button:has-text("Take it back")');await p.waitForTimeout(400);
const b3=before.find(t=>t.s===3),a3=(await S()).st.tokens.find(t=>t.s===3);if(!a3||a3.x!==b3.x||a3.y!==b3.y)fail('Take it back should return it: '+JSON.stringify(a3));
if((await mapByName('Cellar')).tokens.some(t=>t.s===3))fail('Take it back should take it off the cellar');

// one by one: the map follows the last one through
for(const s of [3,2,1]){await moveTok(s,[dx,dy]);await p.waitForTimeout(300);if(await curName()!==home)fail('map should wait for the whole party')}
await moveTok(0,[dx,dy]);await p.waitForTimeout(500);
if(await curName()!=='Cellar')fail('when the last party token is through, the map should follow');
let arr=party((await S()).st);if(arr.length!==4)fail('all four should be in the cellar: '+arr.length);
arr.forEach(t=>{if(!near(t,18,2,2))fail('party should stand beside the cellar door: '+JSON.stringify(arr))});
if(new Set(arr.map(t=>cell(t.x,t.y).join())).size!==4)fail('one square each');
if(party(await mapByName(home)).length)fail('the home map should have no party left');
await p.screenshot({path:path.join(OUT,'portals_arrived.png')});

// Send the party through: everyone at once, beside the home door
await clickMap(296,40);if(await p.isHidden('#selbar'))fail('selecting a door should show the selection bar');
await p.click('#selbar [aria-label="Send the party through"]');await p.waitForTimeout(600);
if(await curName()!==home)fail('Send the party through should go home');
arr=party((await S()).st);const hc=cell(dx,dy);arr.forEach(t=>{if(!near(t,hc[0],hc[1],2))fail('party should arrive beside the home door: '+JSON.stringify(arr))});

// a door that doesn't open on stepping
await clickMap(dx,dy);await p.keyboard.press('Enter');await p.uncheck('#ptwalk');await p.click('#ptdone');
await moveTok(arr[0].s,[dx,dy]);if(await curName()!==home||party((await S()).st).length!==4)fail('a walk-off door should not open when stepped on');
await p.click('#undo');await p.waitForTimeout(200);

// same map: stairs linked to an empty square get a landing spot there; stepping on them moves only that token
await p.keyboard.press('o');await p.click('#oc-interact');await p.click('#o-stairsdown');await clickMap(200,200);await p.click('#ptlink');await clickMap(40,40);
st=(await S()).st;const stairs=st.objects.find(o=>o.k==='stairsdown'),land=st.objects.find(o=>o.k==='landing');
if(!land||land.x!==40||land.y!==40||stairs.to!=='here'||stairs.at!==land.id)fail('linking to empty ground should make a landing spot: '+JSON.stringify([stairs,land]));
const one=party(st)[1];const others=party(st).filter(t=>t!==one).map(t=>[t.s,t.x,t.y]).join();
await moveTok(one.s,[stairs.x,stairs.y]);await p.waitForTimeout(300);
st=(await S()).st;const moved=st.tokens.find(t=>t.s===one.s);if(!near(moved,2,2,1)&&cell(moved.x,moved.y).join()!=='2,2')fail('the token should arrive at the landing spot: '+JSON.stringify(moved));
if(party(st).filter(t=>t.s!==one.s).map(t=>[t.s,t.x,t.y]).join()!==others)fail('the others should stay put');

// trapdoor and hole linked to each other: the hole had nowhere to go, so it links back
await p.keyboard.press('o');await p.click('#oc-interact');await p.click('#o-hole');await clickMap(120,296);await p.click('#ptdone');
await p.click('#o-trapdoor');await clickMap(72,296);await p.click('#ptlink');await clickMap(120,296);
st=(await S()).st;const trap=st.objects.find(o=>o.k==='trapdoor'),hole=st.objects.find(o=>o.k==='hole');
if(trap.to!=='here'||trap.at!==hole.id||hole.to!=='here'||hole.at!==trap.id)fail('trapdoor and hole should link both ways: '+JSON.stringify([trap,hole]));
if(!/both ways/.test(await p.textContent('#portmsg')))fail('message should say it linked both ways');
// Esc cancels linking
await p.keyboard.press('v');await clickMap(dx,dy);await p.click('#selbar [aria-label="Link"]');await p.keyboard.press('Escape');await clickMap(500,40);
if((await S()).st.objects.find(o=>o.k==='door').at!==cdoor.id)fail('Esc should cancel linking');
// hover shows where it leads
await p.keyboard.press('m');await p.mouse.move(...await scr(trap.x,trap.y));await p.waitForTimeout(200);
if(await p.isHidden('#portcard')||!/Trapdoor to another spot on this map/.test(await p.textContent('#portcard')))fail('hovering should say where it leads: '+await p.textContent('#portcard'));
await p.screenshot({path:path.join(OUT,'portals_home.png')});

// the tour map: one token takes the stairs into the cave
await p.click('#libbtn');await p.click('#libtour');await p.waitForTimeout(800);
st=(await S()).st;if(!st.objects.some(o=>o.k==='stairsdown'&&o.to==='here'&&o.at==='tour-cave'))fail('tour should have stairs into the cave');
await moveTok(3,[280,264]);await p.waitForTimeout(300);
arr=party((await S()).st);if(!(arr.find(t=>t.s===3).y>320)||arr.filter(t=>t.y>320).length!==1)fail('tour stairs should take that one token into the cave: '+JSON.stringify(arr));

if(errs.length)fail('page errors: '+errs.join(' | '));
console.log('PASS: doors link by clicking, one token at a time, the map follows the party');
}catch(e){console.log('FAIL',e.message);code=1}finally{await b.close();process.exit(code)}})();
