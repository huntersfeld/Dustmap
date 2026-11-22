const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const http=require('http');
// Real anonymous sign-in (Firebase Auth emulator) + Realtime Database emulator, with the repo's rules.
// Covers what the database-only test can't: identities across tabs and reloads.
//   1. The DM opens a test player: it must be a different person, and must not disturb the DM's sign-in.
//   2. The DM closes the tab and comes back: still the DM.
// Needs: auth emulator on 127.0.0.1:9099 (npx firebase emulators:start --only auth --project demo-dustmap),
// database emulator on 127.0.0.1:9000, and FIREBASE_SDK pointing at firebase@10.12.2.
const SDK=process.env.FIREBASE_SDK||path.resolve(__dirname,'..','..','node_modules','firebase');
const NS='demo-dustmap',HOST='127.0.0.1',PORT=9000,AUTH='http://127.0.0.1:9099';
const fail=m=>{throw new Error(m)};const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,what,ms=10000){const t0=Date.now();for(;;){let v;try{v=await fn()}catch(e){v=false}if(v)return v;if(Date.now()-t0>ms)fail('timed out: '+what);await wait(150)}}
function rest(method,p,body){return new Promise((res,rej)=>{const r=http.request({host:HOST,port:PORT,method,path:`/${p}.json?ns=${NS}`,headers:{Authorization:'Bearer owner'}},x=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res({status:x.statusCode,body:d}))});r.on('error',rej);if(body!==undefined)r.write(JSON.stringify(body));r.end()})}
(async()=>{const b=await chromium.launch();let code=0;
try{
  await rest('PUT','.settings/rules',JSON.parse(fs.readFileSync(path.resolve(__dirname,'..','..','firebase','database.rules.json'),'utf8')));
  const html=fs.readFileSync(path.resolve(__dirname,'..','dustmap.html'),'utf8').replace(/const FIREBASE=.*?;\n/,`const FIREBASE=${JSON.stringify({apiKey:'demo-key',authDomain:'localhost',projectId:NS,databaseURL:`http://${HOST}:${PORT}?ns=${NS}`})};\n`);
  const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)});await new Promise(r=>srv.listen(0,'127.0.0.1',r));
  const url=`http://127.0.0.1:${srv.address().port}/dustmap`;
  const ctx=await b.newContext({viewport:{width:1280,height:860}});
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/firebase@[^/]+\/(.+)$/,r=>{const f=r.request().url().match(/firebase@[^/]+\/(.+)$/)[1];r.fulfill({path:path.join(SDK,f),contentType:'text/javascript'})});
  await ctx.addInitScript(`window.__starterExample=true;window.__fbTest={host:'${HOST}',port:${PORT},auth:'${AUTH}'};if(!/as=player/.test(location.search))localStorage.setItem('dustmap-name','Hunter')`);
  const errs=[];const S=p=>p.evaluate(()=>window.__dustmap());
  const open=async u=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(u);return p};
  let dm=await open(url);await until(()=>dm.isVisible('#mpbtn'),'Play together button');
  await dm.click('#mpbtn');await dm.click('#mpbody button:has-text("Start session")');
  await until(async()=>(await S(dm)).role==='dm','DM role');const hash=await dm.evaluate(()=>location.hash);
  const [tp]=await Promise.all([ctx.waitForEvent('page'),dm.click('#mpbody button:has-text("Open a test player")')]);tp.on('pageerror',e=>errs.push(e.message));
  await until(async()=>(await S(tp)).role==='player','test player is a player (its own identity)');
  await until(async()=>(await dm.locator('.mpp',{hasText:'Test player'}).count())>0,'DM sees Test player as someone else');
  if((await S(dm)).role!=='dm')fail('DM tab lost DM');
  // players pick their own token: the picker opens by itself; choosing one assigns it and puts it on the map
  await until(()=>tp.isVisible('.mppick'),'token picker opens for a new player');
  const n0=(await S(dm)).st.tokens.length;
  await tp.locator('.mppick .tokbtn').nth(10).click();
  await until(async()=>(await tp.textContent('#hint')).includes('Playing'),'test player has a token');
  const want=await tp.locator('.mppick .tokbtn').nth(10).getAttribute('aria-label').catch(()=>null);
  await until(async()=>(await S(dm)).st.tokens.length===n0+1,'DM page put the chosen token on the map');
  await until(async()=>(await S(tp)).st.tokens.length===n0+1,'player sees it');
  // switching removes the token that was added for them
  await tp.locator('.mppick .tokbtn').nth(12).click();
  await until(async()=>{const d=await S(dm);return d.st.tokens.length===n0+1&&d.st.tokens.some(q=>q.s===12)&&!d.st.tokens.some(q=>q.s===10)},'switching swaps the token');
  // someone else in the room: the taken token is disabled for them, and they can start their own room
  const ctx2=await b.newContext();await ctx2.route(/cdn\.jsdelivr\.net\/npm\/firebase@[^/]+\/(.+)$/,r=>{const f=r.request().url().match(/firebase@[^/]+\/(.+)$/)[1];r.fulfill({path:path.join(SDK,f),contentType:'text/javascript'})});
  await ctx2.addInitScript(`window.__starterExample=true;window.__fbTest={host:'${HOST}',port:${PORT},auth:'${AUTH}'};localStorage.setItem('dustmap-name','Alex')`);
  const p2=await ctx2.newPage();p2.on('pageerror',e=>errs.push(e.message));await p2.goto(url+hash);
  await until(()=>p2.isVisible('.mppick'),'picker for Alex');
  if(!(await p2.locator('.mppick .tokbtn').nth(12).isDisabled()))fail('a taken token should be disabled for others');
  await p2.click('#mpbody button:has-text("Start my own room")');
  await until(async()=>(await p2.evaluate(()=>location.hash))!==hash,'new room');await until(()=>p2.isVisible('#mpbtn'),'reloaded');
  await p2.click('#mpbtn');await p2.click('#mpbody button:has-text("Start session")');await until(async()=>(await S(p2)).role==='dm','Alex is DM of the new room');
  if((await S(dm)).role!=='dm')fail('Hunter should still be DM of the first room');
  await ctx2.close();
  await tp.close();await dm.close();await wait(500);
  dm=await open(url);await until(async()=>(await S(dm)).role==='dm','DM again after closing and reopening',15000);
  if(await dm.evaluate(()=>location.hash)!==hash)fail('reopened a different room');
  if(errs.length)fail('page errors: '+errs.join('; '));
  console.log('PASS: real sign-in: test player is separate, players pick tokens, own rooms, DM keeps identity across tabs');
}catch(e){console.error('FAIL:',e.message);code=1}
finally{await b.close();process.exit(code)}})();
