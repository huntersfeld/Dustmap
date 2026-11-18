const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
// Fog of war: the DM hides and reveals squares (box, brush, everything), players get the fog live and see darkness there,
// tokens standing in fog never reach players (unless handed to a player), undo and map resize carry the fog along.
// Uses tests/mock_claude_runtime.js in place of claude.ai's db / room / user.
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
const install=require('./mock_claude_runtime.js');
const fail=m=>{throw new Error(m)};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,what,ms=5000){const t0=Date.now();for(;;){const v=await fn();if(v)return v;if(Date.now()-t0>ms)fail('timed out: '+what);await wait(100)}}
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
    await ctx.addInitScript(`window.__names=${JSON.stringify(NAMES)};(${install.toString()})(${JSON.stringify({id,name:NAMES[id],owner,admin})})`);
    await p.goto(PAGE);await p.waitForTimeout(1200);pages.push(p);p.id=id;return p}
  const S=p=>p.evaluate(()=>window.__dustmap());
  const scr=async(p,x,y)=>{const d=await S(p),box=await (await p.$('#map')).boundingBox();return[box.x+(x-d.cam.x)*d.Z,box.y+(y-d.cam.y)*d.Z]};
  const dragMap=async(p,from,to,shift)=>{const a=await scr(p,...from),c=await scr(p,...to);if(shift)await p.keyboard.down('Shift');await p.mouse.move(...a);await p.mouse.down();
    for(let k=1;k<=8;k++){await p.mouse.move(a[0]+(c[0]-a[0])*k/8,a[1]+(c[1]-a[1])*k/8);await p.waitForTimeout(30)}await p.mouse.up();if(shift)await p.keyboard.up('Shift');await p.waitForTimeout(300)};
  // brightness of the map canvas at a map point
  const lum=async(p,x,y)=>{const d=await S(p);return p.evaluate(([sx,sy])=>{const c=document.getElementById('map'),r=devicePixelRatio||1;const px=c.getContext('2d').getImageData(Math.round(sx*r),Math.round(sy*r),1,1).data;return(px[0]+px[1]+px[2])/3},[(x-d.cam.x)*d.Z,(y-d.cam.y)*d.Z])};
  const sq=(f,cols,c,r)=>f&&f[r*cols+c];

  const dm=await open('u_dm',{owner:true,admin:true});
  await dm.click('#example');await dm.waitForTimeout(600);
  // two NPC tokens: one in the top-left corner (to be revealed), one far away (stays in fog)
  await dm.evaluate(()=>{const s=window.__dustmap().st;s.tokens.push({s:4,x:72,y:72,o:0},{s:5,x:552,y:392,o:0})});
  const p1=await open('u_p1');
  await dm.click('#mpbtn');await dm.click('#mpbody button:has-text("Start session")');
  await until(async()=>(await S(p1)).role==='player','player role');
  await dm.click('#mpclose');
  await until(async()=>(await S(p1)).st.tokens.length===6,'player sees every token while nothing is hidden');
  if((await S(p1)).fog!==null)fail('no fog to begin with');

  // hide everything
  await dm.keyboard.press('f');if(!(await dm.isVisible('#sec-fog')))fail('fog panel should show with the Fog tool');
  await dm.click('#fog-all');
  const cells=40*28;
  await until(async()=>{const f=(await S(p1)).fog;return f&&f.length===cells&&!f.includes('0')},'player gets the whole map hidden');
  await until(async()=>(await S(p1)).st.tokens.length===0,'tokens in fog are not sent to players');
  if(!(await dm.textContent('#fognote')).includes(`${cells} of ${cells}`))fail('fog count note');
  // a token handed to a player always shows, even in fog
  await dm.click('#mpbtn');await until(async()=>(await dm.locator('.mpp',{hasText:'Alex'}).count())>0,'Alex listed');
  await dm.locator('.mpp',{hasText:'Alex'}).locator('select').selectOption('3');await dm.click('#mpclose');
  await until(async()=>{const t=(await S(p1)).st.tokens;return t.length===1&&t[0].s===3},'player sees their own token in fog');
  // player sees darkness where it's hidden
  await p1.waitForTimeout(300);if(await lum(p1,180,150)>40)fail('hidden ground should be dark for the player');

  // reveal a box in the top-left: squares 0..9 x 0..9
  await dm.click('#fog-reveal');await dm.click('#fog-box');
  await dragMap(dm,[4,4],[156,156]);
  let f=(await S(dm)).st.fog;if(sq(f,40,0,0)!=='0'||sq(f,40,9,9)!=='0'||sq(f,40,10,10)!=='1'||sq(f,40,0,10)!=='1')fail('box reveal on the DM side');
  await until(async()=>{const f=(await S(p1)).fog;return sq(f,40,5,5)==='0'&&sq(f,40,10,10)==='1'},'player gets the reveal');
  await until(async()=>(await S(p1)).st.tokens.some(t=>t.s===4)&&!(await S(p1)).st.tokens.some(t=>t.s===5),'revealed token shows, hidden one does not');
  await p1.waitForTimeout(300);
  if(await lum(p1,40,40)<80)fail('revealed ground should be visible for the player');
  if(await lum(p1,180,150)>40)fail('still-hidden ground should stay dark');
  await p1.screenshot({path:path.join(OUT,'fog_player.png')});await dm.screenshot({path:path.join(OUT,'fog_dm.png')});await dm.screenshot({path:path.join(OUT,'fog_dm_zoom.png'),clip:{x:440,y:150,width:300,height:200}});

  // brush with Shift paints the opposite (hide) inside the revealed box
  await dm.click('#fog-brush');
  await dragMap(dm,[40,40],[100,40],true);
  f=(await S(dm)).st.fog;if(sq(f,40,2,2)!=='1'||sq(f,40,6,2)!=='1'||sq(f,40,8,8)!=='0')fail('shift-brush should hide: '+[sq(f,40,2,2),sq(f,40,6,2),sq(f,40,8,8)]);
  await until(async()=>sq((await S(p1)).fog,40,4,2)==='1','player gets the brush');
  // undo goes back one stroke
  await dm.click('#undo');
  f=(await S(dm)).st.fog;if(sq(f,40,4,2)!=='0')fail('undo should restore the reveal');
  await until(async()=>sq((await S(p1)).fog,40,4,2)==='0','player gets the undo');

  // preview: the DM sees what players see
  await dm.waitForTimeout(200);const veil=await lum(dm,180,150);
  await dm.check('#fogprev');await dm.waitForTimeout(200);const prev=await lum(dm,180,150);
  if(!(prev<40&&veil>prev+20))fail(`preview should darken hidden ground (veil ${veil}, preview ${prev})`);
  await dm.uncheck('#fogprev');

  // resizing keeps fog under the same ground; new squares start hidden
  await dm.selectOption('#msize','50x34');
  f=(await S(dm)).st.fog;if(!f||f.length!==50*34)fail('fog resized');
  if(sq(f,50,5+5,3+5)!=='0'||sq(f,50,0,0)!=='1')fail('fog should move with the map');
  await until(async()=>{const d=await S(p1);return d.st.cols===50&&d.fog&&sq(d.fog,50,10,8)==='0'},'player gets the resized map and fog');

  // fog saves with the map
  const saved=await dm.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-v2')).fog);if(saved!==f)fail('fog should save with the map');
  // reveal everything
  await dm.click('#fog-none');
  await until(async()=>(await S(p1)).fog===null,'player sees everything again');
  await until(async()=>(await S(p1)).st.tokens.length===6,'all tokens come back');
  // a player can't use the fog tool
  await p1.keyboard.press('f');if((await S(p1)).tool==='fog')fail('player should not get the fog tool');
  for(const p of pages)if(p.errs.length)fail(p.id+' page errors: '+p.errs.join('; '));
  console.log('PASS: fog of war hide/reveal, live to players, hidden tokens, undo, preview, resize');
}catch(e){console.error('FAIL:',e.message);code=1}
finally{await b.close();process.exit(code)}})();
