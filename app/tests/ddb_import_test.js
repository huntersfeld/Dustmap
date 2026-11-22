// D&D Beyond import: a direct read that's blocked (CORS) falls back to open-copy-paste; a pasted sheet becomes a card
// with the derived numbers; private sheets and junk get clear messages; the DM's card survives a reload; a player's own
// import reaches the DM's page and everyone's map, and HP the DM changes flows back to the player.
// Uses tests/mock_claude_runtime.js for the live part. Run `python3 app/build_dustmap.py` first.
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
const SHEET=fs.readFileSync(path.join(__dirname,'fixtures','ddb_character.json'),'utf8');
const install=require('./mock_claude_runtime.js');
const fail=m=>{throw new Error(m)};const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,what,ms=5000){const t0=Date.now();for(;;){const v=await fn();if(v)return v;if(Date.now()-t0>ms)fail('timed out: '+what);await wait(100)}}
const LINK='https://www.dndbeyond.com/characters/123456789/AbCdEf';
(async()=>{const b=await chromium.launch();let code=0;
try{
  // ---- solo DM ----
  const ctx=await b.newContext({viewport:{width:1280,height:860}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  let calls=0;await ctx.route('https://character-service.dndbeyond.com/**',r=>{calls++;r.abort()});   // what a browser's CORS block looks like to the page
  await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1200);
  const S=()=>p.evaluate(()=>window.__dustmap());
  const scr=async(x,y)=>{const d=await S(),box=await (await p.$('#map')).boundingBox();return[box.x+(x-d.cam.x)*d.Z,box.y+(y-d.cam.y)*d.Z]};
  const tok=(await S()).st.tokens.find(t=>t.s===0);
  await p.keyboard.press('v');await p.mouse.click(...await scr(tok.x,tok.y-12));await p.waitForTimeout(200);
  await p.click('#selbar button[aria-label="Add a character"]');
  if(await p.isHidden('#chmodal'))fail('character dialog should open from the selection bar');
  await p.fill('#chlink','not a link');await p.click('#chgo');
  if(!/doesn’t look like a D&D Beyond character link/.test(await p.textContent('#chbody')))fail('bad link message');
  await p.fill('#chlink',LINK);await p.click('#chgo');
  await until(()=>p.isVisible('#chpaste'),'falls back to paste when the direct read is blocked');
  if(calls<1)fail('should try the endpoint first');
  if(await p.getAttribute('#chopen','href')!=='https://character-service.dndbeyond.com/character/v5/character/123456789')fail('open link points at the JSON');
  await p.fill('#chpaste','{"success":false,"message":"An unexpected error has occurred","data":{"serverMessage":"Unauthorized Access Attempt."}}');
  await until(async()=>/isn’t public/.test(await p.textContent('#chbody')),'private sheet message');
  await p.fill('#chpaste','<html>nope');await p.dispatchEvent('#chpaste','paste');await p.waitForTimeout(100);
  if(!/isn’t the whole page/.test(await p.textContent('#chbody')))fail('junk paste message');
  await p.fill('#chpaste',SHEET);
  await until(async()=>(await p.textContent('.chtop b').catch(()=>''))==='Mara Dunwell','card shows after paste');
  const c=await p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-chars'))['0']);
  const want={name:'Mara Dunwell',race:'Hill Dwarf',cls:'Fighter (Battle Master) 3 / Rogue 2',lvl:5,hp:{max:45,cur:36,tmp:8},ac:19,ab:[17,14,15,10,12,8],spd:25};
  for(const[k,v]of Object.entries(want))if(JSON.stringify(c[k])!==JSON.stringify(v))fail(`${k}: got ${JSON.stringify(c[k])}, want ${JSON.stringify(v)}`);
  if(!c.img.startsWith('https://www.dndbeyond.com/avatars/'))fail('portrait kept');
  if(JSON.stringify(c).length>600)fail('summary should stay small: '+JSON.stringify(c).length);
  await p.click('#chbody .hprow button[aria-label="Lose 1 hit point"]');await p.fill('#chac','20');await p.press('#chac','Enter');
  await until(()=>p.evaluate(()=>{const c=JSON.parse(localStorage.getItem('dustmap-chars'))['0'];return c.hp.cur===35&&c.ac===20}),'HP and AC edits saved');
  await p.screenshot({path:path.join(OUT,'ddb_card.png')});
  await p.click('#chclose');await p.mouse.move(...await scr(tok.x,tok.y-12));await p.waitForTimeout(150);
  await p.screenshot({path:path.join(OUT,'ddb_hpbar.png'),clip:{...(await (async()=>{const[x,y]=await scr(tok.x,tok.y);return{x:x-160,y:y-120}})()),width:320,height:180}});
  await p.reload();await p.waitForTimeout(1000);
  if(!(await p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-chars'))['0'].name==='Mara Dunwell')))fail('card survives reload');
  // a server that answers (a proxy, or D&D Beyond allowing the origin) imports in one step
  await ctx.unroute('https://character-service.dndbeyond.com/**');
  await ctx.route('https://character-service.dndbeyond.com/**',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:SHEET.replace('"Mara Dunwell"','"Mara the Second"')}));
  const t2=(await S()).st.tokens.find(t=>t.s===1);await p.keyboard.press('v');await p.mouse.click(...await scr(t2.x,t2.y-12));await p.waitForTimeout(200);
  await p.click('#selbar button[aria-label="Add a character"]');await p.fill('#chlink','123456789');await p.press('#chlink','Enter');
  await until(async()=>(await p.textContent('.chtop b').catch(()=>''))==='Mara the Second','direct read works when allowed');
  if(errs.length)fail('page errors: '+errs.join(' | '));
  await ctx.close();

  // ---- live: a player imports their own ----
  const store=new Map(),pres=new Map(),pages=[];
  const broadcast=m=>Promise.all(pages.map(p=>p.evaluate(m=>window.__hubRecv&&window.__hubRecv(m),m).catch(()=>{})));
  async function open(id,o={}){const cx=await b.newContext({viewport:{width:1280,height:860}});const q=await cx.newPage();q.errs=[];q.on('pageerror',e=>q.errs.push(e.message));
    await cx.route('https://character-service.dndbeyond.com/**',r=>r.abort());
    await cx.exposeBinding('__hubSend',async(src,m)=>{
      if(m.t==='hello')await src.page.evaluate(m=>window.__hubRecv(m),{t:'init',store:[...store],peers:[...pres.values()]});
      if(m.t==='set'){store.set(m.path,m.data);await broadcast(m)}
      if(m.t==='pres'){pres.set(m.peer,{peer:m.peer,by:m.by,kind:'viewer',guest:false,presence:m.presence});await broadcast(m)}});
    await cx.addInitScript(`window.__names={u_dm:'Hunter',u_p1:'Alex'};(${install.toString()})(${JSON.stringify({id,name:id,owner:!!o.owner,admin:!!o.owner})})`);
    await q.goto(PAGE);await q.waitForTimeout(1200);pages.push(q);return q}
  const dm=await open('u_dm',{owner:true}),p1=await open('u_p1');
  await dm.click('#mpbtn');await dm.click('#mpbody button:has-text("Start session")');await dm.click('#mpclose');
  await until(()=>p1.evaluate(()=>window.__dustmap().role==='player'),'player role');
  await until(()=>p1.isVisible('.mppick .tokbtn'),'picker');await p1.locator('.mppick .tokbtn').nth(2).click();
  await until(()=>{const s=store.get('live/session');return s&&s.assign&&s.assign['2']==='u_p1'},'pick lands');
  await until(()=>p1.isVisible('#mychar'),'player tray offers their character');
  await p1.click('#mychar');await p1.fill('#chlink',LINK);await p1.click('#chgo');
  await until(()=>p1.isVisible('#chpaste'),'player gets the paste step');await p1.fill('#chpaste',SHEET);
  await until(async()=>(await p1.textContent('.chtop b').catch(()=>''))==='Mara Dunwell','player card');
  await until(()=>dm.evaluate(()=>{const c=JSON.parse(localStorage.getItem('dustmap-chars')||'{}')['2'];return c&&c.name==='Mara Dunwell'}),'DM page takes the player import for their token');
  await until(()=>{const d=store.get('live/chars');return d&&d.c&&d.c['2']&&d.c['2'].name==='Mara Dunwell'},'shared with the table');
  // the DM marks damage; the player's card follows
  await dm.evaluate(()=>window.__openChar(2));await dm.click('#chbody .hprow button[aria-label="Lose 1 hit point"]');
  await until(()=>p1.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-mychar')).hp.cur===35),'DM damage reaches the player');
  // player heals themselves; DM's page takes it
  await p1.click('#chbody .hprow button[aria-label="Gain 1 hit point"]');
  await until(()=>dm.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-chars'))['2'].hp.cur===36),'player change reaches the DM');
  const pe=pages.flatMap(q=>q.errs);if(pe.length)fail('page errors: '+pe.join(' | '));
  await p1.screenshot({path:path.join(OUT,'ddb_player.png')});
  console.log('PASS: D&D Beyond import (paste fallback, derived numbers, errors, live sync)')}
catch(e){console.log('FAIL: '+e.message);code=1}
await b.close();process.exit(code)})();
