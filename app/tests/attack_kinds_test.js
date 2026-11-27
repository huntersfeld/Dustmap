const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
// Attack kinds in a live session: the player picks what their attack looks like in the Attack tool's tray (or Auto, from
// their class or token), the kind rides on the throw to the DM's page, and every kind draws without errors in flight and
// on landing. Also checks the spell / damage-type mapping hook (window.dustmapAttack) and a one-shot armed kind.
// Saves a contact sheet of every kind (in flight and landing) to tests/output/attack_kinds_*.png.
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
const install=require('./mock_claude_runtime.js');
const fail=m=>{throw new Error(m)};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,what,ms=6000){const t0=Date.now();for(;;){const v=await fn();if(v)return v;if(Date.now()-t0>ms)fail('timed out: '+what);await wait(100)}}
const NAMES={u_dm:'Hunter',u_p1:'Alex'};
const KINDS=['thrown','melee','arrow','shot','fire','frost','lightning','arcane','radiant','necrotic','acid','sonic'];

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
  const clickMap=async(p,x,y)=>{await p.mouse.click(...await scr(p,x,y));await p.waitForTimeout(120)};

  // the mapping hook needs no session
  const dm=await open('u_dm',{owner:true,admin:true});
  const map=await dm.evaluate(()=>{const f=window.dustmapAttack.kindFor;return{
    fb:f({spell:'Fire Bolt',damage:'Fire'}),rof:f({spell:'Ray of Frost',damage:'cold'}),vm:f({spell:'Vicious Mockery',damage:'Psychic'}),eb:f({spell:'Eldritch Blast',damage:'force'}),
    tw:f({damage:'Thunder'}),poison:f({damage:'poison'}),sf:f({spell:'Sacred Flame',damage:'radiant'}),ct:f({spell:'Chill Touch'}),
    lb:f({weapon:'Longbow',damage:'piercing',ranged:true}),pistol:f({weapon:'Pistol',damage:'piercing',ranged:true}),sword:f({weapon:'Longsword',damage:'slashing'}),
    dag:f({weapon:'Dagger',damage:'piercing',ranged:true}),ranger:f({cls:'Ranger (Gloom Stalker) 5'}),multi:f({cls:'Wizard (Evocation) 5 / Fighter 2'}),
    bard:f({cls:'Bard 3'}),none:f({}),kinds:window.dustmapAttack.kinds.map(k=>k.k)}});
  const want={fb:'fire',rof:'frost',vm:'sonic',eb:'arcane',tw:'sonic',poison:'acid',sf:'radiant',ct:'necrotic',lb:'arrow',pistol:'shot',sword:'melee',dag:'thrown',ranger:'arrow',multi:'arcane',bard:'sonic',none:'thrown'};
  for(const[k,v]of Object.entries(want))if(map[k]!==v)fail(`kindFor ${k}: got ${map[k]}, want ${v}`);
  if(map.kinds.join()!==KINDS.join())fail('kinds: '+map.kinds);

  const p1=await open('u_p1');
  await dm.click('#mpbtn');await dm.click('#mpbody button:has-text("Start session")');
  await until(async()=>(await S(dm)).role==='dm','DM role');
  await until(async()=>(await S(p1)).role==='player','player role');
  await p1.waitForTimeout(500);if(await p1.locator('#mpmodal').isHidden())await p1.click('#mpbtn');
  await p1.locator('.mppick .tokbtn').nth(3).click();await p1.click('#mpplay');   // the Wizard
  await until(async()=>{const s=store.get('live/session');return s&&s.assign&&s.assign['3']==='u_p1'},'assignment saved');
  await dm.click('#mpclose').catch(()=>{});await until(async()=>p1.evaluate(()=>document.getElementById('mpmodal').hidden),'picker closes');
  const mine=(await S(p1)).st.tokens.find(t=>t.s===3);
  const ex=Math.floor(mine.x/16)*16+72,ey=Math.floor(mine.y/16)*16+8;   // four squares right of the Wizard
  await dm.keyboard.press('t');await dm.click('#tg-Enemies');await dm.click('#toks .sw[aria-label="Rattlesnake"]');
  if(await dm.isVisible('#tokvars'))await dm.click('#tk-44');
  await clickMap(dm,ex,ey);await dm.keyboard.press('Escape');
  const snake=await until(async()=>(await S(p1)).st.tokens.find(t=>t.s===44),'player gets the rattlesnake');

  // Attack tool: the tray shows the kind; Auto on the Wizard token (no character card) is arcane
  await p1.click('#t-attack');await until(async()=>p1.isVisible('#atkbtn'),'kind button in the tray');
  if(!/Arcane · auto/.test(await p1.textContent('#atkbtn')))fail('Auto on the Wizard should be arcane: '+await p1.textContent('#atkbtn'));
  if(!/cast/.test(await p1.textContent('#hint')))fail('hint should say cast: '+await p1.textContent('#hint'));
  const last=async()=>{const th=(await S(p1)).th;return th[th.length-1]};
  await clickMap(p1,snake.x,snake.y-6);
  if((await last()).c!=='arcane'||(await last()).id!==snake.id)fail('a click should cast arcane at the snake: '+JSON.stringify(await last()));
  await until(async()=>(await S(dm)).throws>0||(await S(dm)).hits>0,'the DM sees it');
  await wait(400);

  // the picker: pick Fire, the next attack is fire and is remembered
  await p1.click('#atkbtn');if(await p1.isHidden('#atkpop'))fail('the picker should open');
  await p1.screenshot({path:path.join(OUT,'attack_kinds_picker.png')});
  await p1.click('#atk-fire');if(!(await p1.isHidden('#atkpop')))fail('the picker should close after a pick');
  if(!/Fire/.test(await p1.textContent('#atkbtn')))fail('tray should show Fire');
  await clickMap(p1,snake.x,snake.y-6);if((await last()).c!=='fire')fail('should cast fire');
  if(await p1.evaluate(()=>localStorage.getItem('dustmap-attack'))!=='fire')fail('the pick should be remembered');
  await wait(400);

  // armed by a spell panel: one lightning attack, then back to fire
  await p1.evaluate(()=>window.dustmapAttack.arm('lightning'));if(!/Lightning · next attack/.test(await p1.textContent('#atkbtn')))fail('armed kind should show');
  await clickMap(p1,snake.x,snake.y-6);if((await last()).c!=='lightning')fail('armed attack should be lightning');
  await wait(400);await clickMap(p1,snake.x,snake.y-6);if((await last()).c!=='fire')fail('then back to fire');

  // every kind, from the DM's page (it receives the kind on presence) and the player's, in flight and landing
  await dm.evaluate(()=>{});await wait(900);
  for(const p of[p1,dm]){await p.mouse.move(...await scr(p,mine.x+36,mine.y-20));for(let i=0;i<7;i++){await p.mouse.wheel(0,-120);await wait(80)}await p.addStyleTag({content:'#hint{opacity:0}'});await wait(200)}
  const vis=async p=>{const a=await scr(p,mine.x,mine.y),c=await scr(p,snake.x,snake.y);return a[0]>0&&c[0]<1280&&a[1]>0&&c[1]<860};if(!(await vis(p1))||!(await vis(dm)))fail('zoomed view should hold both tokens');
  const shots={p1:[],dm:[]};
  for(const k of KINDS){
    await p1.evaluate(k=>{document.getElementById('atkbtn').click();document.getElementById('atk-'+k).click()},k);
    const before=(await S(dm)).throws;await wait(380);
    // aim with the Attack tool on alternate kinds (a drag), click on the others
    const sm=(await S(p1)).st.tokens.find(t=>t.s===44);await clickMap(p1,sm.x,sm.y-6);
    if((await last()).c!==k)fail('throw should carry '+k+': '+JSON.stringify(await last()));
    await until(async()=>(await S(dm)).throws>before||(await S(dm)).hits>0,'DM plays '+k);
    const d=await p1.evaluate(()=>window.__dustmap());
    const clip=async(p,tag)=>{const a=await scr(p,mine.x-12,mine.y-76),c=await scr(p,sm.x+24,sm.y+12);return p.screenshot({clip:{x:a[0],y:a[1],width:c[0]-a[0],height:c[1]-a[1]}})};
    const fl={fire:.35,necrotic:.4,arcane:.4,acid:.4,sonic:.35,thrown:.4,radiant:.3,frost:.3}[k]||.15;
    await wait(Math.round(fl*180));shots.p1.push([k,'start',await clip(p1)]);
    await wait(Math.round(fl*220));shots.p1.push([k,'flight',await clip(p1)]);
    await wait(380);shots.p1.push([k,'land',await clip(p1)]);shots.dm.push([k,'land',await clip(dm)]);
    await wait(700)}
  // a contact sheet
  const sheet=await b.newPage({viewport:{width:1400,height:900}});
  const imgs=shots.p1.map(([k,ph,buf])=>`<figure><img src="data:image/png;base64,${buf.toString('base64')}"><figcaption>${k} · ${ph}</figcaption></figure>`).join('');
  await sheet.setContent(`<style>body{background:#1d1b22;color:#ddd;font:12px sans-serif;margin:8px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px}figure{margin:0}img{width:100%;image-rendering:pixelated}</style>${imgs}`);
  await sheet.screenshot({path:path.join(OUT,'attack_kinds_sheet.png'),fullPage:true});
  for(const p of pages)if(p.errs.length)fail(p.id+' page errors: '+p.errs.join(' | '));
  console.log('PASS: attack kinds');
}catch(e){console.log('FAIL',e.message);code=1}finally{await b.close();process.exit(code)}})();
