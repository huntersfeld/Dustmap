// Pressure plates are triggers you can see: placing one opens the trigger editor (no size row), and stepping on it does
// what it's set up to do. A trigger can link tokens: linking hides them from players, and when it goes off the hidden
// ones come in with the entrance it picks. A plate nobody set up stays quiet. Also: the Tokens tray's Place hidden
// button stays in view in the Town tab on a narrow screen, and townsfolk get Hide from players like enemies.
// Run after `python3 app/build_dustmap.py`.
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
const fail=m=>{throw new Error(m)};
(async()=>{const b=await chromium.launch();let code=0;
try{const ctx=await b.newContext({viewport:{width:900,height:760}});await ctx.addInitScript('window.__starterExample=true');const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
await p.click('#more');await p.uncheck('#anim');await p.keyboard.press('Escape');
const S=()=>p.evaluate(()=>window.__dustmap());
const scr=async(x,y)=>{const d=await S(),box=await (await p.$('#map')).boundingBox();return[box.x+(x-d.cam.x)*d.Z,box.y+(y-d.cam.y)*d.Z]};
const clickMap=async(x,y)=>{const q=await scr(x,y);await p.mouse.click(...q);await p.waitForTimeout(150)};
const dragMap=async(from,to,n=12)=>{const a=await scr(...from),c=await scr(...to);await p.mouse.move(...a);await p.mouse.down();
  for(let k=1;k<=n;k++){await p.mouse.move(a[0]+(c[0]-a[0])*k/n,a[1]+(c[1]-a[1])*k/n);await p.waitForTimeout(20)}await p.mouse.up();await p.waitForTimeout(300)};
const onTop=sel=>p.evaluate(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return!!h&&(h===e||e.contains(h))},sel);

// a fresh 20 x 14 map with one party token
await p.keyboard.press('n');await p.waitForTimeout(200);await p.selectOption('#newsize','20x14');await p.fill('#newname','Plate room');await p.press('#newname','Enter');await p.waitForTimeout(900);
await p.evaluate(()=>{window.__dustmap().st.tokens=[{s:0,x:24,y:104,o:0}]});

// Place hidden stays in view in every Tokens tab, even when the Town row is wider than the tray
await p.keyboard.press('t');await p.waitForTimeout(200);
for(const g of['Party','Townsfolk','Enemies']){await p.click('#tg-'+g);await p.waitForTimeout(150);if(!(await onTop('#thide')))fail('Place hidden should be visible and clickable in the '+g+' tab')}
// a townsfolk token placed hidden, and Hide from players on a visible one
await p.click('#tg-Townsfolk');await p.locator('#toks .sw').first().click();if(await p.isVisible('#tokvars'))await p.locator('#tokvars .sw').first().click();
await p.click('#thide');await clickMap(232,104);await p.click('#thide');await clickMap(264,152);await p.keyboard.press('Escape');
let st=(await S()).st;const town=st.tokens.filter(t=>t.s>=4&&t.s<44);
if(town.length!==2||town[0].hd!==1||town[1].hd)fail('one townsfolk placed hidden, one not: '+JSON.stringify(town));
await p.keyboard.press('v');await clickMap(264,146);
if(!(await p.locator('#selbar button[aria-label="Hide from players"]').count()))fail('a townsfolk token should offer Hide from players');
await p.keyboard.press('Escape');

// an enemy to ambush the party
await p.keyboard.press('t');await p.click('#tg-Enemies');await p.locator('#toks .sw').first().click();if(await p.isVisible('#tokvars'))await p.locator('#tokvars .sw').first().click();
await clickMap(296,104);await p.keyboard.press('Escape');
st=(await S()).st;const enemy=st.tokens[st.tokens.length-1];if(enemy.s<44||enemy.hd)fail('the enemy should start visible: '+JSON.stringify(enemy));

// place a pressure plate: it sits on a square and opens the trigger editor, without the size row
await p.keyboard.press('o');await p.click('#oc-interact');await p.click('#o-plate');await clickMap(104,104);
if(await p.isHidden('#zoneedit'))fail('placing a plate should open the trigger editor');
let pl=(await S()).st.objects.find(o=>o.k==='plate');
if(!pl||!pl.id||pl.x!==104||pl.y!==104||pl.w||pl.h)fail('the plate should be one square with an id: '+JSON.stringify(pl));
if(await p.isVisible('#zoneedit .zsize'))fail('a plate has no size row');
if(!/steps on it/.test(await p.textContent('#zhead')))fail('the editor should talk about stepping on the plate');
if(await p.inputValue('#zrv')!=='0')fail('a new plate reveals nothing by default');
await p.fill('#zname','Ambush plate');await p.fill('#zmsg','Click. Something stirs behind you.');
// link the hidden townsfolk and the visible enemy: the enemy goes hidden too
await p.click('#zlink');await clickMap(232,98);await clickMap(296,98);await p.click('#zlink');
st=(await S()).st;pl=st.objects.find(o=>o.k==='plate');
if(!pl.tk||pl.tk.length!==2)fail('two tokens should be linked: '+JSON.stringify(pl));
if(st.tokens.filter(t=>pl.tk.includes(t.id)).some(t=>t.hd!==1))fail('linked tokens should be hidden');
if(!/2 tokens/.test(await p.textContent('#zlinked')))fail('linked summary: '+await p.textContent('#zlinked'));
if(await p.isHidden('#zenrow'))fail('the entrance picker should show once tokens are linked');
await p.selectOption('#zen','d');
await p.click('#zdone');if(!(await p.isHidden('#zoneedit')))fail('Done should close the editor');
// a second, unset plate does nothing
await p.keyboard.press('o');await p.click('#o-plate');await clickMap(40,40);await p.click('#zdone');
await p.keyboard.press('v');await p.keyboard.press('Escape');
await p.evaluate(()=>{window.__dustmap().st.tokens.find(t=>t.s===0).y=56});
await dragMap([24,50],[40,50]);
if(await p.isVisible('#portmsg')&&/went off/.test(await p.textContent('#portmsg')))fail('a plate with nothing set up should stay quiet');
await p.evaluate(()=>{window.__dustmap().st.tokens.find(t=>t.s===0).y=104;window.__dustmap().st.tokens.find(t=>t.s===0).x=72});
// the DM sees the plate's name over it while selected; snapshot for review
await p.keyboard.press('Escape');await clickMap(104,104);await p.waitForTimeout(200);
if(!(await p.isVisible('#selbar [aria-label="Edit plate"]')))fail('a selected plate should offer Edit plate');
await p.screenshot({path:path.join(OUT,'pressure_plate_selected.png')});
await p.keyboard.press('Escape');

// step onto the plate: the hidden tokens come in, dropping from above, and the plate is spent
await dragMap([72,98],[104,98]);
st=(await S()).st;pl=st.objects.find(o=>o.k==='plate'&&o.nm==='Ambush plate');
const linked=st.tokens.filter(t=>pl.tk.includes(t.id));
if(linked.some(t=>t.hd))fail('stepping on the plate should reveal the linked tokens: '+JSON.stringify(linked));
if(linked.some(t=>t.re!=='d'||!t.rv))fail('the reveal should use the plate\'s entrance: '+JSON.stringify(linked));
if(!pl.done)fail('a once-only plate should be spent');
const msg=await p.textContent('#portmsg');if(!/Ambush plate/.test(msg)||!/revealed 2 hidden tokens/.test(msg))fail('the DM should see what happened: '+msg);
// undo hides them again
await p.keyboard.press('Control+z');await p.waitForTimeout(200);st=(await S()).st;
if(st.tokens.filter(t=>pl.tk.includes(t.id)).some(t=>t.hd!==1))fail('undo should hide them again');

// the cave dungeon: the plates are triggers themselves, and the Vault zone brings up the hidden Vault Warden
await p.click('#more');await p.click('#cave');await p.waitForTimeout(2500);st=(await S()).st;
if(st.objects.some(o=>o.k==='zone'&&/plate/i.test(o.nm)))fail('the cave plates should not need zones on top any more');
const flame=st.objects.find(o=>o.id==='cave-p1');if(!flame||flame.k!=='plate'||flame.v!==1)fail('the flame plate should be a plate: '+JSON.stringify(flame));
const warden=st.tokens.find(t=>t.id==='cave-warden'),vault=st.objects.find(o=>o.id==='cave-vault');
if(!warden||warden.hd!==1||!vault||!(vault.tk||[]).includes('cave-warden'))fail('the Vault Warden should wait hidden for the Vault zone');
if(errs.length)fail('page errors: '+errs.join(' | '));
console.log('PASS: pressure plates and trigger reveals');
}catch(e){console.error('FAIL',e.message);code=1}finally{await b.close();process.exit(code)}})();
