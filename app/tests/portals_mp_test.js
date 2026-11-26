const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
// Doors in a live session: a player walks their token onto a door and only that token goes to the linked map, beside
// the door back; the DM follows; a player clicking a door beside their own token opens it too; a locked door doesn't;
// landing spots never reach players. Uses tests/mock_claude_runtime.js in place of claude.ai's db / room / user.
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
const install=require('./mock_claude_runtime.js');
const fail=m=>{throw new Error(m)};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,what,ms=6000){const t0=Date.now();for(;;){const v=await fn();if(v)return v;if(Date.now()-t0>ms)fail('timed out: '+what);await wait(100)}}
const NAMES={u_dm:'Hunter',u_p1:'Alex'};

(async()=>{const b=await chromium.launch();let code=0;
try{
  const store=new Map(),pres=new Map(),pages=[];
  const broadcast=m=>Promise.all(pages.map(p=>p.evaluate(m=>window.__hubRecv&&window.__hubRecv(m),m).catch(()=>{})));
  async function open(id,{owner=false,admin=false}={}){
    const ctx=await b.newContext({viewport:{width:1280,height:860}});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
    await ctx.exposeBinding('__hubSend',async(src,m)=>{
      if(m.t==='hello'){await src.page.evaluate(m=>window.__hubRecv(m),{t:'init',store:[...store],peers:[...pres.values()]})}
      if(m.t==='set'){store.set(m.path,m.data);await broadcast(m)}
      if(m.t==='pres'){pres.set(m.peer,{peer:m.peer,by:m.by,kind:'viewer',guest:false,presence:m.presence});await broadcast(m)}});
    await ctx.addInitScript(`window.__starterExample=true;window.__names=${JSON.stringify(NAMES)};(${install.toString()})(${JSON.stringify({id,name:NAMES[id],owner,admin})})`);
    await p.goto(PAGE);await p.waitForTimeout(1200);pages.push(p);p.id=id;return p}
  const S=p=>p.evaluate(()=>window.__dustmap());
  const scr=async(p,x,y)=>{const d=await S(p),box=await (await p.$('#map')).boundingBox();return[box.x+(x-d.cam.x)*d.Z,box.y+(y-d.cam.y)*d.Z]};
  const clickMap=async(p,x,y)=>{await p.mouse.click(...await scr(p,x,y));await p.waitForTimeout(200)};
  const dragMap=async(p,from,to)=>{const a=await scr(p,...from),c=await scr(p,...to);await p.mouse.move(...a);await p.mouse.down();
    for(let k=1;k<=8;k++){await p.mouse.move(a[0]+(c[0]-a[0])*k/8,a[1]+(c[1]-a[1])*k/8);await p.waitForTimeout(30)}await p.mouse.up();await p.waitForTimeout(300)};
  const lib=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-library')));
  const curName=async p=>{const l=await lib(p);return l.maps.find(m=>m.id===l.cur).name};
  const cell=(x,y)=>[Math.floor(x/16),Math.floor(y/16)];

  const dm=await open('u_dm',{owner:true,admin:true});
  const home=await curName(dm);
  // the DM builds a 20 x 14 Cellar with a door back home in its top-right corner and a landing spot
  await dm.keyboard.press('n');await dm.waitForTimeout(200);await dm.selectOption('#newsize','20x14');await dm.fill('#newname','Cellar');await dm.press('#newname','Enter');await dm.waitForTimeout(900);
  await dm.keyboard.press('o');await dm.click('#oc-interact');await dm.click('#o-landing');await clickMap(dm,56,184);
  await dm.click('#oc-interact');await dm.click('#o-door');await clickMap(dm,296,40);await dm.selectOption('#ptto',{label:home});await dm.click('#ptdone');
  // ...and a door at home leading to it, in the bottom-right corner
  await dm.click('#libbtn');await dm.click('.libmap:has-text("'+home+'") button:has-text("Open")');await dm.waitForTimeout(700);
  let st=(await S(dm)).st;const W=st.cols*16,H=st.rows*16,dx=Math.floor((W-24)/16)*16+8,dy=Math.floor((H-24)/16)*16+8;
  await dm.click('#oc-interact');await dm.click('#o-door');await clickMap(dm,dx,dy);await dm.selectOption('#ptto',{label:'Cellar'});await dm.click('#ptdone');
  // a landing spot at home, which players must never see
  await dm.click('#oc-interact');await dm.click('#o-landing');await clickMap(dm,40,40);await dm.keyboard.press('v');

  const p1=await open('u_p1');
  await dm.click('#mpbtn');await dm.click('#mpbody button:has-text("Start session")');
  await until(async()=>(await S(dm)).role==='dm','DM role');
  await until(async()=>(await S(p1)).role==='player','player role');
  await until(async()=>(await S(p1)).st.objects.some(o=>o.k==='door'),'player gets the door');
  // Alex picks the first cowboy
  await p1.waitForTimeout(500);if(await p1.locator('#mpmodal').isHidden())await p1.click('#mpbtn');await p1.locator('.mppick .tokbtn').nth(0).click();await p1.click('#mpplay');
  await until(async()=>{const s=store.get('live/session');return s&&s.assign&&s.assign['0']==='u_p1'},'assignment saved');
  await dm.click('#mpclose').catch(()=>{});await until(async()=>p1.evaluate(()=>document.getElementById('mpmodal').hidden),'picker closes');

  // clicking the door from across the map does nothing but say so
  const mine=(await S(p1)).st.tokens.find(t=>t.s===0);
  await clickMap(p1,dx,dy);await wait(500);
  if(!/Walk up/.test(await p1.textContent('#portmsg')))fail('a far-off click should tell the player to walk up: '+await p1.textContent('#portmsg'));
  if(await curName(dm)!==home)fail('a far-off click should not open the door');

  // the player walks onto the door: only their token goes, into the Cellar; the session stays home with the rest of the party
  const dmMap=async(p,n)=>{const l=await lib(p);return p.evaluate(id=>JSON.parse(localStorage.getItem('dustmap-map:'+id)),l.maps.find(m=>m.name===n).id)};
  const beside=(t,c,r)=>{const q=cell(t.x,t.y);return Math.max(Math.abs(q[0]-c),Math.abs(q[1]-r))<=2&&!(q[0]===c&&q[1]===r)};
  await dragMap(p1,[mine.x,mine.y-10],[dx,dy-10]);
  await until(async()=>!(await S(dm)).st.tokens.some(t=>t.s===0),'the token leaves the home map');
  await until(async()=>{const t=(await dmMap(dm,'Cellar')).tokens.find(t=>t.s===0);return t&&beside(t,18,2)},'it waits in the Cellar beside the door');
  if(await curName(dm)!==home)fail('one player going through should not move the session');
  await until(async()=>!(await S(p1)).st.tokens.some(t=>t.s===0),'the player sees their token go');
  await until(async()=>/went through the door/.test(await p1.textContent('#portmsg')),'players are told who went through');
  if((await S(dm)).st.tokens.filter(t=>t.s>0&&t.s<4).length!==3)fail('the rest of the party should stay');
  // the DM follows
  await dm.click('#portmsg button:has-text("Follow")');
  await until(async()=>await curName(dm)==='Cellar','DM follows to the Cellar');
  await until(async()=>{const s=(await S(p1)).st;return s.cols===20&&s.rows===14},'player gets the Cellar');
  await until(async()=>{const t=(await S(p1)).st.tokens.find(t=>t.s===0);return t&&beside(t,18,2)},'player token stands beside the cellar door');
  await p1.screenshot({path:path.join(OUT,'portals_mp_player_cellar.png')});

  // landing spots stay in the shared map data but are never drawn for players
  const ring=async p=>p.evaluate(()=>{const d=window.__dustmap(),o=d.st.objects.find(o=>o.k==='landing');if(!o)return-1;const cv=document.getElementById('map'),g=cv.getContext('2d'),k=cv.width/cv.clientWidth;
    let n=0;for(let a=0;a<24;a++){const x=(o.x+Math.cos(a/24*6.283)*7-d.cam.x)*d.Z*k,y=(o.y+Math.sin(a/24*6.283)*7-d.cam.y)*d.Z*k,q=g.getImageData(Math.round(x),Math.round(y),1,1).data;if(Math.abs(q[0]-242)<8&&Math.abs(q[1]-196)<8&&Math.abs(q[2]-159)<10)n++}return n});
  await wait(300);if(!(await ring(dm)>0))fail('DM should see the landing spot ring');if(await ring(p1)>0)fail('player should not see the landing spot ring');

  // the player clicks the cellar door beside their token: it goes home on its own; the DM follows
  await clickMap(p1,296,40);
  await until(async()=>{const t=(await dmMap(dm,home)).tokens.find(t=>t.s===0);return t&&beside(t,...cell(dx,dy))},'clicking the door beside the token sends it home');
  if(await curName(dm)!=='Cellar')fail('the session stays while party tokens remain in the Cellar');
  await dm.click('#portmsg button:has-text("Follow")');
  await until(async()=>{const s=(await S(p1)).st;return s.cols===W/16},'player gets the home map back');
  await until(async()=>{const t=(await S(p1)).st.tokens.find(t=>t.s===0);return t&&beside(t,...cell(dx,dy))},'player arrives beside the home door');

  // a locked door: stepping on it or clicking it does nothing for players
  await clickMap(dm,dx,dy);await dm.keyboard.press('Enter');await dm.check('#ptlock');await dm.click('#ptdone');
  await until(async()=>(await S(p1)).st.objects.some(o=>o.k==='door'&&o.lock),'player gets the lock');
  const t2=(await S(p1)).st.tokens.find(t=>t.s===0);await dragMap(p1,[t2.x,t2.y-10],[dx,dy-10]);await wait(800);
  if(await curName(dm)!==home)fail('a locked door should not open for a player');
  if(!/won’t open/.test(await p1.textContent('#portmsg')))fail('stepping on a locked door should say it won’t open: '+await p1.textContent('#portmsg'));
  // ...but the DM can still send the party through
  await clickMap(dm,dx,dy+6);await dm.click('#selbar [aria-label="Send the party through"]');
  await until(async()=>(await S(p1)).st.cols===20,'Send the party through moves the players too');
  if((await S(dm)).st.tokens.filter(t=>t.s<4).length!==4)fail('the whole party should be in the Cellar');

  for(const p of pages)if(p.errs.length)fail(p.id+' page errors: '+p.errs.join(' | '));
  console.log('PASS: doors in a live session');
}catch(e){console.log('FAIL',e.message);code=1}finally{await b.close();process.exit(code)}})();
