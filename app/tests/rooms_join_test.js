const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
// Joining a room the DM isn't looking at: during a session the DM makes a fogged Cave (it starts without the party),
// sends a Party character nobody plays yet through a door into it, then a player joins and picks that character. The Cave
// stays a room (a Party character is in it), the player lands there with that token (no copy at home), and walk reveal
// clears around it. Uses tests/mock_claude_runtime.js in place of claude.ai's db / room / user.
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
const install=require('./mock_claude_runtime.js');
const fail=m=>{throw new Error(m)};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,what,ms=6000){const t0=Date.now();for(;;){const v=await fn();if(v)return v;if(Date.now()-t0>ms)fail('timed out: '+what);await wait(100)}}
const NAMES={u_dm:'Hunter',u_p1:'Alex',u_p2:'Sam'};

(async()=>{const b=await chromium.launch();let code=0;const pages=[];
try{
  const store=new Map(),pres=new Map();
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
  const idOf=async(p,n)=>(await lib(p)).maps.find(m=>m.name===n).id;
  const rolls=p=>p.evaluate(()=>window.__rooms.rolls());

  const dm=await open('u_dm',{owner:true,admin:true});
  const home=await curName(dm);
  const p1=await open('u_p1');
  await dm.click('#mpbtn');await dm.click('#mpbody button:has-text("Start session")');await dm.click('#mpclose').catch(()=>{});
  await until(async()=>(await S(dm)).role==='dm','dm');
  // during the session the DM makes a Cave (fogged, walk reveal) with a door home
  await dm.click('#newbtn');await dm.waitForTimeout(200);await dm.selectOption('#newsize','20x14');await dm.fill('#newname','Cave');await dm.press('#newname','Enter');await dm.waitForTimeout(900);
  if((await S(dm)).st.tokens.length)fail('a map made during a session should start without the party');
  await dm.keyboard.press('o');await dm.click('#oc-interact');await dm.click('#o-door');await clickMap(dm,296,40);await dm.selectOption('#ptto',{label:home});await dm.click('#ptdone');
  await dm.evaluate(()=>window.__rooms.fogAll());
  await dm.click('#libbtn');await dm.click('.libmap:has-text("'+home+'") button:has-text("Open")');await dm.waitForTimeout(700);
  let st=(await S(dm)).st;const W=st.cols*16,H=st.rows*16,dx=Math.floor((W-24)/16)*16+8,dy=Math.floor((H-24)/16)*16+8;
  await dm.click('#oc-interact');await dm.click('#o-door');await clickMap(dm,dx,dy);await dm.selectOption('#ptto',{label:'Cave'});await dm.click('#ptdone');await dm.keyboard.press('v');
  // the DM puts cowboy 2 (nobody plays it yet) into the Cave
  const c2=(await S(dm)).st.tokens.find(t=>t.s===2);await dragMap(dm,[c2.x,c2.y-10],[dx,dy-10]);await wait(800);
  await until(async()=>(await S(dm)).rooms.length===2,'the Cave stays a room with a party character in it, though nobody plays it yet');
  await until(async()=>(await dm.locator('#roomtabs .roomtab').count())===2,'two tabs');
  if(!(await dm.locator('#roomtabs .roomtab:has-text("Cave") .rtx').count()))fail('a room nobody plays in can be closed from its tab');
  // Alex joins and picks cowboy 2
  await until(async()=>(await S(p1)).role==='player','player role');await p1.waitForTimeout(500);
  if(await p1.locator('#mpmodal').isHidden())await p1.click('#mpbtn');await p1.locator('.mppick .tokbtn').nth(2).click();await p1.click('#mpplay');
  // Alex joins the Cave, with the token the DM put there: no copy appears at home, and walk reveal clears around it
  await until(async()=>{const d=await S(p1);return d.st.cols===20&&d.st.tokens.some(t=>t.s===2)},'Alex is in the Cave with cowboy 2');
  await until(async()=>{const d=await S(p1);return d.fog&&d.fog.includes('0')&&d.fog.includes('1')},'the fog clears around the picked token');
  await wait(500);
  if((await S(dm)).st.tokens.some(t=>t.s===2))fail('no duplicate of the picked token at home');
  if((await S(p1)).st.tokens.length!==1)fail('Alex should only see their own token in the Cave');
  if(await dm.locator('#roomtabs .roomtab:has-text("Cave") .rtx').count())fail('a room a player is in has no close button');
  for(const p of pages)if(p.errs.length)fail(p.id+' page errors: '+p.errs.join(' | '));
  console.log('PASS: joining a character in a room the DM is not looking at');
}catch(e){console.log('FAIL',e.message);for(const p of pages){try{console.log(p.id,p.errs.join(' | '),JSON.stringify(await p.evaluate(()=>{const d=window.__dustmap();return{rooms:d.rooms,my:d.myRoom,toks:d.st.tokens.map(t=>[t.s,t.x,t.y]),cols:d.st.cols}})))}catch(_){}}code=1}finally{await b.close();process.exit(code)}})();
