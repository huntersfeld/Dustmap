const {chromium}=require('playwright');const path=require('path');const {pathToFileURL}=require('url');
// A first visit (nothing saved in this browser) opens the Dustmap tour map; returning visitors keep the map they last had
// open; the map library and the new-map dialog still work from there.
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const fail=m=>{throw new Error(m)};
const cur=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-v2')));
const lib=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-library')));
(async()=>{const b=await chromium.launch();let code=0;
try{
const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(PAGE);await p.waitForTimeout(1500);
let l=await lib(p),s=await cur(p);
if(l.maps.length!==1||l.maps[0].name!=='Dustmap tour')fail('first visit should open the tour map, got '+JSON.stringify(l.maps.map(m=>m.name)));
if(await p.textContent('#libname')!=='Dustmap tour')fail('header should name the tour map');
if(!s.objects.some(o=>o.k==='sign'))fail('tour map signs should survive the first load');
if(!s.fog)fail('tour map should keep its fogged cave');
if(s.cols!==40||s.rows!==28)fail('tour map size: '+s.cols+'x'+s.rows);
const d=await p.evaluate(()=>{const d=window.__dustmap();return{st:d.st.cols,signs:d.st.objects.filter(o=>o.k==='sign').length}});
if(d.st!==40||!d.signs)fail('tour should be the map on screen');
// a new map from the dialog joins the library and stays open after a reload
await p.click('#newbtn');await p.waitForTimeout(200);await p.click('#newgo');await p.waitForTimeout(400);
l=await lib(p);if(l.maps.length!==2)fail('new map should be added next to the tour, got '+l.maps.length);
const newId=l.cur;if(newId===l.maps.find(m=>m.name==='Dustmap tour').id)fail('new map should be open');
await p.reload();await p.waitForTimeout(1200);
l=await lib(p);if(l.cur!==newId||l.maps.length!==2)fail('returning visitor should keep their open map and not get another tour');
if((await cur(p)).objects.some(o=>o.k==='sign'))fail('returning visitor should see their own map');
// the tour is still in the library
await p.click('#libname');await p.waitForTimeout(200);
if(!(await p.textContent('#libmaps')).includes('Dustmap tour'))fail('tour should stay in the map library');
if(errs.length)fail('page errors: '+errs.join(' | '));
console.log('PASS: first visit opens the tour map; new maps and returning visits unaffected')}
catch(e){console.error('FAIL: '+e.message);code=1}
await b.close();process.exit(code)})();
