const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
// Players can't walk through walls: in a live session on Rattlesnake Deep a player's token stops at the cave wall (stone
// raised +2) when dragged or stepped with the arrow keys, a locked door is solid until the DM unlocks it, a tunnel still
// works, and a move that skips through rock (sent by hand) is refused by the DM's page and the token goes back.
// The DM still moves anything anywhere. Uses tests/mock_claude_runtime.js in place of claude.ai's db / room / user.
// Run after `python3 app/build_dustmap.py`.
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
const install=require('./mock_claude_runtime.js');
const fail=m=>{throw new Error(m)};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,what,ms=6000){const t0=Date.now();for(;;){const v=await fn();if(v)return v;if(Date.now()-t0>ms)fail('timed out: '+what);await wait(100)}}
const NAMES={u_dm:'Hunter',u_p1:'Alex'};
const ctr=(c,r)=>[c*16+8,r*16+8];

(async()=>{const b=await chromium.launch();let code=0;
try{
  const store=new Map(),pres=new Map(),pages=[];
  const broadcast=m=>Promise.all(pages.map(p=>p.evaluate(m=>window.__hubRecv&&window.__hubRecv(m),m).catch(()=>{})));
  async function open(id,{owner=false,admin=false}={}){
    const ctx=await b.newContext({viewport:{width:1400,height:950}});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
    await ctx.exposeBinding('__hubSend',async(src,m)=>{
      if(m.t==='hello'){await src.page.evaluate(m=>window.__hubRecv(m),{t:'init',store:[...store],peers:[...pres.values()]})}
      if(m.t==='set'){store.set(m.path,m.data);await broadcast(m)}
      if(m.t==='pres'){pres.set(m.peer,{peer:m.peer,by:m.by,kind:'viewer',guest:false,presence:m.presence});await broadcast(m)}});
    await ctx.addInitScript(`window.__starterExample=true;window.__names=${JSON.stringify(NAMES)};(${install.toString()})(${JSON.stringify({id,name:NAMES[id],owner,admin})})`);
    await p.goto(PAGE);await p.waitForTimeout(1200);pages.push(p);p.id=id;return p}
  const S=p=>p.evaluate(()=>window.__dustmap());
  const scr=async(p,x,y)=>{const d=await S(p),box=await (await p.$('#map')).boundingBox();return[box.x+(x-d.cam.x)*d.Z,box.y+(y-d.cam.y)*d.Z]};
  const dragMap=async(p,from,to)=>{const a=await scr(p,...from),c=await scr(p,...to);await p.mouse.move(...a);await p.mouse.down();
    for(let k=1;k<=16;k++){await p.mouse.move(a[0]+(c[0]-a[0])*k/16,a[1]+(c[1]-a[1])*k/16);await p.waitForTimeout(25)}await p.mouse.up();await p.waitForTimeout(300)};
  const tok=async p=>(await S(p)).st.tokens.find(t=>t.s===0);
  const level=(p,x,y)=>p.evaluate(([x,y])=>window.__walk.level(x,y),[x,y]);
  const msg=p=>p.evaluate(()=>{const m=document.getElementById('portmsg');return m.hidden?'':m.textContent});
  const dmSave=dm=>dm.evaluate(()=>window.__walk.save());
  const same=async(dm,p1)=>until(async()=>{const a=await tok(dm),c=await tok(p1);return a&&c&&a.x===c.x&&a.y===c.y},'the DM’s page takes the move');

  const dm=await open('u_dm',{owner:true,admin:true});
  await dm.click('#more');await dm.uncheck('#anim');await dm.click('#cave');await dm.waitForTimeout(2500);
  const p1=await open('u_p1');
  await dm.click('#mpbtn');await dm.click('#mpbody button:has-text("Start session")');
  await until(async()=>(await S(dm)).role==='dm','DM role');
  await until(async()=>(await S(p1)).role==='player','player role');
  await p1.waitForTimeout(500);if(await p1.locator('#mpmodal').isHidden())await p1.click('#mpbtn');await p1.locator('.mppick .tokbtn').nth(0).click();await p1.click('#mpplay');
  await until(async()=>{const s=store.get('live/session');return s&&s.assign&&s.assign['0']==='u_p1'},'assignment saved');
  await dm.click('#mpclose').catch(()=>{});await until(async()=>p1.evaluate(()=>document.getElementById('mpmodal').hidden),'picker closes');
  if(await dm.evaluate(()=>window.__walk.rule()))fail('the DM is never held back');
  if(!await p1.evaluate(()=>window.__walk.rule()))fail('players are held back');

  // the cave is solid rock at +2 with the rooms carved down to 0
  if(await level(dm,...ctr(0,34))!==2||await level(dm,...ctr(8,34))!==0)fail('rock should be +2 and the old adit 0');

  // put Alex's token in the middle of the old adit (room A)
  await dm.evaluate(([x,y])=>{const s=window.__dustmap().st;s.tokens=s.tokens.filter(t=>t.s===0||t.s>3);const t=s.tokens.find(t=>t.s===0);t.x=x;t.y=y},ctr(8,34));await dmSave(dm);
  await until(async()=>{const t=await tok(p1);return t&&t.x===136&&t.y===552},'the player sees the token in the adit');
  await p1.keyboard.press('0');await p1.waitForTimeout(300);

  // 1. dragging west into the rock: the token stops at the wall, on the floor
  await dragMap(p1,[136,546],[8,546]);
  let t=await tok(p1);
  if(t.x<=8||t.x>=120)fail('the token should stop at the west wall, is at '+t.x+','+t.y);
  if(await level(p1,t.x,t.y)!==0)fail('the token should stay on the cave floor, is at level '+await level(p1,t.x,t.y));
  if(!/steep/.test(await msg(p1)))fail('bumping the wall should say so, got: '+await msg(p1));
  await p1.screenshot({path:path.join(OUT,'walls_bump.png')});
  await same(dm,p1);const wallX=t.x;

  // 2. the arrow keys can't step into it either
  await p1.keyboard.press('ArrowLeft');await p1.waitForTimeout(400);
  t=await tok(p1);if(t.x!==wallX)fail('ArrowLeft into the wall should do nothing, x went '+wallX+' -> '+t.x);
  await p1.keyboard.press('ArrowRight');await p1.waitForTimeout(400);
  t=await tok(p1);if(t.x!==wallX+16)fail('ArrowRight away from the wall should step, x is '+t.x);
  await same(dm,p1);

  // 3. a locked door is solid until it's unlocked
  const door=ctr(9,34);
  await dm.evaluate(d=>{window.__dustmap().st.objects.push({k:'door',x:d[0],y:d[1],v:0,id:'test-door',lock:1})},door);await dmSave(dm);
  await until(async()=>(await S(p1)).st.objects.some(o=>o.id==='test-door'&&o.lock),'the player gets the locked door');
  t=await tok(p1);await dragMap(p1,[t.x,t.y-6],[ctr(13,34)[0],t.y-6]);
  t=await tok(p1);if(t.x>=door[0]-8)fail('a locked door should stop the token, it got to '+t.x);
  if(!/won’t open/.test(await msg(p1)))fail('the locked door should say so, got: '+await msg(p1));
  await p1.screenshot({path:path.join(OUT,'walls_door.png')});
  await dm.evaluate(()=>{const o=window.__dustmap().st.objects.find(o=>o.id==='test-door');delete o.lock});await dmSave(dm);
  await until(async()=>(await S(p1)).st.objects.some(o=>o.id==='test-door'&&!o.lock),'the player gets the unlocked door');
  t=await tok(p1);await dragMap(p1,[t.x,t.y-6],[ctr(13,34)[0],t.y-6]);
  t=await tok(p1);if(Math.abs(t.x-ctr(13,34)[0])>8)fail('an unlocked door lets the token by, it is at '+t.x);
  await same(dm,p1);

  // 4. the tunnel north to the bandit camp still works
  t=await tok(p1);await dragMap(p1,[t.x,t.y-6],[ctr(8,31)[0],ctr(8,31)[1]-6]);
  t=await tok(p1);await dragMap(p1,[t.x,t.y-6],[ctr(9,21)[0],ctr(9,21)[1]-6]);
  t=await tok(p1);if(Math.abs(t.x-152)>8||Math.abs(t.y-344)>8)fail('the tunnel should take the token up to the camp, it is at '+t.x+','+t.y);
  await same(dm,p1);const camp=[t.x,t.y];

  // 5. a move through solid rock sent by hand (into the hall of plates, which has no open way in): the DM's page refuses it
  await p1.evaluate(([x,y])=>{const t=window.__dustmap().st.tokens.find(t=>t.s===0);t.x=x;t.y=y;window.__walk.moved()},ctr(46,30));
  await until(async()=>{const t=await tok(p1);return t&&t.x===camp[0]&&t.y===camp[1]},'the player’s token goes back',8000);
  t=await tok(dm);if(t.x!==camp[0]||t.y!==camp[1])fail('the DM’s page should keep the token in the camp');
  if(await dm.evaluate(()=>window.__walk.reach([152,344],[744,488])))fail('the hall should be out of reach from the camp');
  if(!await dm.evaluate(()=>window.__walk.reach([152,344],[408,104])))fail('the grotto is reachable from the camp through the tunnels');

  // 6. the DM drags the same token straight through the rock
  await dm.keyboard.press('v');await dm.keyboard.press('0');await dm.waitForTimeout(300);
  await dragMap(dm,[camp[0],camp[1]-6],[ctr(30,30)[0],ctr(30,30)[1]-6]);
  t=await tok(dm);if(Math.abs(t.x-ctr(30,30)[0])>8||Math.abs(t.y-ctr(30,30)[1])>8)fail('the DM moves tokens anywhere, it is at '+t.x+','+t.y);

  for(const p of pages)if(p.errs.length)fail(p.id+' page errors: '+p.errs.join(' | '));
  console.log('walls_mp_test: all checks passed');
}catch(e){console.error('FAIL',e.message);code=1}
await b.close();process.exit(code)})();
