const {chromium}=require('playwright');const path=require('path');const {pathToFileURL}=require('url');
// Hills and cliffs are always sculpted: the brush paints an area and you drag it up or down; a shape is drawn one level up,
// stays selected, and dragging any hill or cliff up or down (or ↑ ↓, or the tray stepper) changes its height.
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');require('fs').mkdirSync(OUT,{recursive:true});const out=f=>path.join(OUT,f);
const fail=m=>{throw new Error(m)};
(async()=>{const b=await chromium.launch();let code=0;
try{
const p=await b.newPage({viewport:{width:1440,height:960}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.__starterExample=true});
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
await p.click('#more');await p.uncheck('#anim');await p.keyboard.press('Escape');
// a blank map, so every height op is ours
await p.evaluate(()=>{const d=window.__dustmap();d.st.ops=[];d.st.objects=[];d.st.tokens=[];});await p.click('#rag',{force:true}).catch(()=>{});
await p.evaluate(()=>{const r=document.getElementById('rag');r.dispatchEvent(new Event('input'))});await p.waitForTimeout(600);
const box=await (await p.$('#map')).boundingBox();const z=await p.evaluate(()=>window.__dustmap().Z);const cam=await p.evaluate(()=>window.__dustmap().cam);
const m=(x,y)=>[box.x+(x-cam.x)*z,box.y+(y-cam.y)*z];
const st=()=>p.evaluate(()=>window.__dustmap().st);const hops=async()=>(await st()).ops.filter(o=>o.layer==='height');
// rail opens in sculpt brush mode; the tray has Hill / Cliff and no fixed-level swatches
await p.keyboard.press('e');await p.waitForTimeout(100);
if(await p.evaluate(()=>window.__dustmap().tool)!=='sculpt')fail('Hills should open on the sculpt brush');
if(await p.$('#p-h0'))fail('old fixed-level swatches should be gone');
if(!(await p.isVisible('#p-hs0'))||!(await p.isVisible('#p-hs1')))fail('Hill and Cliff styles should be in the tray');
if(await p.isVisible('#hlevel'))fail('level stepper only shows with a hill or cliff selected');
if(await p.getAttribute('#pm-brush','aria-pressed')!=='true')fail('Brush should be lit');
// brush: Cliff style, paint, hold, drag up two levels
await p.click('#p-hs1');let [a,c]=m(120,120);await p.mouse.move(a,c);await p.mouse.down();await p.mouse.move(a+60,c,{steps:6});await p.waitForTimeout(700);
await p.mouse.move(a+60,c-70,{steps:6});await p.mouse.up();await p.waitForTimeout(300);
let h=await hops();if(h.length!==1||h[0].kind!=='stroke'||h[0].h!==2||h[0].s!==1)fail('brush sculpt should make a +2 cliff stroke, got '+JSON.stringify(h));
if(!(await p.isVisible('#hlevel'))||(await p.textContent('#hl-v'))!=='+2')fail('the new stroke should be selected with the stepper on +2');
await p.keyboard.press('ArrowDown');h=await hops();if(h[0].h!==1)fail('↓ should lower the stroke to +1');
// shape: Hill style, click corners, Enter: one level up and selected
await p.click('#p-hs0');await p.click('#pm-draw');if(await p.evaluate(()=>window.__dustmap().tool)!=='draw')fail('Shape should switch to shape drawing');
const shape=async pts=>{for(const q of pts){const [x,y]=m(...q);await p.mouse.click(x,y);await p.waitForTimeout(320)}await p.keyboard.press('Enter');await p.waitForTimeout(400)};
await shape([[300,160],[400,150],[410,240],[310,250]]);
h=await hops();let sh=h[1];if(!sh||sh.kind!=='poly'||sh.h!==1||sh.s!==0)fail('new shape should be a +1 hill, got '+JSON.stringify(sh));
const y0=sh.pts[0][1];
if((await p.textContent('#hl-v'))!=='+1')fail('new shape should be selected');
await p.screenshot({path:out('hills_shape_plus1.png'),clip:{x:box.x,y:box.y,width:box.width,height:box.height}});
// drag the whole shape up two levels
[a,c]=m(355,200);await p.mouse.move(a,c);await p.mouse.down();await p.mouse.move(a,c-64,{steps:8});
const mid=await hops();if(mid[1].h!==3)fail('dragging should lift live, got h '+mid[1].h);await p.mouse.up();await p.waitForTimeout(300);
h=await hops();sh=h[1];if(sh.h!==3)fail('shape should be +3 after the drag, got '+sh.h);if(sh.pts[0][1]!==y0)fail('lifting should not move the outline');
if(h.length!==2)fail('dragging a shape must not draw a new one');
await p.screenshot({path:out('hills_shape_plus3.png'),clip:{x:box.x,y:box.y,width:box.width,height:box.height}});
// switch it to a cliff with the style swatch
await p.click('#p-hs1');h=await hops();if(h[1].s!==1)fail('style swatch should restyle the selected hill');
// drag it down into a pit: always rock walls
[a,c]=m(355,195);await p.mouse.move(a,c);await p.mouse.down();await p.mouse.move(a,c+120,{steps:10});await p.mouse.up();await p.waitForTimeout(300);
h=await hops();if(h[1].h!==-1||h[1].s!==1)fail('dragging down should make a pit, got '+JSON.stringify([h[1].h,h[1].s]));
if(Math.abs(h[1].pts[0][1]-y0)>0.01)fail('the outline should stay where it was drawn');
await p.screenshot({path:out('hills_shape_pit.png'),clip:{x:box.x,y:box.y,width:box.width,height:box.height}});
// undo restores the cliff +3
await p.keyboard.press('Control+z');h=await hops();if(h[1].h!==3)fail('undo should bring back +3, got '+h[1].h);
// a click (no drag) on an existing hill starts a new shape on top of it
await p.keyboard.press('Escape');await shape([[330,180],[380,180],[380,220],[330,220]]);
h=await hops();if(h.length!==3||h[2].h!==Math.min(3,h[1].h+1))fail('a shape drawn on a +3 cliff should be +3 (capped), got '+JSON.stringify(h.map(o=>o.h)));
// Select tool: a selected hill shows Hill/Cliff and the stepper; the stepper changes it
await p.keyboard.press('v');{const q=await p.evaluate(()=>{const d=window.__dustmap(),o=d.st.ops[0];for(let x=o.pts[0][0];x<=o.pts[o.pts.length-1][0];x+=2){const y=o.pts[0][1];if(!d.st.objects.length)return[x,y]}return o.pts[0]});
 for(const dx of [0,10,20,30,40,50]){[a,c]=m(q[0]+dx,q[1]);await p.mouse.click(a,c);await p.waitForTimeout(150);if(await p.isVisible('#hlevel'))break;await p.keyboard.press('Escape')}}await p.waitForTimeout(200);
if(!(await p.isVisible('#hlevel')))fail('Select on a hill should show the stepper; sel='+JSON.stringify(await p.evaluate(()=>{const d=window.__dustmap();return [d.tool,document.getElementById('paints').hidden,document.getElementById('hlevel')&&document.getElementById('hlevel').hidden,document.getElementById('hint').textContent]})));
await p.click('#hl-up');h=await hops();if(h[0].h!==2)fail('stepper up should raise the selected stroke, got '+h[0].h);
// D in the Hills tool picks the hills shape, not ground
await p.keyboard.press('e');await p.keyboard.press('d');if(await p.evaluate(()=>{const d=window.__dustmap();return d.tool})!=='draw')fail('D should pick shape');
if(await p.getAttribute('#t-height','aria-pressed')!=='true')fail('D in Hills should stay on Hills');
await p.keyboard.press('b');if(await p.getAttribute('#t-paint','aria-pressed')!=='true')fail('B still opens Paint ground');
// four brush sizes; the largest is 22
await p.keyboard.press('e');const sz=await p.$$eval('#sizes button',bs=>bs.map(b=>+b.dataset.v));if(JSON.stringify(sz)!=='[3,6,12,22]')fail('brush sizes should be 3/6/12/22, got '+sz);
await p.click('#pm-brush');await p.click('#sizes button:last-child');[a,c]=m(520,320);await p.mouse.move(a,c);await p.mouse.down();await p.mouse.move(a+40,c,{steps:4});await p.waitForTimeout(700);await p.mouse.move(a+40,c-40,{steps:4});await p.mouse.up();
h=await hops();if(h[h.length-1].r!==22)fail('extra large brush should paint with radius 22');
await p.screenshot({path:out('hills_final.png'),clip:{x:box.x,y:box.y,width:box.width,height:box.height}});
if(errs.length)fail('page errors: '+errs.join(' | '));
console.log('PASS: hills and cliffs sculpt with brush and shape, drag up/down, stepper, style, undo');
}catch(e){console.error('FAIL:',e.message);code=1}
await b.close();process.exit(code)})();
