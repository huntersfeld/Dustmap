const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
// Split rooms in a live session: two players, one walks through a door into the Cellar while the other stays home.
// Each player only gets the map their own token is on (tokens, pings and rolls from the other room never reach them);
// the DM gets a tab per room, sees every room's rolls, commits moves in the room the DM isn't looking at, and anything
// the DM places goes on the room on screen. When the second player walks through too, the rooms merge again.
// Uses tests/mock_claude_runtime.js in place of claude.ai's db / room / user.
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
  // a 20 x 14 Cellar with nobody in it and a door back home in its top-right corner...
  await dm.keyboard.press('n');await dm.waitForTimeout(200);await dm.selectOption('#newsize','20x14');await dm.fill('#newname','Cellar');await dm.press('#newname','Enter');await dm.waitForTimeout(900);
  await dm.evaluate(()=>window.__rooms.clearTokens());
  await dm.keyboard.press('o');await dm.click('#oc-interact');await dm.click('#o-door');await clickMap(dm,296,40);await dm.selectOption('#ptto',{label:home});await dm.click('#ptdone');
  // ...and a door at home leading to it
  await dm.click('#libbtn');await dm.click('.libmap:has-text("'+home+'") button:has-text("Open")');await dm.waitForTimeout(700);
  let st=(await S(dm)).st;const W=st.cols*16,H=st.rows*16,dx=Math.floor((W-24)/16)*16+8,dy=Math.floor((H-24)/16)*16+8;
  await dm.click('#oc-interact');await dm.click('#o-door');await clickMap(dm,dx,dy);await dm.selectOption('#ptto',{label:'Cellar'});await dm.click('#ptdone');await dm.keyboard.press('v');
  const homeId=await idOf(dm,home),cellarId=await idOf(dm,'Cellar');

  const p1=await open('u_p1'),p2=await open('u_p2');
  await dm.click('#mpbtn');await dm.click('#mpbody button:has-text("Start session")');await dm.click('#mpclose').catch(()=>{});
  for(const[p,i]of[[p1,0],[p2,1]]){
    await until(async()=>(await S(p)).role==='player','player role');
    await until(async()=>(await S(p)).st.objects.some(o=>o.k==='door'),'player gets the map');
    await p.waitForTimeout(400);if(await p.locator('#mpmodal').isHidden())await p.click('#mpbtn');await p.locator('.mppick .tokbtn').nth(i).click();await p.click('#mpplay');
    await until(async()=>{const s=store.get('live/session');return s&&s.assign&&s.assign[String(i)]===p.id},'pick '+i);
    await until(async()=>p.evaluate(()=>document.getElementById('mpmodal').hidden),'picker closes')}
  if(await dm.locator('#roomtabs').isVisible())fail('no room tabs while everyone is in one room');

  // Alex walks onto the door: Alex is in the Cellar, Sam stays home, the DM stays home
  const a0=(await S(p1)).st.tokens.find(t=>t.s===0);
  await dragMap(p1,[a0.x,a0.y-10],[dx,dy-10]);
  await until(async()=>(await S(p1)).myRoom===cellarId&&(await S(p1)).st.cols===20,'Alex gets the Cellar');
  await until(async()=>(await S(p1)).st.tokens.some(t=>t.s===0),'Alex sees their token in the Cellar');
  if(await curName(dm)!==home)fail('the DM should stay home');
  if((await S(p2)).myRoom!==homeId)fail('Sam should stay home');
  await until(async()=>!(await S(p2)).st.tokens.some(t=>t.s===0),'Sam sees Alex go');
  if((await S(p1)).st.tokens.some(t=>t.s===1))fail('Alex must not see Sam, who is in another room');
  await until(async()=>(await dm.locator('#roomtabs .roomtab').count())===2,'the DM gets a tab per room');
  await dm.screenshot({path:path.join(OUT,'rooms_dm_tabs.png')});

  // pings stay in their room: Sam's reaches the DM (who is home) but not Alex
  await p2.keyboard.press('p');await clickMap(p2,120,120);await p2.keyboard.press('v');
  await until(async()=>(await S(dm)).pings.some(q=>Math.abs(q.x-120)<3&&Math.abs(q.y-120)<3),'DM sees Sam ping');
  await wait(500);if((await S(p1)).pings.length)fail('Alex must not see a ping from another room');

  // rolls are per room: the DM sees both rooms' rolls (the other room's marked), each player only their own room's
  await p1.evaluate(()=>window.__rooms.roll({w:'Alex',l:'Cellar roll',e:'1d20',d:[[20,7]],t:7,a:'',nat:0,s:0}));
  await p2.evaluate(()=>window.__rooms.roll({w:'Sam',l:'Home roll',e:'1d20',d:[[20,12]],t:12,a:'',nat:0,s:1}));
  await until(async()=>{const r=await rolls(dm);return r.some(x=>x.startsWith('Cellar roll|')&&/in Cellar/.test(x))&&r.some(x=>x.startsWith('Home roll|')&&!/in /.test(x))},'DM sees every room roll');
  await wait(600);
  if((await rolls(p1)).some(x=>x.startsWith('Home roll')))fail('Alex must not see a roll from home');
  if((await rolls(p2)).some(x=>x.startsWith('Cellar roll')))fail('Sam must not see a roll from the Cellar');

  // Alex moves in the Cellar while the DM looks at home: the DM's page still commits it
  const a1=(await S(p1)).st.tokens.find(t=>t.s===0);
  await dragMap(p1,[a1.x,a1.y-10],[a1.x-64,a1.y+32-10]);
  await until(()=>{const t=(store.get('rm/'+cellarId+'/tokens')||{list:[]}).list.find(t=>t.s===0);return t&&Math.abs(t.x-(a1.x-64))<=8&&Math.abs(t.y-(a1.y+32))<=8},'a move in the other room is committed');
  if(await curName(dm)!==home)fail('a move in another room should not switch the DM');

  // the DM switches to the Cellar tab; home keeps running for Sam
  await dm.click('#roomtabs .roomtab:has-text("Cellar")');
  await until(async()=>await curName(dm)==='Cellar','DM views the Cellar');
  if((await S(dm)).rooms.length!==2)fail('home should still be a room');
  // what the DM places now goes on the Cellar: Alex sees it, Sam doesn't
  await dm.evaluate(()=>window.__rooms.addObj({k:'barrels',x:120,y:120,v:0}));
  await until(async()=>(await S(p1)).st.objects.some(o=>o.k==='barrels'&&o.x===120),'Alex sees what the DM put in the Cellar');
  await wait(500);if((await S(p2)).st.objects.some(o=>o.k==='barrels'&&o.x===120))fail('Sam must not see the Cellar barrel');
  if((await S(p2)).st.cols===20)fail('Sam should still be on the home map');
  // Sam moves at home while the DM looks at the Cellar
  const b0=(await S(p2)).st.tokens.find(t=>t.s===1);
  await dragMap(p2,[b0.x,b0.y-10],[b0.x+32,b0.y-10]);
  await until(()=>{const t=(store.get('rm/'+homeId+'/tokens')||{list:[]}).list.find(t=>t.s===1);return t&&Math.abs(t.x-(b0.x+32))<=8},'Sam\'s move at home is committed');

  // Sam walks through too: the party is together in the Cellar again and the tabs go away
  const b1=(await S(p2)).st.tokens.find(t=>t.s===1);
  await dragMap(p2,[b1.x,b1.y-10],[dx,dy-10]);
  await until(async()=>(await S(p2)).myRoom===cellarId&&(await S(p2)).st.cols===20,'Sam gets the Cellar');
  await until(async()=>(await S(p2)).st.tokens.some(t=>t.s===0)&&(await S(p1)).st.tokens.some(t=>t.s===1),'they see each other again');
  await until(async()=>(await S(dm)).rooms.length===1,'one room again');
  await until(async()=>dm.locator('#roomtabs').isHidden(),'tabs hide once the party is together');

  for(const p of pages)if(p.errs.length)fail(p.id+' page errors: '+p.errs.join(' | '));
  console.log('PASS: split rooms in a live session');
}catch(e){console.log('FAIL',e.message);for(const p of pages){try{console.log(p.id,p.errs.join(' | '),JSON.stringify(await p.evaluate(()=>{const d=window.__dustmap();return{rooms:d.rooms,my:d.myRoom,toks:d.st.tokens.map(t=>[t.s,t.x,t.y]),cols:d.st.cols}})))}catch(_){}}code=1}finally{await b.close();process.exit(code)}})();
