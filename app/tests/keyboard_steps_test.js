const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
// Keyboard steps: a selected token moves one square per arrow / WASD press, two keys step diagonally, the steps are
// counted next to the token, one undo takes the walk back, the map edge blocks, and D still means shape mode with no token.
// Then a live session (mocked claude.ai runtime): a player walks their own token with the keys, fast presses all land on
// the DM's page, the DM sees the count, and keys never move someone else's token.
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
const install=require('./mock_claude_runtime.js');
const fail=m=>{throw new Error(m)};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,what,ms=5000){const t0=Date.now();for(;;){const v=await fn();if(v)return v;if(Date.now()-t0>ms)fail('timed out: '+what);await wait(100)}}
const NAMES={u_dm:'Hunter',u_p1:'Alex'};
const S=p=>p.evaluate(()=>window.__dustmap());
const scr=async(p,x,y)=>{const d=await S(p),box=await (await p.$('#map')).boundingBox();return[box.x+(x-d.cam.x)*d.Z,box.y+(y-d.cam.y)*d.Z]};
const tap=async(p,k)=>{await p.keyboard.press(k);await p.waitForTimeout(90)};

(async()=>{const b=await chromium.launch();let code=0;
try{
  // ---------- solo ----------
  {const ctx=await b.newContext({viewport:{width:1280,height:860}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await ctx.addInitScript('window.__starterExample=true');await p.goto(PAGE);await p.waitForTimeout(1200);
    let d=await S(p);const i=d.st.tokens.findIndex(t=>t.s===0),t0={...d.st.tokens[i]};
    // nothing selected: arrows do nothing
    await tap(p,'ArrowRight');if((await S(p)).st.tokens[i].x!==t0.x)fail('arrow moved a token with nothing selected');
    await p.mouse.click(...await scr(p,t0.x,t0.y-10));await p.waitForTimeout(150);d=await S(p);
    if(!d.sel||d.sel.type!=='token'||d.sel.i!==i)fail('click did not select the token');
    const h0=d.hist;
    const x0=Math.round(t0.x/8)*8,y0=Math.round(t0.y/8)*8;
    await tap(p,'ArrowRight');await tap(p,'ArrowRight');await tap(p,'ArrowDown');
    d=await S(p);let t=d.st.tokens[i];if(t.x!==x0+32||t.y!==y0+16)fail(`arrows: expected ${x0+32},${y0+16} got ${t.x},${t.y}`);
    if(!d.ks||d.ks.n!==2)fail('right, right, down is one straight step and one diagonal (2), got '+JSON.stringify(d.ks));
    // WASD
    await tap(p,'a');await tap(p,'w');d=await S(p);t=d.st.tokens[i];if(t.x!==x0+16||t.y!==y0)fail('WASD did not step');
    if(d.ks.n!==3)fail('count after WASD (left, then up as a diagonal) should be 3, got '+d.ks.n);
    if(d.tool!=='select')fail('D/A/W switched tools while a token was selected');
    // two keys together: one diagonal step
    await p.keyboard.down('ArrowDown');await p.keyboard.down('ArrowRight');await p.waitForTimeout(80);await p.keyboard.up('ArrowRight');await p.keyboard.up('ArrowDown');await p.waitForTimeout(80);
    d=await S(p);t=d.st.tokens[i];if(t.x!==x0+32||t.y!==y0+16)fail(`diagonal: got ${t.x},${t.y}`);if(d.ks.n!==4)fail('a diagonal counts as one step, got '+d.ks.n);
    if(!(await p.textContent('#hint')).includes('WASD'))fail('hint should mention the keys');
    // left then up, one key after the other, is one diagonal: 5 ft, drawn through the square
    {const c0=(await S(p)).ks.n,l0=(await S(p)).ks.path.length;await tap(p,'ArrowLeft');await tap(p,'ArrowUp');d=await S(p);
     if(d.ks.n!==c0+1)fail('left then up should count as one diagonal step, got '+(d.ks.n-c0));
     const pa=d.ks.path,e=pa[pa.length-1],q=pa[pa.length-2];if(pa.length!==l0+1||Math.abs(e[0]-q[0])!==16||Math.abs(e[1]-q[1])!==16)fail('the path should cut through the square: '+JSON.stringify(pa.slice(-3)));
     // ...but only in pairs: a third step is a new square
     await tap(p,'ArrowRight');if((await S(p)).ks.n!==c0+2)fail('the step after a diagonal counts');
     await tap(p,'ArrowDown');if((await S(p)).ks.n!==c0+2)fail('right then down should pair up too');
     await tap(p,'ArrowRight');await tap(p,'ArrowRight');if((await S(p)).ks.n!==c0+4)fail('straight steps each count')
     await tap(p,'ArrowLeft');await tap(p,'ArrowLeft');await tap(p,'ArrowUp');await tap(p,'ArrowDown');}
    d=await S(p);t=d.st.tokens[i];if(t.x!==x0+32||t.y!==y0+16)fail(`after the pairs: got ${t.x},${t.y}`);
    await until(async()=>(await S(p)).st.tokens[i].x===x0+32,'');
    {const c=await scr(p,x0+16,y0);await p.screenshot({path:path.join(OUT,'keyboard_steps.png'),clip:{x:Math.max(0,c[0]-200),y:Math.max(0,c[1]-160),width:400,height:280}})}
    // one undo takes back the whole walk
    if((await S(p)).hist!==h0+1)fail('a keyboard walk should be one undo step, got '+((await S(p)).hist-h0));
    await p.keyboard.press('Control+z');await p.waitForTimeout(200);d=await S(p);t=d.st.tokens[i];
    if(t.x!==x0||t.y!==y0)fail(`undo did not take the walk back: ${t.x},${t.y} vs ${x0},${y0}`);
    // Enter clears the path and count, the token stays put
    await p.mouse.click(...await scr(p,t.x,t.y-10));await p.waitForTimeout(150);await tap(p,'ArrowLeft');if(!(await S(p)).ks)fail('walk should count');
    {const tx=(await S(p)).st.tokens[i].x;await p.keyboard.press('Enter');await p.waitForTimeout(80);d=await S(p);if(d.ks)fail('Enter should clear the count');if(d.st.tokens[i].x!==tx)fail('Enter moved the token');
     await tap(p,'ArrowRight');if((await S(p)).ks.n!==1)fail('after Enter a new walk counts from 1');await p.keyboard.press('Enter');t=(await S(p)).st.tokens[i]}
    // Esc ends the count; a new walk starts at 0
    await p.mouse.click(...await scr(p,t.x,t.y-10));await p.waitForTimeout(150);await tap(p,'ArrowLeft');if((await S(p)).ks.n!==1)fail('new walk should count from 1');
    await p.keyboard.press('Escape');await p.waitForTimeout(100);if((await S(p)).ks)fail('Esc should end the count');
    // dragging resets the count
    await p.mouse.click(...await scr(p,(await S(p)).st.tokens[i].x,(await S(p)).st.tokens[i].y-10));await p.waitForTimeout(120);await tap(p,'ArrowUp');await tap(p,'ArrowUp');
    {t=(await S(p)).st.tokens[i];const a=await scr(p,t.x,t.y-10);await p.mouse.move(...a);await p.mouse.down();await p.mouse.move(a[0]+60,a[1],{steps:5});await p.mouse.up();await p.waitForTimeout(150)}
    if((await S(p)).ks)fail('a drag should end the keyboard count');
    // map edge blocks
    await p.evaluate(()=>{const d=window.__dustmap();d.st.tokens[0].x=d.st.cols*16-8});
    await p.mouse.click(...await scr(p,(await S(p)).st.tokens[0].x,(await S(p)).st.tokens[0].y-10));await p.waitForTimeout(150);
    if(((await S(p)).sel||{}).i!==0)fail('could not select edge token');
    const ex=(await S(p)).st.tokens[0].x;await tap(p,'ArrowRight');if((await S(p)).st.tokens[0].x!==ex)fail('stepped off the map');
    if((await S(p)).ks)fail('a blocked step should not count');
    // with no token selected, D still opens shape mode
    await p.keyboard.press('Escape');await tap(p,'d');if((await S(p)).tool!=='draw')fail('D should still pick shape mode with nothing selected');
    // other tools: arrows don't walk tokens
    if(errs.length)fail('page errors: '+errs.join('; '));
    await ctx.close();console.log('solo ok')}

  // ---------- a keyboard step onto a door goes through it ----------
  {const ctx=await b.newContext({viewport:{width:1280,height:860}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await ctx.addInitScript('window.__starterExample=true');await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
    const lib=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-library'))),curName=async()=>{const l=await lib();return l.maps.find(m=>m.id===l.cur).name};
    const home=await curName();
    await p.keyboard.press('n');await p.waitForTimeout(200);await p.selectOption('#newsize','20x14');await p.fill('#newname','Cellar');await p.press('#newname','Enter');await p.waitForTimeout(900);
    await p.click('#libbtn');await p.click('.libmap:has-text("'+home+'") button:has-text("Open")');await p.waitForTimeout(700);
    // stand the first cowboy on a square centre, put a door to the Cellar two squares to its right
    const t=await p.evaluate(()=>{const d=window.__dustmap(),t=d.st.tokens.find(t=>t.s===0);t.x=Math.floor(t.x/16)*16+8;t.y=Math.floor(t.y/16)*16+8;return{x:t.x,y:t.y}});
    await p.keyboard.press('o');await p.click('#oc-interact');await p.click('#o-door');await p.mouse.click(...await scr(p,t.x+32,t.y));await p.waitForTimeout(200);
    await p.selectOption('#ptto',{label:'Cellar'});await p.click('#ptdone');
    const door=(await S(p)).st.objects.find(o=>o.k==='door');if(!door||door.x!==t.x+32)fail('door not placed beside the token: '+JSON.stringify(door)+' '+JSON.stringify(t));
    await p.keyboard.press('v');await p.mouse.click(...await scr(p,t.x,t.y-10));await p.waitForTimeout(150);
    await tap(p,'ArrowRight');await p.waitForTimeout(400);if(await curName()!==home)fail('one step short of the door should stay home');
    await tap(p,'ArrowRight');await p.waitForTimeout(600);
    // only that token goes through (the rest of the party stays, so the map does too)
    if(await curName()!==home)fail('one token going through should keep the map open, got '+await curName());
    if((await S(p)).st.tokens.some(q=>q.s===0))fail('the token that stepped on the door should leave');
    {const l=await p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-library'))),c=l.maps.find(m=>m.name==='Cellar');
     const cel=await p.evaluate(id=>JSON.parse(localStorage.getItem('dustmap-map:'+id)),c.id);if(cel.tokens.filter(q=>q.s===0).length!==1)fail('it should arrive in the Cellar')}
    if((await S(p)).ks)fail('the step count should end when the token leaves');
    if(errs.length)fail('page errors: '+errs.join('; '));
    await ctx.close();console.log('door ok')}

  // ---------- live session ----------
  const store=new Map(),pres=new Map(),pages=[];
  // shared documents reach players 300 ms late, like a real network: steps keep coming before the DM's last push lands
  const broadcast=m=>Promise.all(pages.map(async p=>{if(m.t==='set'&&p.id!=='u_dm')await wait(300);return p.evaluate(m=>window.__hubRecv&&window.__hubRecv(m),m).catch(()=>{})}));
  async function open(id,{owner=false,admin=false}={}){
    const ctx=await b.newContext({viewport:{width:1280,height:860}});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
    await ctx.exposeBinding('__hubSend',async(src,m)=>{
      if(m.t==='hello'){await src.page.evaluate(m=>window.__hubRecv(m),{t:'init',store:[...store],peers:[...pres.values()]})}
      if(m.t==='set'){store.set(m.path,m.data);await broadcast(m)}
      if(m.t==='pres'){pres.set(m.peer,{peer:m.peer,by:m.by,kind:'viewer',guest:false,presence:m.presence});await broadcast(m)}});
    await ctx.addInitScript(`window.__starterExample=true;window.__names=${JSON.stringify(NAMES)};(${install.toString()})(${JSON.stringify({id,name:NAMES[id],owner,admin})})`);
    await p.goto(PAGE);await p.waitForTimeout(1200);pages.push(p);p.id=id;return p}
  const dm=await open('u_dm',{owner:true,admin:true});const p1=await open('u_p1');
  await dm.click('#mpbtn');await dm.click('#mpbody button:has-text("Start session")');
  await until(async()=>(await S(p1)).role==='player','player role');
  await p1.waitForTimeout(500);if(await p1.locator('#mpmodal').isHidden())await p1.click('#mpbtn');
  await p1.locator('.mppick .tokbtn').nth(3).click();await p1.click('#mpplay');   // Alex plays the Wizard
  await until(async()=>{const s=store.get('live/session');return s&&s.assign&&s.assign['3']==='u_p1'},'assignment');
  await until(async()=>p1.evaluate(()=>document.getElementById('mpmodal').hidden),'picker closes');
  await dm.click('#mpclose').catch(()=>{});
  await until(async()=>(await S(p1)).st.tokens.some(t=>t.s===3),'player has the wizard');
  const w0=(await S(p1)).st.tokens.find(t=>t.s===3),others=(await S(p1)).st.tokens.filter(t=>t.s!==3).map(t=>[t.id,t.x,t.y]);
  const wx=Math.round(w0.x/8)*8,wy=Math.round(w0.y/8)*8;
  // the player has nothing to select: the keys walk their own token. Five quick presses, faster than the DM's push.
  await p1.mouse.click(640,430);for(let k=0;k<4;k++){await p1.keyboard.press('ArrowRight');await p1.waitForTimeout(60)}await p1.keyboard.press('s');await p1.waitForTimeout(120);
  let pw=(await S(p1)).st.tokens.find(t=>t.id===w0.id);if(pw.x!==wx+64||pw.y!==wy+16)fail(`player keys: expected ${wx+64},${wy+16} got ${pw.x},${pw.y}`);
  await until(async()=>{const t=(await S(dm)).st.tokens.find(t=>t.id===w0.id);return t&&t.x===wx+64&&t.y===wy+16},'DM page took every quick step');
  await until(()=>{const t=(store.get('live/tokens')||{list:[]}).list.find(t=>t.id===w0.id);return t&&t.x===wx+64&&t.y===wy+16},'shared tokens updated');
  await p1.waitForTimeout(600);pw=(await S(p1)).st.tokens.find(t=>t.id===w0.id);if(pw.x!==wx+64)fail('player token jumped back after the DM push');
  if(((await S(p1)).ks||{}).n!==4)fail('player count should be 4 (the last right + down is a diagonal), got '+JSON.stringify((await S(p1)).ks));
  // more steps after the shared doc caught up still land
  // holding a key: a step every 150 ms for 1.5 s, while the DM's pushes keep arriving late
  {const bx=(await S(p1)).st.tokens.find(t=>t.id===w0.id).x;const xs=[];for(let k=0;k<10;k++){await p1.keyboard.press('ArrowLeft');for(let j=0;j<5;j++){await p1.waitForTimeout(30);xs.push((await S(p1)).st.tokens.find(t=>t.id===w0.id).x)}}
   for(let k=1;k<xs.length;k++)if(xs[k]>xs[k-1])fail('player token jumped back mid-walk: '+xs.join(','));
   await until(async()=>{const t=(await S(dm)).st.tokens.find(t=>t.id===w0.id);return t.x===bx-160},'DM page took every step of a long walk');
   await p1.waitForTimeout(800);if((await S(p1)).st.tokens.find(t=>t.id===w0.id).x!==bx-160)fail('player token jumped during a long walk');
   for(let k=0;k<10;k++){await p1.keyboard.press('ArrowRight');await p1.waitForTimeout(150)}
   await until(async()=>(await S(dm)).st.tokens.find(t=>t.id===w0.id).x===bx,'walk back')}
  await p1.keyboard.press('ArrowUp');await until(async()=>{const t=(await S(dm)).st.tokens.find(t=>t.id===w0.id);return t.y===wy},'later step lands');
  // the DM sees the player's count via presence
  const pn=((await S(p1)).ks||{}).n;await until(()=>{const pr=[...pres.values()].find(q=>q.by==='u_p1');let o=pr&&pr.presence;if(typeof o==='string')o=JSON.parse(o);return o&&o.ks&&o.ks.n===pn&&o.ks.id===w0.id},'count on presence');
  await dm.waitForTimeout(300);{const t=(await S(dm)).st.tokens.find(t=>t.id===w0.id),c=await scr(dm,t.x,t.y);await dm.screenshot({path:path.join(OUT,'keyboard_steps_dm_sees.png'),clip:{x:Math.max(0,c[0]-220),y:Math.max(0,c[1]-160),width:440,height:280}})}
  // nobody else's token moved
  for(const[id,x,y]of others){const t=(await S(dm)).st.tokens.find(t=>t.id===id);if(t&&(t.x!==x||t.y!==y))fail('another token moved: '+id)}
    // DM moves the wizard: the player's count starts over, and their next step comes from the new spot
  await dm.evaluate(id=>{const d=window.__dustmap(),t=d.st.tokens.find(t=>t.id===id);   // somewhere clear of the other tokens
    for(let y=72;y<d.st.rows*16-16;y+=16)for(let x=24;x<d.st.cols*16-24;x+=16)if(d.st.tokens.every(o=>o===t||Math.hypot(o.x-x,o.y-y)>48)){t.x=x;t.y=y;return}},w0.id);await dm.evaluate(()=>{window.dispatchEvent(new Event('focus'))});
  await dm.mouse.click(...await scr(dm,(await S(dm)).st.tokens.find(t=>t.id===w0.id).x,(await S(dm)).st.tokens.find(t=>t.id===w0.id).y-10));await dm.waitForTimeout(100);
  const dmY=(await S(dm)).st.tokens.find(t=>t.id===w0.id).y;await dm.keyboard.press('ArrowDown');await dm.waitForTimeout(150);const dmT=(await S(dm)).st.tokens.find(t=>t.id===w0.id);if(!(await S(dm)).sel||(await S(dm)).st.tokens[(await S(dm)).sel.i].id!==w0.id)fail('DM could not select the wizard');if(dmT.y!==dmY+16)fail('DM arrow did not step the selected player token: '+JSON.stringify(dmT));
  await until(async()=>{const t=(await S(p1)).st.tokens.find(t=>t.id===w0.id);return t.x===dmT.x&&t.y===dmT.y},'player sees the DM move',5000).catch(async e=>{console.log('dm',dmT,'p1',(await S(p1)).st.tokens.find(t=>t.id===w0.id),'store',(store.get('live/tokens')||{list:[]}).list.find(t=>t.id===w0.id),await p1.evaluate(()=>0));throw e});
  if((await S(p1)).ks)fail('player count should reset when the DM moves their token');
  await p1.keyboard.press('ArrowRight');await until(async()=>{const t=(await S(dm)).st.tokens.find(t=>t.id===w0.id);return t.x===dmT.x+16&&t.y===dmT.y},'player step from the new spot');
  for(const p of pages)if(p.errs.length)fail(p.id+' page errors: '+p.errs.join('; '));
  console.log('live ok')
}catch(e){console.error('FAIL:',e.message);code=1}
await b.close();process.exit(code)})();
