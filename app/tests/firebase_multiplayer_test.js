const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const os=require('os');const http=require('http');
// Play together over Firebase, against the local Realtime Database emulator with the repo's security rules.
// Needs: the database emulator on 127.0.0.1:9000, and the Firebase SDK (npm i firebase@10.12.2) where FIREBASE_SDK points
// (default: ./node_modules/firebase). The page's jsdelivr script requests are answered from that folder.
//   java -jar firebase-database-emulator-*.jar --port 9000      (or: npx firebase emulators:start --only database)
const SDK=process.env.FIREBASE_SDK||path.resolve(__dirname,'..','..','node_modules','firebase');
const NS='demo-dustmap',HOST='127.0.0.1',PORT=9000;
const fail=m=>{throw new Error(m)};const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,what,ms=8000){const t0=Date.now();for(;;){const v=await fn();if(v)return v;if(Date.now()-t0>ms)fail('timed out: '+what);await wait(150)}}
function rest(method,p,body,auth='owner'){return new Promise((res,rej)=>{const r=http.request({host:HOST,port:PORT,method,path:`/${p}.json?ns=${NS}`,headers:{Authorization:'Bearer '+auth}},x=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res({status:x.statusCode,body:d}))});r.on('error',rej);if(body!==undefined)r.write(JSON.stringify(body));r.end()})}

(async()=>{const b=await chromium.launch();let code=0;
try{
  const rules=fs.readFileSync(path.resolve(__dirname,'..','..','firebase','database.rules.json'),'utf8');
  if((await rest('PUT','.settings/rules',JSON.parse(rules))).status!==200)fail('could not load rules into the emulator');
  await rest('DELETE','rooms');
  const html=fs.readFileSync(path.resolve(__dirname,'..','dustmap.html'),'utf8').replace('const FIREBASE=null;',`const FIREBASE=${JSON.stringify({apiKey:'demo',projectId:NS,databaseURL:`http://${HOST}:${PORT}?ns=${NS}`})};`);
  const page=path.join(os.tmpdir(),'dustmap_fb_test.html');fs.writeFileSync(page,html);
  const pages=[];
  async function open(uid,name,hash=''){
    const ctx=await b.newContext({viewport:{width:1280,height:860}});
    await ctx.route(/cdn\.jsdelivr\.net\/npm\/firebase@[^/]+\/(.+)$/,(r)=>{const f=r.request().url().match(/firebase@[^/]+\/(.+)$/)[1];r.fulfill({path:path.join(SDK,f),contentType:'text/javascript'})});
    await ctx.addInitScript(`window.__fbTest={host:'${HOST}',port:${PORT},uid:'${uid}'};${name?`localStorage.setItem('dustmap-name','${name}')`:''}`);
    const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.uid=uid;
    await p.goto('file://'+page+hash);await p.waitForTimeout(1500);pages.push(p);return p}
  const S=p=>p.evaluate(()=>window.__dustmap());
  const scr=async(p,x,y)=>{const d=await S(p),box=await (await p.$('#map')).boundingBox();return[box.x+(x-d.cam.x)*d.Z,box.y+(y-d.cam.y)*d.Z]};
  const dragMap=async(p,from,to)=>{const a=await scr(p,...from),c=await scr(p,...to);await p.mouse.move(...a);await p.mouse.down();
    for(let k=1;k<=8;k++){await p.mouse.move(a[0]+(c[0]-a[0])*k/8,a[1]+(c[1]-a[1])*k/8);await p.waitForTimeout(30)}await p.mouse.up();await p.waitForTimeout(300)};

  const dm=await open('u_dm','Hunter');
  await until(()=>dm.isVisible('#mpbtn'),'Play together button');
  const hash=await dm.evaluate(()=>location.hash);if(!/^#room=/.test(hash))fail('no room in the link: '+hash);
  const room=hash.slice(6);
  await dm.click('#mpbtn');await dm.click('#mpbody button:has-text("Start session")');
  await until(async()=>(await S(dm)).role==='dm','DM role');
  // a player arriving by the link without a saved name is asked for one
  const p1=await open('u_p1','',hash);
  await until(()=>p1.isVisible('#mpname'),'name prompt for a new player');
  await p1.fill('#mpname','Alex');await p1.press('#mpname','Enter');await p1.click('#mpclose');
  await until(async()=>(await S(p1)).role==='player','player role');
  const dmOps=JSON.stringify((await S(dm)).st.ops);
  await until(async()=>JSON.stringify((await S(p1)).st.ops)===dmOps,'player gets the map');

  // assign Wizard to Alex
  await dm.click('#mpclose').catch(()=>{});await dm.click('#mpbtn');
  await until(async()=>(await dm.locator('.mpp',{hasText:'Alex'}).count())>0,'Alex listed by name');
  await dm.locator('.mpp',{hasText:'Alex'}).locator('select').selectOption('3');await dm.click('#mpclose');
  await until(async()=>(await p1.textContent('#hint')).includes('Wizard'),'player has the Wizard');
  const tk=(await S(p1)).st.tokens,wiz=tk.find(t=>t.s===3);
  await dragMap(p1,[wiz.x,wiz.y-10],[wiz.x+32,wiz.y+6]);
  const moved=(await S(p1)).st.tokens.find(t=>t.id===wiz.id);if(moved.x===wiz.x)fail('player drag failed');
  await until(async()=>{const t=(await S(dm)).st.tokens.find(t=>t.id===wiz.id);return t&&t.x===moved.x&&t.y===moved.y},'DM took the move');

  // rules: a player can't write the shared map, claim the room, or make themselves DM
  // DM edit reaches the player; ping reaches the DM
  await dm.keyboard.press('d');{const box=await (await dm.$('#map')).boundingBox();const c=[box.x+box.width/2,box.y+box.height/2];
    for(const[dx,dy]of[[-40,-30],[40,-30],[40,30],[-40,30]])await dm.mouse.click(c[0]+dx,c[1]+dy);await dm.keyboard.press('Enter')}
  const n2=(await S(dm)).st.ops.length;await until(async()=>(await S(p1)).st.ops.length===n2,'player gets the new shape');
  await p1.keyboard.press('p');await p1.mouse.click(...await scr(p1,300,200));
  await until(async()=>(await S(dm)).pings.some(q=>q.rgb&&Math.abs(q.x-300)<3),'DM sees the ping');

  // the owner hands DM to Alex; Alex's edits reach Hunter
  await dm.click('#mpbtn');await dm.locator('.mpp',{hasText:'Alex'}).getByRole('button',{name:'Make DM'}).click();
  await until(async()=>(await S(p1)).role==='dm'&&(await S(dm)).role==='player','DM handed to Alex');
  await dm.click('#mpclose');
  await p1.keyboard.press('d');{const box=await (await p1.$('#map')).boundingBox();const c=[box.x+150,box.y+150];
    for(const[dx,dy]of[[0,0],[50,0],[50,40]])await p1.mouse.click(c[0]+dx,c[1]+dy);await p1.keyboard.press('Enter')}
  await until(async()=>(await S(dm)).st.ops.length===n2+1,'owner sees the new DM edit');
  // rules: someone else in the room can't write the shared map, claim the room, make themselves DM, or speak for others
  const p3=await open('u_p3','Sam',hash);await until(async()=>(await S(p3)).role==='player','third player joins');
  const tryWrite=(p,path,v)=>p.evaluate(([path,v])=>window.firebase.database().ref(path).set(v).then(()=>'ok',e=>'denied'),[path,v]);
  for(const[pth,v]of[[`rooms/${room}/d/live/session`,{j:'{"live":true,"dm":"u_p3","assign":{}}'}],[`rooms/${room}/dm`,'u_p3'],[`rooms/${room}/owner`,'u_p3'],[`rooms/${room}/presence/u_dm_x`,{by:'u_dm',p:'{}'}],[`rooms/${room}/people/u_dm`,{name:'Mallory'}]])
    if(await tryWrite(p3,pth,v)!=='denied')fail('rules let a player write '+pth);
  if(await tryWrite(p3,`rooms/${room}/people/u_p3`,{name:'Alex'})!=='ok')fail('player should set their own name');
  if((await rest('GET',`rooms/${room}/d/live/session`,undefined,'')).status!==401)fail('signed-out visitors should not read');

  if(await tryWrite(p3,`rooms/${room}/mapIndex/u_dm_m1`,{by:'u_p3',name:'x',updated:1})!=='denied')fail('rules let a player write someone else\'s group map');

  // group maps: end the session, Sam builds a map on his own and shares it; Hunter opens it, Sam edits, Hunter gets the latest
  await dm.click('#mpbtn');await dm.click('#mpbody button:has-text("End session")');await dm.click('#mpclose');
  await until(async()=>(await S(p3)).role==='off'&&(await S(dm)).role==='off','session ended');
  await p3.click('#libbtn');await p3.click('#libnew');await p3.fill('.libmap input','Sam canyon');await p3.press('.libmap input','Enter');await p3.click('#libclose');
  await p3.keyboard.press('d');{const box=await (await p3.$('#map')).boundingBox();const c=[box.x+box.width/2,box.y+box.height/2];
    for(const[dx,dy]of[[-50,-30],[50,-30],[50,30]])await p3.mouse.click(c[0]+dx,c[1]+dy);await p3.keyboard.press('Enter')}
  await p3.click('#libbtn');await p3.locator('.libmap',{hasText:'Sam canyon'}).getByRole('button',{name:'Share with group'}).click();
  await until(()=>p3.locator('.libmap',{hasText:'Sam canyon'}).locator('.pill',{hasText:'In group'}).count(),'shared pill');await p3.click('#libclose');
  await dm.click('#libbtn');const grow=dm.locator('.libmap',{hasText:'Sam canyon'});
  await until(async()=>(await grow.count())>0&&(await grow.textContent()).includes('Sam'),'Hunter sees Sam\'s map with his name');
  await grow.getByRole('button',{name:'Open'}).click();
  await until(async()=>(await S(dm)).st.ops.length===1,'Hunter opened Sam\'s map');
  await p3.keyboard.press('d');{const box=await (await p3.$('#map')).boundingBox();const c=[box.x+100,box.y+100];
    for(const[dx,dy]of[[0,0],[40,0],[40,40]])await p3.mouse.click(c[0]+dx,c[1]+dy);await p3.keyboard.press('Enter')}
  await wait(2500);   // shared maps sync 1.5 s after an edit
  await dm.click('#libbtn');await dm.locator('.libmap',{hasText:'Sam canyon'}).last().getByRole('button',{name:'Open latest'}).click();
  await until(async()=>(await S(dm)).st.ops.length===2,'Hunter got Sam\'s latest edit');
  const L=await dm.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-library')));if(L.maps.filter(m=>m.name.startsWith('Sam canyon')).length!==1)fail('opening again should refresh the copy, not add another');
  // a bare visit goes back to the remembered room
  const again=await dm.context().newPage();await again.goto('file://'+page);await again.waitForTimeout(1500);
  await until(async()=>(await again.evaluate(()=>location.hash))===hash,'bare visit reopens the group room',15000);await again.close();
  // a closed tab leaves the room
  await p1.context().close();await until(async()=>(await S(dm)).peers===2,'closed tab removed from presence',15000);
  for(const p of pages)if(p.errs.length)fail(p.uid+' page errors: '+p.errs.join('; '));
  console.log('PASS: Firebase session, rules, names, token moves, pings, DM hand-off, group maps');
}catch(e){console.error('FAIL:',e.message);code=1}
finally{await b.close();process.exit(code)}})();
