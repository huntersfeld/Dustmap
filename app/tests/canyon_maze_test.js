// Hunter’s canyon maze, a built-in map Hunter drew in the editor: it opens from the ⋯ menu and from the library,
// at 50 × 34 under fog with walk reveal, every zone link resolves, the stray empty signs off the map are gone,
// and it renders without page errors. Run after `python3 app/build_dustmap.py`.
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
const fail=m=>{throw new Error(m)};
(async()=>{const b=await chromium.launch();let code=0;
try{const ctx=await b.newContext({viewport:{width:1600,height:1060}});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
await p.click('#more');await p.uncheck('#anim');await p.click('#canyon');await p.waitForTimeout(2500);await p.keyboard.press('0');await p.waitForTimeout(300);
const S=()=>p.evaluate(()=>window.__dustmap());
const lib=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-library')));
const NAME='Hunter’s canyon maze';
let st=(await S()).st,l=await lib();
if(st.cols!==50||st.rows!==34)fail('the maze should be 50x34, got '+st.cols+'x'+st.rows);
if(l.maps.find(m=>m.id===l.cur).name!==NAME)fail('the maze should open as '+NAME);
if(st.objects.length!==111)fail('expected 111 objects, got '+st.objects.length);
if(st.tokens.length!==15)fail('expected 15 tokens, got '+st.tokens.length);
for(const k of['zone','door','dynamite','entrance','landing','stairsdown','sign','torch','campfire'])if(!st.objects.some(o=>o.k===k))fail('missing '+k);
if(st.objects.some(o=>o.k==='sign'&&!o.txt))fail('the empty stray signs should be dropped');
const byId=id=>st.objects.find(o=>o.id===id);
st.objects.filter(o=>o.k==='zone').forEach(z=>z.tg.forEach(id=>{if(!byId(id))fail(`zone ${z.nm} links a missing ${id}`)}));
if(!st.fog||!st.fogWalk||st.fogWalkR!==2)fail('the maze starts under fog, with walk reveal on (reach 2)');
await p.screenshot({path:path.join(OUT,'canyon_dm.png')});
// the library button opens a second copy, and the BUILTIN entry is there for doors that name it
await p.evaluate(()=>document.getElementById('libcanyon').click());await p.waitForTimeout(1500);
l=await lib();const n=l.maps.filter(m=>m.name.startsWith('Hunter’s canyon maze')).length;
if(n!==2)fail('the library button should add another copy, got '+n);
if(errs.length)fail('page errors: '+errs.join('; '));
console.log('canyon maze: ok');
}catch(e){console.error('FAIL',e.message);code=1}
await b.close();process.exit(code)})();
