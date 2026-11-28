const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
// Hidden tokens for ambushes, in a live session: the DM places an enemy with Place hidden ticked. The player's page never
// receives it while the DM sees it ghosted. Reveal brings it in for the player with an entrance (springs up, drops in or a
// puff of smoke); Reveal all hidden brings several in one after another; undo hides it again; a player who joins later
// doesn't replay entrances; killing a hidden token shows players nothing. Also writes a frame sheet of each entrance.
// Uses tests/mock_claude_runtime.js in place of claude.ai's db / room / user.
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
const install=require('./mock_claude_runtime.js');
const fail=m=>{throw new Error(m)};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,what,ms=6000){const t0=Date.now();for(;;){const v=await fn();if(v)return v;if(Date.now()-t0>ms)fail('timed out: '+what);await wait(100)}}
const NAMES={u_dm:'Hunter',u_p1:'Alex',u_p2:'Sam'};

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
  const sent=()=>((store.get('live/tokens')||{}).list||[]);
  // zoom a page in around a map point, a few wheel clicks
  const zoomAt=async(p,x,y,n)=>{const q=await scr(p,x,y);await p.mouse.move(...q);for(let k=0;k<n;k++){await p.mouse.wheel(0,-100);await wait(120)}};

  const dm=await open('u_dm',{owner:true,admin:true});
  const p1=await open('u_p1');
  await dm.click('#mpbtn');await dm.click('#mpbody button:has-text("Start session")');
  await until(async()=>(await S(dm)).role==='dm','DM role');
  await until(async()=>(await S(p1)).role==='player','player role');
  await p1.waitForTimeout(500);if(await p1.locator('#mpmodal').isHidden())await p1.click('#mpbtn');await p1.locator('.mppick .tokbtn').nth(0).click();await p1.click('#mpplay');
  await until(async()=>{const s=store.get('live/session');return s&&s.assign&&s.assign['0']==='u_p1'},'assignment saved');
  await dm.click('#mpclose').catch(()=>{});await until(async()=>p1.evaluate(()=>document.getElementById('mpmodal').hidden),'picker closes');
  const mine=(await S(p1)).st.tokens.find(t=>t.s===0);
  const ex=Math.floor(mine.x/16)*16+56,ey=Math.floor(mine.y/16)*16+8;   // three squares right of the player's token
  const n0=(await S(p1)).st.tokens.length;

  // Place hidden is in the Tokens tray for the DM, not for players
  await dm.keyboard.press('t');if(!(await dm.isVisible('#thide')))fail('the DM should see Place hidden in the Tokens tray');
  await dm.click('#tg-Enemies');await dm.click('#toks .sw[aria-label="Rattlesnake"]');if(await dm.isVisible('#tokvars'))await dm.click('#tk-44');
  await dm.click('#thide');await clickMap(dm,ex,ey);
  await dm.click('#thide');await dm.keyboard.press('Escape');
  const snake=(await S(dm)).st.tokens.find(t=>t.s===44);if(!snake||snake.hd!==1)fail('a token placed with Place hidden should be hidden: '+JSON.stringify(snake));
  await wait(1200);
  if(sent().some(t=>t.s===44))fail('a hidden token should never be sent to players');
  if((await S(p1)).st.tokens.some(t=>t.s===44))fail('the player should not have the hidden token');
  await zoomAt(p1,ex-24,ey-10,4);await zoomAt(dm,ex-24,ey-10,4);await wait(300);
  await dm.screenshot({path:path.join(OUT,'hidden_dm_ghost.png')});await p1.screenshot({path:path.join(OUT,'hidden_player_before.png')});

  // the DM's bar: Reveal and the entrance; the player preview leaves it out
  await dm.keyboard.press('v');await clickMap(dm,snake.x,snake.y-6);
  if(!(await dm.locator('#selbar button[aria-label="Reveal"]').count()))fail('a hidden token should offer Reveal');
  const ent=dm.locator('#selbar button[aria-label^="Entrance:"]');if((await ent.getAttribute('aria-label'))!=='Entrance: Springs up')fail('default entrance should be Springs up');
  await dm.screenshot({path:path.join(OUT,'hidden_dm_selected.png')});

  // Reveal: the player gets it, with the entrance playing
  await dm.locator('#selbar button[aria-label="Reveal"]').click();
  const snakeP=await until(async()=>(await S(p1)).st.tokens.find(t=>t.s===44),'the player gets the revealed snake');
  if(!((await S(p1)).ents>0||(await S(dm)).ents>0))fail('the entrance should play');
  await until(async()=>(await S(p1)).ents>0||(await S(p1)).st.tokens.some(t=>t.s===44),'entrance on the player');
  if((await S(dm)).st.tokens.find(t=>t.s===44).hd)fail('revealed token should not be hidden');
  if(!(await dm.locator('#selbar button[aria-label="Hide from players"]').count()))fail('a shown token should offer Hide from players');

  // undo hides it again for the player
  await dm.keyboard.press('Escape');await dm.keyboard.press('Control+z');
  await until(async()=>!(await S(p1)).st.tokens.some(t=>t.s===44),'undo hides it from the player again');

  // two more hidden: drop in for one, smoke for the other, then Reveal all hidden
  await dm.keyboard.press('t');await dm.click('#thide');await clickMap(dm,ex+32,ey);await clickMap(dm,ex+64,ey);await dm.click('#thide');await dm.keyboard.press('Escape');
  const hidden=(await S(dm)).st.tokens.filter(t=>t.hd);if(hidden.length!==3)fail('three hidden tokens expected, got '+hidden.length);
  await dm.keyboard.press('v');await clickMap(dm,ex+32,ey-6);
  await ent.click();if((await ent.getAttribute('aria-label'))!=='Entrance: Drops in')fail('entrance should cycle to Drops in: '+(await ent.getAttribute('aria-label'))+' '+(await S(dm)).entStyle+JSON.stringify((await S(dm)).sel));
  if(!(await dm.locator('#selbar button[aria-label="Reveal all hidden (3)"]').count()))fail('Reveal all hidden (3) expected');
  await dm.locator('#selbar button[aria-label="Reveal all hidden (3)"]').click();
  await until(async()=>(await S(p1)).st.tokens.filter(t=>t.s===44).length===3,'all three reach the player');
  const pe=(await S(p1)).ents;if(pe<2)fail('player should play several entrances, got '+pe);
  await wait(250);await p1.screenshot({path:path.join(OUT,'hidden_player_reveal_all.png')});
  const dropped=(await S(p1)).st.tokens.filter(t=>t.s===44);if(dropped.some(t=>t.re!=='d'))fail('entrance style should travel with the token');
  if((await S(p1)).st.tokens.length!==n0+3)fail('only the three snakes should be added');

  // a player who joins now sees them standing there, no entrance replayed
  const p2=await open('u_p2');await until(async()=>(await S(p2)).st.tokens.filter(t=>t.s===44).length===3,'late player gets the snakes');
  if((await S(p2)).ents)fail('a late joiner should not replay entrances');

  // killing a hidden token tells players nothing
  await dm.keyboard.press('Escape');
  {const d=await S(dm),i=d.st.tokens.findIndex(t=>t.s===44);await clickMap(dm,d.st.tokens[i].x,d.st.tokens[i].y-6)}
  await dm.locator('#selbar button[aria-label="Hide from players"]').click();
  await until(async()=>(await S(p1)).st.tokens.filter(t=>t.s===44).length===2,'hidden again for the player');
  await dm.keyboard.press('k');await wait(900);
  if((await S(p1)).kills)fail('killing a hidden token should not play on players’ pages');

  // frame sheet of the three entrances, on a solo page
  const solo=await b.newPage({viewport:{width:900,height:700}});solo.errs=[];solo.on('pageerror',e=>solo.errs.push(e.message));pages.push(solo);solo.id='solo';
  await solo.addInitScript('window.__starterExample=true');await solo.goto(PAGE);await solo.waitForTimeout(1200);
  const frames=[];
  for(const st of ['Springs up','Drops in','Puff of smoke']){
    const t=(await S(solo)).st.tokens[0];await solo.keyboard.press('v');await clickMap(solo,t.x,t.y-6);
    if(await solo.locator('#selbar button[aria-label="Hide from players"]').count())await solo.locator('#selbar button[aria-label="Hide from players"]').click();
    for(let k=0;k<3&&(await solo.locator('#selbar button[aria-label^="Entrance:"]').getAttribute('aria-label'))!=='Entrance: '+st;k++)await solo.locator('#selbar button[aria-label^="Entrance:"]').click();
    await solo.locator('#selbar button[aria-label="Reveal"]').click();await solo.keyboard.press('Escape');
    for(const ms of [60,160,280,420,600,850]){await solo.evaluate(ms=>window.__entClock(ms),ms);await wait(60);
      const q=await scr(solo,t.x,t.y-14),Z=(await S(solo)).Z;frames.push({st,ms,buf:await solo.screenshot({clip:{x:q[0]-34*Z,y:q[1]-40*Z,width:68*Z,height:62*Z}})})}
    await solo.evaluate(()=>window.__entClock(null));await wait(1300)}
  // stitch: one row per entrance
  const sheet=await b.newPage({viewport:{width:1200,height:800}});
  await sheet.setContent('<body style="margin:0;background:#1d1b22;color:#ddd;font:13px sans-serif">'+['Springs up','Drops in','Puff of smoke'].map(s=>'<div style="display:flex;gap:6px;align-items:center;padding:6px"><div style="width:90px">'+s+'</div>'+frames.filter(f=>f.st===s).map(f=>`<div style="text-align:center"><img style="height:150px;image-rendering:pixelated" src="data:image/png;base64,${f.buf.toString('base64')}"><div>${f.ms} ms</div></div>`).join('')+'</div>').join('')+'</body>');
  await sheet.screenshot({path:path.join(OUT,'hidden_entrances_sheet.png'),fullPage:true});

  for(const p of pages)if(p.errs.length)fail(p.id+' page errors: '+p.errs.join(' | '));
  console.log('PASS: hidden tokens and reveal entrances');
}catch(e){console.log('FAIL',e.message);code=1}finally{await b.close();process.exit(code)}})();
