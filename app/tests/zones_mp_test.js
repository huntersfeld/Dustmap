const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
// Trigger zones in a live session: a player walks their token through a zone the DM placed; the DM's page sets it off,
// the linked torch lights for everyone, the player sees the message, and the zone is never drawn on the player's screen. Uses tests/mock_claude_runtime.js in place of claude.ai's db / room / user.
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
  const p1=await open('u_p1');
  await dm.click('#mpbtn');await dm.click('#mpbody button:has-text("Start session")');
  await until(async()=>(await S(dm)).role==='dm','DM role');
  await until(async()=>(await S(p1)).role==='player','player role');
  await p1.waitForTimeout(500);if(await p1.locator('#mpmodal').isHidden())await p1.click('#mpbtn');await p1.locator('.mppick .tokbtn').nth(0).click();await p1.click('#mpplay');
  await until(async()=>{const s=store.get('live/session');return s&&s.assign&&s.assign['0']==='u_p1'},'assignment saved');
  await dm.click('#mpclose').catch(()=>{});await until(async()=>p1.evaluate(()=>document.getElementById('mpmodal').hidden),'picker closes');
  const mine=(await S(p1)).st.tokens.find(t=>t.s===0);
  const zx=Math.floor(mine.x/16)*16+56,zy=Math.floor(mine.y/16)*16-8;   // two squares right of the token's square

  // the DM puts out a torch above the token, places a zone to its right, links the torch and writes a message
  await dm.keyboard.press('o');await dm.click('#o-torch');await clickMap(dm,mine.x,mine.y-56);
  await dm.keyboard.press('v');await clickMap(dm,mine.x,mine.y-56);await dm.click('#selbar [aria-label="Put it out"]');
  const lit0=(await S(dm)).st.objects.filter(o=>o.k==='torch'&&!o.off).length;
  await dm.keyboard.press('o');await dm.click('#o-zone');await clickMap(dm,zx,zy);
  if(await dm.isHidden('#zoneedit'))fail('placing a zone should open its editor');
  await dm.fill('#zname','Creaky board');await dm.fill('#zmsg','The floorboard creaks. A torch flares up.');
  await dm.click('#zlink');await clickMap(dm,mine.x,mine.y-58);await dm.click('#zlink');
  const z=(await S(dm)).st.objects.find(o=>o.k==='zone');if(!z||z.tg.length!==1)fail('torch should be linked: '+JSON.stringify(z));
  await dm.click('#zdone');await dm.keyboard.press('v');await dm.keyboard.press('Escape');
  await until(async()=>(await S(p1)).st.objects.some(o=>o.k==='zone'),'player gets the map with the zone');

  // the zone is drawn on the DM's screen only (its dashed border colour along the top edge)
  const edge=async p=>p.evaluate(()=>{const d=window.__dustmap(),o=d.st.objects.find(o=>o.k==='zone');const cv=document.getElementById('map'),g=cv.getContext('2d'),k=cv.width/cv.clientWidth;
    const w=o.w*16,h=o.h*16;let n=0;for(let a=0;a<=40;a++){const x=(o.x-w/2+w*a/40-d.cam.x)*d.Z*k,y=(o.y+h/2-d.cam.y)*d.Z*k;
      for(let dy=-2;dy<=2;dy++){const q=g.getImageData(Math.round(x),Math.round(y)+dy,1,1).data;if(Math.abs(q[0]-200)<14&&Math.abs(q[1]-180)<14&&Math.abs(q[2]-255)<14)n++}}return n});
  await wait(300);if(!(await edge(dm)>0))fail('DM should see the zone');if(await edge(p1)>0)fail('player should not see the zone');
  await dm.screenshot({path:path.join(OUT,'zones_mp_dm.png')});

  // the player walks through it
  await dragMap(p1,[mine.x,mine.y-10],[mine.x+112,mine.y-10]);
  await until(async()=>(await S(dm)).st.objects.find(o=>o.k==='zone').done,'the DM page sets the zone off');
  await until(async()=>(await S(p1)).st.objects.some(o=>o.k==='torch'&&!o.off&&o.x===z.x)||(await S(p1)).st.objects.filter(o=>o.k==='torch'&&!o.off).length>lit0,'player sees the torch lit');
  await until(async()=>/floorboard creaks/.test(await p1.textContent('#portmsg'))&&await p1.isVisible('#portmsg'),'player sees the message');
  if(!(await p1.isHidden('#zoneask')))fail('players never get the Fire / Skip card');
  await p1.screenshot({path:path.join(OUT,'zones_mp_player.png')});

  for(const p of pages)if(p.errs.length)fail(p.id+' page errors: '+p.errs.join(' | '));
  console.log('PASS: trigger zones in a live session');
}catch(e){console.log('FAIL',e.message);code=1}finally{await b.close();process.exit(code)}})();
