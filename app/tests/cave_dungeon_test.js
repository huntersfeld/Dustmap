// Rattlesnake Deep, the built-in cave dungeon: it opens from the ⋯ menu at the largest size, every link inside it
// resolves, each area sits under its own fog patch, the plate puzzle only works in order (flame, wave, star) and
// unlocks the vault and the hall door, the hall locks behind the party, and its stairs lead to the tour map and back
// (adding the tour first if it isn't in the library). Also checks the new treasure props render without errors.
// Run after `python3 app/build_dustmap.py`.
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
const fail=m=>{throw new Error(m)};
(async()=>{const b=await chromium.launch();let code=0;
try{const ctx=await b.newContext({viewport:{width:1600,height:1060}});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
await p.click('#more');await p.uncheck('#anim');await p.click('#cave');await p.waitForTimeout(2500);await p.keyboard.press('0');await p.waitForTimeout(300);
const S=()=>p.evaluate(()=>window.__dustmap());
const lib=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-library')));
const scr=async(x,y)=>{const d=await S(),box=await (await p.$('#map')).boundingBox();return[box.x+(x-d.cam.x)*d.Z,box.y+(y-d.cam.y)*d.Z]};
const ctr=(c,r)=>[c*16+8,r*16+8];
const byId=(st,id)=>st.objects.find(o=>o.id===id);

let st=(await S()).st,l=await lib();
if(st.cols!==60||st.rows!==40)fail('the dungeon should be the largest size, got '+st.cols+'x'+st.rows);
if(l.maps.find(m=>m.id===l.cur).name!=='Rattlesnake Deep')fail('the dungeon should open as Rattlesnake Deep');
for(const k of['chest','gold','plate','bones','zone','door','stairsup','stairsdown','entrance','dynamite','torch','campfire','sign'])if(!st.objects.some(o=>o.k===k))fail('missing '+k);
if(st.tokens.filter(t=>t.s>=4).length<15)fail('enemies and townsfolk should be placed');
// every link resolves
st.objects.filter(o=>o.k==='zone').forEach(z=>z.tg.forEach(id=>{if(!byId(st,id))fail(`zone ${z.nm} links a missing ${id}`)}));
st.objects.filter(o=>o.at&&o.to==='here').forEach(o=>{if(!byId(st,o.at))fail('door '+o.id+' arrives at a missing '+o.at)});
st.objects.filter(o=>o.k==='sign').forEach(o=>{if(o.txt.length>300)fail('sign text too long: '+o.txt.slice(0,30))});
if(!st.fog||!st.fogWalk)fail('the dungeon starts under fog, with walk reveal on');
await p.screenshot({path:path.join(OUT,'cave_dm.png')});

// play: keep one party token, put it where a test needs it
const put=(c,r)=>p.evaluate(([x,y])=>{const s=window.__dustmap().st;s.tokens=s.tokens.filter(t=>t.s===0||t.s>3);const t=s.tokens.find(t=>t.s===0);t.x=x;t.y=y},ctr(c,r));
const walk=async(...cells)=>{await p.keyboard.press('v');for(const[c,r,door]of cells){const t=(await S()).st.tokens.find(t=>t.s===0);
  const a=await scr(t.x,t.y-6),[x,y]=ctr(c,r),z=await scr(x,y-6);await p.mouse.move(...a);await p.mouse.down();
  for(let k=1;k<=14;k++){await p.mouse.move(a[0]+(z[0]-a[0])*k/14,a[1]+(z[1]-a[1])*k/14);await p.waitForTimeout(15)}await p.mouse.up();await p.waitForTimeout(250);
  const n=(await S()).st.tokens.find(t=>t.s===0);if(!door&&(Math.abs(n.x-x)>8||Math.abs(n.y-y)>8))fail(`token should be at ${c},${r}, is at ${n.x},${n.y}`)}};
const hidden=async(c,r)=>{const s=(await S()).st;return!!s.fog&&s.fog[r*s.cols+c]==='1'};

// the camp lookout reveals the camp, not the stash above it or the grotto beside it
if(!(await hidden(11,18))||!(await hidden(8,6)))fail('camp and stash start hidden');
await put(8,29);await walk([9,23]);
{const s=(await S()).st;if(await hidden(11,18))fail('the camp lookout should reveal the camp '+JSON.stringify(byId(s,'cave-camp-lookout'))+' '+(await p.textContent('#portmsg')))}
if(!(await hidden(8,6))||!(await hidden(30,10)))fail('the stash and the grotto should stay hidden');

// the hall: the door locks behind the party and the torches light
await put(42,33);await walk([46,33]);st=(await S()).st;
if(!byId(st,'cave-hall-out').lock)fail('Sealed in should lock the door behind the party');
if(byId(st,'cave-ht1').off)fail('Sealed in should light the hall torches');
// plates out of order do nothing: wave first
await walk([48,35],[49,36]);st=(await S()).st;
if(!byId(st,'cave-p2').off||!byId(st,'cave-p3').off)fail('the wave plate is off until the flame plate goes off');
await walk([48,31],[45,26],[44,24]);st=(await S()).st;
if(byId(st,'cave-p2').off||!byId(st,'cave-p1').done)fail('the flame plate should switch the wave plate on');
if(!byId(st,'cave-p3').off)fail('the star plate stays off until the wave plate goes off');
if(!byId(st,'cave-vault-door').lock)fail('the vault starts locked');
await walk([45,26],[48,31],[48,35],[49,36]);st=(await S()).st;
if(byId(st,'cave-p3').off)fail('the wave plate should switch the star plate on');
await walk([48,31],[50,26],[50,24]);st=(await S()).st;
if(byId(st,'cave-vault-door').lock||byId(st,'cave-hall-out').lock)fail('the star plate should unlock the vault and the way back');
if(byId(st,'cave-vt1').off)fail('the star plate should light the vault torches');
await p.screenshot({path:path.join(OUT,'cave_puzzle_solved.png')});
// into the vault: the door takes the party to the vault side, and walking in reveals it
if(!(await hidden(57,28)))fail('the vault starts hidden');
await walk([51,28],[52,29,1]);await p.waitForTimeout(400);st=(await S()).st;
let t=st.tokens.find(t=>t.s===0);if(t.x<54*16)fail('the vault door should take the party inside: '+t.x);
await walk([58,29]);if(await hidden(57,28))fail('walking into the vault should reveal it');

// out by the stairs: to the tour map, which the first visit put in the library
await put(5,37);await walk([3,37,1]);await p.waitForTimeout(800);
l=await lib();if(l.maps.find(m=>m.id===l.cur).name!=='Dustmap tour')fail('the stairs up should lead to the tour map');
st=(await S()).st;t=st.tokens.find(t=>t.s===0);const ent=byId(st,'tour-deep');
if(!ent||Math.hypot(t.x-ent.x,t.y-ent.y)>40)fail('the party should arrive beside the tour’s cave entrance');
// and back down through the tour's cave entrance
await p.evaluate(()=>{const s=window.__dustmap().st,e=s.objects.find(o=>o.id==='tour-deep'),t=s.tokens.find(t=>t.s===0);t.x=e.x-32;t.y=e.y});
await walk([Math.floor(ent.x/16),Math.floor(ent.y/16),1]);await p.waitForTimeout(800);
l=await lib();if(l.maps.find(m=>m.id===l.cur).name!=='Rattlesnake Deep')fail('the tour’s cave entrance should lead to the dungeon');
if(l.maps.filter(m=>m.name.startsWith('Rattlesnake Deep')).length!==1)fail('going back should not add a second copy');

// a library without the tour: the stairs add it
await p.evaluate(()=>{const L=JSON.parse(localStorage.getItem('dustmap-library'));});
await p.click('#libname');await p.waitForTimeout(300);
const tourId=(await lib()).maps.find(m=>m.name==='Dustmap tour').id;
await p.evaluate(id=>{const L=JSON.parse(localStorage.getItem('dustmap-library'));L.maps=L.maps.filter(m=>m.id!==id);localStorage.setItem('dustmap-library',JSON.stringify(L))},tourId);
await p.reload();await p.waitForTimeout(1800);await p.click('#more');await p.uncheck('#anim');await p.keyboard.press('Escape');
await p.click('#more');await p.click('#cave');await p.waitForTimeout(2500);await p.keyboard.press('0');await p.waitForTimeout(300);
l=await lib();if(l.maps.some(m=>m.name==='Dustmap tour'))fail('setup: tour should be gone');
await put(5,37);await walk([3,37,1]);await p.waitForTimeout(800);
l=await lib();if(l.maps.find(m=>m.id===l.cur).name!=='Dustmap tour')fail('a missing built-in map should be added when the party goes through');
if(errs.length)fail('page errors: '+errs.join(' | '));
console.log('cave dungeon: OK');
}catch(e){console.error('FAIL:',e.message);code=1}
await b.close();process.exit(code)})();
