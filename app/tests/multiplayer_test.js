const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
// Play together: DM starts a session, players get the shared map live, a player moves only their own cowboy,
// pings / pointers / measures are shared, players' own maps are untouched, ending the session gives them back.
// Uses tests/mock_claude_runtime.js in place of claude.ai's db / room / user.
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
const install=require('./mock_claude_runtime.js');
const fail=m=>{throw new Error(m)};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,what,ms=5000){const t0=Date.now();for(;;){const v=await fn();if(v)return v;if(Date.now()-t0>ms)fail('timed out: '+what);await wait(100)}}
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
    await ctx.addInitScript(`window.__names=${JSON.stringify(NAMES)};(${install.toString()})(${JSON.stringify({id,name:NAMES[id],owner,admin})})`);
    await p.goto(PAGE);await p.waitForTimeout(1200);pages.push(p);p.id=id;return p}
  const S=p=>p.evaluate(()=>window.__dustmap());
  const scr=async(p,x,y)=>{const d=await S(p),box=await (await p.$('#map')).boundingBox();return[box.x+(x-d.cam.x)*d.Z,box.y+(y-d.cam.y)*d.Z]};
  const dragMap=async(p,from,to)=>{const a=await scr(p,...from),c=await scr(p,...to);await p.mouse.move(...a);await p.mouse.down();
    for(let k=1;k<=8;k++){await p.mouse.move(a[0]+(c[0]-a[0])*k/8,a[1]+(c[1]-a[1])*k/8);await p.waitForTimeout(30)}await p.mouse.up();await p.waitForTimeout(300)};

  const dm=await open('u_dm',{owner:true,admin:true});
  const p1=await open('u_p1');
  // a player's own map, to check it survives the session untouched
  await p1.keyboard.press('d');{const box=await (await p1.$('#map')).boundingBox();const c=[box.x+200,box.y+200];
    for(const[dx,dy]of[[0,0],[80,0],[80,60]])await p1.mouse.click(c[0]+dx,c[1]+dy);await p1.keyboard.press('Enter');await p1.waitForTimeout(300)}
  const p1Own=await p1.evaluate(()=>localStorage.getItem('dustmap-v2'));
  const p1OwnOps=JSON.parse(p1Own).ops.length;

  if(await dm.isHidden('#mpbtn'))fail('Play together button should show on claude.ai');
  // a viewer can't start a session
  await p1.click('#mpbtn');if(await p1.locator('#mpbody button',{hasText:'Start session'}).count())fail('viewer should not get Start session');
  await p1.click('#mpclose');

  // DM starts
  await dm.click('#mpbtn');await dm.click('#mpbody button:has-text("Start session")');
  await until(async()=>(await S(dm)).role==='dm','DM role');
  await until(async()=>(await S(p1)).role==='player','player role');
  const dmOps=JSON.stringify((await S(dm)).st.ops);
  await until(async()=>JSON.stringify((await S(p1)).st.ops)===dmOps,'player gets the DM map');
  if(!(await p1.evaluate(()=>document.body.classList.contains('mp-player'))))fail('player UI not restricted');
  if(await p1.isVisible('#clear')||await p1.isVisible('#libbtn')||await p1.isVisible('#t-draw'))fail('editing controls visible to player');
  if(!(await p1.isVisible('#t-measure')))fail('player should keep Measure');
  if((await p1.textContent('#mpbtn')).indexOf('Playing')<0)fail('player button label');

  // DM gives Alex the Wizard (sheet 3)
  await until(async()=>(await dm.locator('.mpp',{hasText:'Alex'}).count())>0,'Alex listed in the DM dialog');
  await dm.locator('.mpp',{hasText:'Alex'}).locator('select').selectOption('3');
  await until(async()=>{const s=store.get('live/session');return s&&s.assign&&s.assign['3']==='u_p1'},'assignment saved');
  await dm.click('#mpclose');
  await until(async()=>(await p1.textContent('#hint')).includes('Wizard'),'player hint shows their cowboy');

  // player drags the Wizard one square-ish right and down
  let tk=(await S(p1)).st.tokens;const wiz=tk.find(t=>t.s===3),har=tk.find(t=>t.s===0);
  await dragMap(p1,[wiz.x,wiz.y-10],[wiz.x+32,wiz.y-10+16]);
  const moved=(await S(p1)).st.tokens.find(t=>t.id===wiz.id);
  if(moved.x===wiz.x&&moved.y===wiz.y)fail('player could not drag their token');
  await until(async()=>{const t=(await S(dm)).st.tokens.find(t=>t.id===wiz.id);return t.x===moved.x&&t.y===moved.y},'DM page took the player move');
  await until(()=>{const t=(store.get('live/tokens')||{list:[]}).list.find(t=>t.id===wiz.id);return t&&t.x===moved.x&&t.y===moved.y},'move saved to the shared tokens');
  // ...and not someone else's
  await dragMap(p1,[har.x,har.y-10],[har.x+48,har.y-10]);
  if((await S(p1)).st.tokens.find(t=>t.id===har.id).x!==har.x)fail('player moved a token that is not theirs');

  // a forged move from someone who was not given that cowboy is ignored
  const p2=await open('u_p2',{admin:true});   // Sam has Editor access, so he can take over as DM later
  await until(async()=>(await S(p2)).role==='player','late joiner becomes a player');
  await until(async()=>JSON.stringify((await S(p2)).st.ops)===dmOps,'late joiner gets the map');
  await p2.evaluate(()=>window.claude.use('room').then(r=>r.presence({mv:{id:'__',x:0,y:0,n:99,base:999}})));
  const tokId=wiz.id;await p2.evaluate(async id=>{const r=await window.claude.use('room');await r.presence({mv:{id,x:40,y:60,n:5,base:999}})},tokId);
  await wait(600);if((await S(dm)).st.tokens.find(t=>t.id===tokId).x===40)fail('DM accepted a move from a player who does not own the token');

  // DM draws: players see it
  await dm.keyboard.press('d');{const box=await (await dm.$('#map')).boundingBox();const c=[box.x+box.width/2,box.y+box.height/2];
    for(const[dx,dy]of[[-40,-30],[40,-30],[40,30],[-40,30]])await dm.mouse.click(c[0]+dx,c[1]+dy);await dm.keyboard.press('Enter')}
  const n2=(await S(dm)).st.ops.length;
  await until(async()=>(await S(p1)).st.ops.length===n2&&(await S(p2)).st.ops.length===n2,'players get the new shape');
  // DM moves a token: players see it
  const hk=(await S(dm)).st.tokens.find(t=>t.id===har.id);await dm.keyboard.press('v');
  await dragMap(dm,[hk.x,hk.y-10],[hk.x-32,hk.y-10]);
  const hk2=(await S(dm)).st.tokens.find(t=>t.id===har.id);if(hk2.x===hk.x)fail('DM token drag failed');
  await until(async()=>(await S(p1)).st.tokens.find(t=>t.id===har.id).x===hk2.x,'player sees the DM token move');

  // ping and measure from the player reach the DM
  await p1.keyboard.press('p');{const a=await scr(p1,300,200);await p1.mouse.click(...a)}
  await until(async()=>(await S(dm)).pings.some(q=>q.rgb&&Math.abs(q.x-300)<3&&Math.abs(q.y-200)<3),'DM sees the player ping');
  await p1.keyboard.press('m');{const a=await scr(p1,104,104),c=await scr(p1,184,152);await p1.mouse.move(...a);await p1.mouse.down();await p1.mouse.move(...c,{steps:5});await p1.mouse.up()}
  await until(()=>[...pres.values()].some(q=>q.by==='u_p1'&&q.presence.meas),'measure shared in presence');
  await p1.mouse.move(...await scr(p1,250,250));await wait(400);
  await dm.screenshot({path:path.join(OUT,'mp_dm_view.png')});await p1.screenshot({path:path.join(OUT,'mp_player_view.png')});
  // the tool keys for editing do nothing for a player
  await p1.keyboard.press('d');if((await S(p1)).tool==='draw')fail('player switched to Shape');
  if(await p1.evaluate(()=>localStorage.getItem('dustmap-v2'))!==p1Own)fail('player own map was overwritten during the session');

  // the owner hands DM to Sam (an Editor): Sam keeps running the shared map, the owner becomes a player
  await dm.click('#mpbtn');await dm.locator('.mpp',{hasText:'Sam'}).getByRole('button',{name:'Make DM'}).click();
  await until(async()=>(await S(p2)).role==='dm'&&(await S(dm)).role==='player','DM handed over');
  const sharedOps=(await S(p2)).st.ops.length;if(sharedOps!==n2)fail('new DM should keep the shared map');
  const libP2=await p2.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-library')));
  if(!libP2.maps.some(m=>m.name==='Session map'&&m.id===libP2.cur))fail('new DM should get the shared map saved as Session map');
  await p2.keyboard.press('d');{const box=await (await p2.$('#map')).boundingBox();const c=[box.x+150,box.y+150];
    for(const[dx,dy]of[[0,0],[50,0],[50,40]])await p2.mouse.click(c[0]+dx,c[1]+dy);await p2.keyboard.press('Enter')}
  await until(async()=>(await S(dm)).st.ops.length===n2+1&&(await S(p1)).st.ops.length===n2+1,'everyone sees the new DM edit');
  // and takes it back
  await dm.locator('.mpp',{hasText:'Hunter'}).getByRole('button',{name:'Take over as DM'}).click();
  await until(async()=>(await S(dm)).role==='dm'&&(await S(p2)).role==='player','owner took DM back');
  await until(async()=>(await S(p1)).st.ops.length===n2+1,'players still see the shared map');
  await dm.click('#mpclose');
  await dm.click('#mpbtn');await dm.click('#mpbody button:has-text("End session")');
  await until(async()=>(await S(p1)).role==='off','session ended for the player');
  if((await S(p1)).st.ops.length!==p1OwnOps)fail('player did not get their own map back');
  if(await p1.isHidden('#clear'))fail('editing controls should come back');
  for(const p of pages)if(p.errs.length)fail(p.id+' page errors: '+p.errs.join('; '));
  console.log('PASS: multiplayer session, roles, live map, token moves, pings, measure');
}catch(e){console.error('FAIL:',e.message);code=1}
finally{await b.close();process.exit(code)}})();
