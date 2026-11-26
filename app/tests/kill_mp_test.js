const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
// Kill and throwing in a live session: a player clicks an enemy and throws at it; once the DM marks it "next hit kills"
// (explode), the next throw kills it on every page and the gore arrives with the map. The DM's own Kill reaches players too.
// Players get no Kill button, K does nothing for them, and they never see the killable mark. Uses tests/mock_claude_runtime.js in place of claude.ai's db / room / user.
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
  const ex=Math.floor(mine.x/16)*16+56,ey=Math.floor(mine.y/16)*16+8;   // three squares right of the player's token

  // the DM drops a rattlesnake (Enemies) there
  await dm.keyboard.press('t');await dm.click('#tg-Enemies');await dm.click('#toks .sw[aria-label="Rattlesnake"]');
  if(await dm.isVisible('#tokvars'))await dm.click('#tk-44');
  await clickMap(dm,ex,ey);await dm.keyboard.press('Escape');
  const snake=await until(async()=>(await S(p1)).st.tokens.find(t=>t.s===44),'player gets the rattlesnake');
  const n0=(await S(p1)).st.tokens.length;

  // a player can't kill it with K, but clicking it throws something at it (the DM's page sees the throw; it isn't killable yet)
  await p1.keyboard.press('v');await clickMap(p1,snake.x,snake.y-6);
  if(!((await S(p1)).throws>0||(await S(p1)).hits>0))fail('clicking an enemy should throw at it');
  await until(async()=>{const d=await S(dm);return d.throws>0||d.hits>0},'the DM sees the throw');
  await wait(150);await p1.screenshot({path:path.join(OUT,'kill_mp_throw.png')});
  await p1.keyboard.press('k');await wait(900);
  if(await p1.locator('#selbar button[aria-label="Kill"]').count())fail('players get no Kill button');
  if(!(await S(p1)).st.tokens.some(t=>t.s===44)||(await S(dm)).st.tokens.every(t=>t.s!==44))fail('a hit on an unmarked enemy and K on a player page should not kill');
  // clicking your own token still drags it, never throws
  const th0=(await S(p1)).throws;await clickMap(p1,mine.x,mine.y-6);if((await S(p1)).throws!==th0)fail('clicking your own token should not throw');

  // the DM marks it: explode, next hit kills (players never get the mark)
  await dm.keyboard.press('v');await clickMap(dm,snake.x,snake.y-6);
  if(!(await dm.locator('#selbar button[aria-label="Kill"]').count()))fail('the DM should get Kill on an enemy');
  const style=dm.locator('#selbar button[aria-label^="Death:"]');if((await style.getAttribute('aria-label'))!=='Death: fall over')await style.click();
  await dm.locator('#selbar button[aria-label="Death: fall over"]').click();
  await dm.locator('#selbar button[aria-label="Next hit kills: off"]').click();
  if((await S(dm)).st.tokens.find(t=>t.s===44).kl!=='x')fail('the snake should be marked to explode');
  await dm.keyboard.press('Escape');await wait(600);
  if((await S(p1)).st.tokens.find(t=>t.s===44).kl)fail('players should not get the killable mark');

  // the player throws again: the DM's page kills it, everyone sees it explode, and the gore reaches the player
  await clickMap(p1,snake.x,snake.y-6);
  await until(async()=>(await S(p1)).kills>0,'player plays the death');
  await wait(200);await p1.screenshot({path:path.join(OUT,'kill_mp_explode.png')});
  await until(async()=>(await S(p1)).st.tokens.every(t=>t.s!==44),'the rattlesnake leaves the player map');
  await until(async()=>(await S(p1)).st.objects.some(o=>o.k==='gore'),'the gore reaches the player');
  if((await S(p1)).st.tokens.length!==n0-1)fail('only the rattlesnake should go');

  // the DM undoes it: back for the player too, then kills it straight from the bar (style back to fall over)
  await dm.keyboard.press('Control+z');
  await until(async()=>{const s=(await S(p1)).st;return s.tokens.some(t=>t.s===44)&&!s.objects.some(o=>o.k==='gore')},'undo reaches the player');
  await clickMap(dm,snake.x,snake.y-6);await dm.locator('#selbar button[aria-label="Death: explode"]').click();
  await dm.locator('#selbar button[aria-label="Kill"]').click();
  await until(async()=>(await S(p1)).st.objects.some(o=>o.k==='blood')&&(await S(p1)).st.tokens.every(t=>t.s!==44),'a plain kill reaches the player with its blood');

  for(const p of pages)if(p.errs.length)fail(p.id+' page errors: '+p.errs.join(' | '));
  console.log('PASS: kill and throwing in a live session');
}catch(e){console.log('FAIL',e.message);code=1}finally{await b.close();process.exit(code)}})();
