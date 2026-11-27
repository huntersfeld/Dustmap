// Play sheet and dice: an imported D&D Beyond character gets a sheet with attacks, actions, bonus actions, reactions,
// spells and slots, saves and skills, every number derived from the JSON; buttons roll the right dice; casting spends a
// slot; rests refill. In a session a player's rolls show up on the DM's page (feed and over the token), and the DM's
// private rolls stay on the DM's page.
// Uses tests/mock_claude_runtime.js for the live part. Run `python3 app/build_dustmap.py` first.
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});
const SHEET=fs.readFileSync(path.join(__dirname,'fixtures','ddb_caster.json'),'utf8');
const OLD=fs.readFileSync(path.join(__dirname,'fixtures','ddb_character.json'),'utf8');
const install=require('./mock_claude_runtime.js');
const fail=m=>{throw new Error(m)};const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,what,ms=5000){const t0=Date.now();for(;;){const v=await fn();if(v)return v;if(Date.now()-t0>ms)fail('timed out: '+what);await wait(100)}}
const eq=(got,want,what)=>{if(JSON.stringify(got)!==JSON.stringify(want))fail(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`)};
const LINK='https://www.dndbeyond.com/characters/987654321';
(async()=>{const b=await chromium.launch();let code=0;
try{
  // ---- parsing ----
  const ctx=await b.newContext({viewport:{width:1360,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await ctx.route('https://character-service.dndbeyond.com/**',r=>r.abort());
  await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1200);
  const ps=await p.evaluate(j=>window.__sheet.ddbPlay(JSON.parse(j)),SHEET);
  eq([ps.lvl,ps.prof,ps.init,ps.pp],[5,3,5,14],'level, proficiency, initiative, passive perception');
  eq(ps.saves.map(s=>s[0]),[-1,3,2,6,4,1],'saving throws');
  const sk=n=>ps.skills[['Acrobatics','Animal Handling','Arcana','Athletics','Deception','History','Insight','Intimidation','Investigation','Medicine','Nature','Perception','Performance','Persuasion','Religion','Sleight of Hand','Stealth','Survival'].indexOf(n)];
  eq([sk('Arcana'),sk('History'),sk('Perception'),sk('Stealth')],[[6,1],[9,2],[4,1],[3,0]],'skills (proficiency and expertise)');
  const act=n=>ps.acts.find(a=>a.n===n);
  eq([act('Dagger').hit,act('Dagger').dmg],[6,[['1d4+3','Piercing']]],'finesse dagger uses DEX');
  eq([act('Light Crossbow +1').hit,act('Light Crossbow +1').dmg[0][0]],[7,'1d8+4'],'magic crossbow');
  if(act('Quarterstaff'))fail('unequipped weapons stay off the sheet');
  eq([act('Fey Step').c,act('Fey Step').u.max,act('Fey Step').u.used],['b',3,1],'bonus action with proficiency-bonus uses');
  eq([act('Hellish Rebuke Pulse').c,act('Hellish Rebuke Pulse').dc,act('Hellish Rebuke Pulse').sv],['r',12,'DEX'],'reaction with a save');
  if(!/up to 3 levels/.test(act('Arcane Recovery').note))fail('snippet templates filled in: '+act('Arcane Recovery').note);
  eq(ps.sp.slots,[4,3],'wizard 4 slots');eq(ps.sp.pact,{l:1,n:1},'warlock 1 pact magic');eq(ps.use.sl,[1,0],'slots already spent on D&D Beyond');
  const sp=n=>ps.sp.list.find(s=>s.n===n);
  eq([sp('Fire Bolt').hit,sp('Fire Bolt').dmg[0][0]],[6,'2d10'],'cantrip scales with character level');
  eq([sp('Eldritch Blast').hit],[4],'warlock spells use CHA');
  eq([sp('Burning Hands').dc,sp('Burning Hands').sv,sp('Burning Hands').dmg[0]],[14,'DEX',['3d6','Fire','1d6']],'save spell with upcast dice');
  eq(sp('Cure Wounds').dmg[0],['1d8+1','Healing','1d8'],'healing adds the casting modifier');
  eq([sp('Shield').c,sp('Misty Step').c,sp('Hex').c],['r','b','b'],'casting times');
  eq([!!sp('Detect Magic').np,!!sp('Burning Hands').np,!!sp('Hex').np],[true,false,false],'unprepared wizard spells flagged; warlock spells are known');
  eq([sp('Faerie Fire').dc,sp('Faerie Fire').u.max],[14,1],'racial spell, once per long rest');
  // dice
  const dr=await p.evaluate(()=>{const R=window.__sheet;const out=[];for(let i=0;i<300;i++){const r=R.diceRoll('2d6+3');out.push(r.total)}
    const a=R.diceRoll('1d20+5',{adv:'a'}),c=R.diceRoll('1d8+2',{crit:true});return{min:Math.min(...out),max:Math.max(...out),a:a.dice,c:c.dice.length,bad:[R.diceParse('d'),R.diceParse('100d6'),R.diceParse('1d20; alert(1)'),R.diceParse('1d1')]}});
  if(dr.min<5||dr.max>15||dr.min>6||dr.max<14)fail('2d6+3 range: '+dr.min+'..'+dr.max);
  if(dr.a.length!==1||dr.a[0].length!==3||dr.a[0][1]<dr.a[0][2])fail('advantage keeps the higher d20: '+JSON.stringify(dr.a));
  if(dr.c!==2)fail('a critical doubles the dice');if(dr.bad.some(Boolean))fail('bad dice rejected');

  // ---- the panel, solo ----
  const S=()=>p.evaluate(()=>window.__dustmap());
  const scr=async(x,y)=>{const d=await S(),box=await (await p.$('#map')).boundingBox();return[box.x+(x-d.cam.x)*d.Z,box.y+(y-d.cam.y)*d.Z]};
  const tok=(await S()).st.tokens.find(t=>t.s===3);
  await p.keyboard.press('v');await p.mouse.click(...await scr(tok.x,tok.y-12));await p.waitForTimeout(200);
  await p.click('#selbar button[aria-label="Add a character"]');await p.fill('#chlink',LINK);await p.click('#chgo');
  await until(()=>p.isVisible('#chpaste'),'paste step');await p.fill('#chpaste',SHEET);
  await until(async()=>(await p.textContent('.chtop b').catch(()=>''))==='Elmira Thorn','card');
  await p.click('#chplay');await until(()=>p.isVisible('#sheet'),'sheet opens from the card');
  if(!/Dagger/.test(await p.textContent('#sheet'))||!/Bonus actions/.test(await p.textContent('#sheet')))fail('actions tab lists attacks and bonus actions');
  if(!/Misty Step/.test(await p.textContent('#sheet')))fail('bonus-action spells listed with bonus actions');
  await p.click('#sheet .shrow[data-k="w0"] .btn.dice');   // dagger to hit
  await until(()=>p.isVisible('#rollfeed .rl'),'roll shows in the feed');
  const r1=(await p.evaluate(()=>window.__sheet.rolls()))[0];
  if(r1.l!=='Dagger · to hit'||r1.e!=='1d20+6'||r1.t!==r1.d[0][1]+6)fail('to-hit roll: '+JSON.stringify(r1));
  await p.click('#sheet .shrow[data-k="w0"] .btn.dmg');
  const r2=(await p.evaluate(()=>window.__sheet.rolls()))[1];
  if(!/Dagger · piercing damage/.test(r2.l)||r2.e!=='1d4+3')fail('damage roll: '+JSON.stringify(r2));
  if(r1.nat===20&&r2.d.length!==2)fail('damage after a natural 20 is a critical');
  await p.click('#shinit');const ri=(await p.evaluate(()=>window.__sheet.rolls())).pop();if(ri.e!=='1d20+5')fail('initiative: '+ri.e);
  await p.click('#shtab-spl');
  const slotTxt=await p.textContent('.shslots');if(!/3\/4/.test(slotTxt)||!/Pact 1st/.test(slotTxt))fail('slots: '+slotTxt);
  if(/Detect Magic/.test(await p.textContent('#sheet .shbody')))fail('unprepared spells hidden by default');
  const bh='#sheet .shrow[data-k="sburning-hands"]';
  await p.selectOption(bh+' select','2');await p.click(bh+' .btn.dmg');
  const r3=(await p.evaluate(()=>window.__sheet.rolls())).pop();if(r3.e!=='4d6'||!/2nd level/.test(r3.l))fail('upcast damage: '+JSON.stringify(r3));
  await p.click(bh+' .btn.cast');
  await until(()=>p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dustmap-sheets'))['987654321'];return s.use.sl[1]===1}),'casting spends a 2nd-level slot');
  if(!/casts Burning Hands at 2nd level/.test((await p.evaluate(()=>window.__sheet.rolls())).pop().l))fail('cast told the table');
  await p.click(bh+' .btn.dice:has-text("DC 14 DEX")');if(!/DC 14 DEX save/.test((await p.evaluate(()=>window.__sheet.rolls())).pop().l))fail('save DC note');
  await p.screenshot({path:path.join(OUT,'sheet_spells.png')});
  await p.click('#sheet .shrest button:has-text("Long rest")');
  await until(()=>p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dustmap-sheets'))['987654321'];return s.use.sl.every(v=>v===0)&&s.use.u['xfey-step']===0}),'long rest refills');
  await p.click('#shtab-chk');await p.click('#sheet .shskill:has-text("History")');
  if((await p.evaluate(()=>window.__sheet.rolls())).pop().e!=='1d20+9')fail('history with expertise');
  await p.click('#sheet .shbar button:has-text("Advantage")');await p.click('#sheet .shab .btn.dice >> nth=0');
  const ra=(await p.evaluate(()=>window.__sheet.rolls())).pop();if(ra.a!=='a'||ra.d[0].length!==3)fail('advantage toggle');
  await p.click('#shtab-dice');await p.fill('#shexpr','3d8+2');await p.press('#shexpr','Enter');
  const rd=(await p.evaluate(()=>window.__sheet.rolls())).pop();if(rd.e!=='3d8+2'||rd.d.length!==3)fail('free dice');
  // the stage: one d8-shaped die per die, the modifier apart, the total once they land
  if(await p.$$eval('#rollstage .die[data-d="8"]',l=>l.length)!==3)fail('three d8 dice on the stage');
  if((await p.textContent('#rollstage .dmod')).replace(/\s/g,'')!=='+2')fail('modifier shown apart');
  await until(()=>p.evaluate(()=>document.querySelector('#rollstage').classList.contains('done')),'dice land');
  const shown=await p.$$eval('#rollstage .die text',l=>l.map(t=>+t.textContent));if(JSON.stringify(shown)!==JSON.stringify(rd.d.map(x=>x[1])))fail('dice land on the rolled numbers: '+shown);
  if(+(await p.textContent('#rollstage .stot'))!==rd.t)fail('stage total');
  await p.evaluate(()=>{const o=crypto.getRandomValues.bind(crypto);window.__q=[19];crypto.getRandomValues=a=>{if(window.__q.length){a[0]=window.__q.shift();return a}return o(a)}});
  await p.fill('#shexpr','1d20+1');await p.press('#shexpr','Enter');
  await until(()=>p.evaluate(()=>document.querySelector('#rollstage').classList.contains('n20')&&!!document.querySelector('#rollstage .die.n20')),'natural 20 is green');
  await p.click('#shtab-act');await p.screenshot({path:path.join(OUT,'sheet_actions.png')});
  await p.click('#rollfeed .rlhead');await p.screenshot({path:path.join(OUT,'sheet_roll_history.png')});await p.click('#rollfeed .rlhead');
  // a character imported before the play sheet existed asks for an update
  await p.evaluate(()=>window.__openChar(0));await p.fill('#chlink','123456789');await p.click('#chgo');await until(()=>p.isVisible('#chpaste'),'paste 2');
  await p.evaluate(()=>{});await p.fill('#chpaste',OLD);await until(async()=>(await p.textContent('.chtop b').catch(()=>''))==='Mara Dunwell','old card');
  await p.evaluate(()=>{localStorage.setItem('dustmap-sheets',JSON.stringify({}))});
  await p.click('#chclose');
  if(errs.length)fail('page errors: '+errs.join(' | '));
  await ctx.close();

  // ---- live ----
  const store=new Map(),pres=new Map(),pages=[];
  const broadcast=m=>Promise.all(pages.map(p=>p.evaluate(m=>window.__hubRecv&&window.__hubRecv(m),m).catch(()=>{})));
  async function open(id,o={}){const cx=await b.newContext({viewport:{width:1360,height:900}});const q=await cx.newPage();q.errs=[];q.on('pageerror',e=>q.errs.push(e.message));
    await cx.route('https://character-service.dndbeyond.com/**',r=>r.abort());
    await cx.exposeBinding('__hubSend',async(src,m)=>{
      if(m.t==='hello')await src.page.evaluate(m=>window.__hubRecv(m),{t:'init',store:[...store],peers:[...pres.values()]});
      if(m.t==='set'){store.set(m.path,m.data);await broadcast(m)}
      if(m.t==='pres'){pres.set(m.peer,{peer:m.peer,by:m.by,kind:'viewer',guest:false,presence:m.presence});await broadcast(m)}});
    await cx.addInitScript(`window.__names={u_dm:'Hunter',u_p1:'Alex'};(${install.toString()})(${JSON.stringify({id,name:id,owner:!!o.owner,admin:!!o.owner})})`);
    await q.goto(PAGE);await q.waitForTimeout(1200);pages.push(q);return q}
  const dm=await open('u_dm',{owner:true}),p1=await open('u_p1');
  await dm.click('#mpbtn');await dm.click('#mpbody button:has-text("Start session")');await dm.click('#mpclose');
  await until(()=>p1.evaluate(()=>window.__dustmap().role==='player'),'player role');
  await until(()=>p1.isVisible('.mppick .tokbtn'),'picker');await p1.locator('.mppick .tokbtn').nth(3).click();await p1.click('#mpplay');
  await until(()=>{const s=store.get('live/session');return s&&s.assign&&s.assign['3']==='u_p1'},'pick lands');
  await until(()=>p1.isVisible('#mychar'),'tray');await p1.click('#mychar');await p1.fill('#chlink',LINK);await p1.click('#chgo');
  await until(()=>p1.isVisible('#chpaste'),'player paste');await p1.fill('#chpaste',SHEET);
  await until(async()=>(await p1.textContent('.chtop b').catch(()=>''))==='Elmira Thorn','player card');await p1.click('#chclose');
  await until(()=>p1.isVisible('#mysheet'),'Sheet & dice in the tray');await p1.click('#mysheet');await until(()=>p1.isVisible('#sheet'),'player sheet');
  await p1.click('#shtab-spl');await p1.click('#sheet .shrow[data-k="sfire-bolt"] .btn.dice');
  const pr=(await p1.evaluate(()=>window.__sheet.rolls())).pop();
  await until(()=>dm.evaluate(n=>window.__sheet.rolls().some(r=>r.l==='Fire Bolt · to hit'&&r.w==='Elmira Thorn'&&r.t===n),pr.t),'player roll reaches the DM');
  await until(()=>dm.evaluate(()=>!document.querySelector('#rollstage').hidden&&!!document.querySelector('#rollstage .die[data-d="20"]')),'the DM watches the player\'s d20 land');
  await until(()=>dm.isVisible('#rollfeed .rl'),'DM feed');
  const who=await dm.textContent('#rollfeed .rl .who');if(!/Elmira Thorn/.test(who)||!/Alex/.test(who))fail('feed names the character and the player: '+who);
  const dr2=await dm.evaluate(()=>window.__sheet.rolls().pop());if(dr2.s!==3)fail('roll tied to the token for the bubble');
  await dm.waitForTimeout(300);await dm.screenshot({path:path.join(OUT,'sheet_dm_sees_roll.png')});
  await p1.screenshot({path:path.join(OUT,'sheet_player.png')});
  // the DM rolls for an NPC: public, then private
  const nt=(await dm.evaluate(()=>window.__dustmap())).st.tokens.find(t=>t.s===0);
  await dm.evaluate(()=>{});await dm.evaluate(()=>window.__openChar(0));await dm.fill('#chlink','123456789');await dm.click('#chgo');await until(()=>dm.isVisible('#chpaste'),'dm paste');
  await dm.fill('#chpaste',OLD);await until(async()=>(await dm.textContent('.chtop b').catch(()=>''))==='Mara Dunwell','dm card');await dm.click('#chplay');
  await dm.click('#shtab-dice');await dm.click('#sheet .shdice .btn:has-text("d20")');
  await until(()=>p1.evaluate(()=>window.__sheet.rolls().some(r=>r.w==='Mara Dunwell'&&r.l==='d20')),'DM public roll reaches the player');
  await dm.check('#shpriv');await dm.click('#sheet .shdice .btn:has-text("d12")');await p1.waitForTimeout(800);
  if(await p1.evaluate(()=>window.__sheet.rolls().some(r=>r.l==='d12')))fail('private roll stayed private');
  if(!(await dm.evaluate(()=>window.__sheet.rolls().some(r=>r.l==='d12'&&r.priv))))fail('DM sees their private roll');
  const pe=pages.flatMap(q=>q.errs);if(pe.length)fail('page errors: '+pe.join(' | '));
  console.log('PASS: play sheet (parsing, rolls, slots, rests, checks, shared and private rolls)')}
catch(e){console.log('FAIL: '+e.message);code=1}
await b.close();process.exit(code)})();
