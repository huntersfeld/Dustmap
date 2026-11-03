const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const {pathToFileURL}=require('url');
// Map library: new map, rename, switch, export to a file, import it back, delete, survive reload.
const PAGE=pathToFileURL(path.resolve(__dirname,'..','dustmap.html')).href;
const OUT=path.join(__dirname,'output');fs.mkdirSync(OUT,{recursive:true});const out=f=>path.join(OUT,f);
const fail=m=>{throw new Error(m)};
const lib=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-library')));
const cur=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('dustmap-v2')));

(async()=>{const b=await chromium.launch();let code=0;
try{
const ctx=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(PAGE);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);

// first load: the existing map becomes the first library entry
let L=await lib(p);if(L.maps.length!==1||L.maps[0].id!==L.cur)fail('expected one map on first load');
const exampleOps=(await cur(p)).ops.length;if(!exampleOps)fail('example map should have shapes');
if(!(await p.textContent('#libname')).trim())fail('header should show the map name');

// new blank map, renamed by typing
await p.click('#libbtn');await p.click('#libnew');await p.waitForTimeout(300);
await p.fill('.libmap input','Mine level 1');await p.press('.libmap input','Enter');
L=await lib(p);if(L.maps.length!==2)fail('new map not added');
if(L.maps.find(m=>m.id===L.cur).name!=='Mine level 1')fail('rename failed: '+JSON.stringify(L.maps));
if((await cur(p)).ops.length!==0)fail('new map should be blank');
if(await p.isDisabled('#undo')===false)fail('undo history should not carry over to a new map');
await p.click('#libclose');
// draw a shape on it
const box=await (await p.$('#map')).boundingBox();const c=[box.x+box.width/2,box.y+box.height/2];
await p.keyboard.press('d');for(const [dx,dy] of [[-60,-40],[60,-40],[60,40],[-60,40]])await p.mouse.click(c[0]+dx,c[1]+dy);await p.keyboard.press('Enter');await p.waitForTimeout(400);
if((await cur(p)).ops.length!==1)fail('shape not drawn on new map');

// switch back to the first map: its content returns untouched
await p.click('#libbtn');await p.click('.libmap:not(.cur) .btn.primary');await p.waitForTimeout(800);
if((await cur(p)).ops.length!==exampleOps)fail('switching back lost the first map');
if(await p.isVisible('#libmodal'))fail('dialog should close after opening a map');

// export the mine map to a file
await p.click('#libbtn');
const row=p.locator('.libmap',{hasText:'Mine level 1'});
const [dl]=await Promise.all([p.waitForEvent('download'),row.getByRole('button',{name:'Export'}).click()]);
const file=out(dl.suggestedFilename());await dl.saveAs(file);
if(dl.suggestedFilename()!=='mine-level-1.dustmap.json')fail('unexpected filename '+dl.suggestedFilename());
const data=JSON.parse(fs.readFileSync(file,'utf8'));
if(data.format!=='dustmap'||data.kind!=='map'||data.name!=='Mine level 1'||data.map.ops.length!==1)fail('bad export '+JSON.stringify(data).slice(0,200));

// delete it (two clicks), then import the file back: it returns as a new map and opens
await row.getByRole('button',{name:'Delete'}).click();await p.locator('.libmap',{hasText:'Mine level 1'}).getByRole('button',{name:'Click again to delete'}).click();
L=await lib(p);if(L.maps.length!==1)fail('delete failed');
if(await p.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('dustmap-map:')).length)!==1)fail('deleted map data left behind');
await p.setInputFiles('#libfile',file);await p.waitForTimeout(800);
L=await lib(p);const imp=L.maps.find(m=>m.id===L.cur);
if(L.maps.length!==2||imp.name!=='Mine level 1')fail('import did not add and open the map: '+JSON.stringify(L.maps));
if((await cur(p)).ops.length!==1)fail('imported map content wrong');

// export all, then import the library file: names get de-duplicated
const [dl2]=await Promise.all([p.waitForEvent('download'),p.click('#libexportall')]);const all=out('all.dustmap.json');await dl2.saveAs(all);
const allData=JSON.parse(fs.readFileSync(all,'utf8'));if(allData.kind!=='library'||allData.maps.length!==2)fail('bad library export');
await p.setInputFiles('#libfile',all);await p.waitForTimeout(800);
L=await lib(p);if(L.maps.length!==4||!L.maps.some(m=>m.name==='Mine level 1 (2)'))fail('library import wrong: '+JSON.stringify(L.maps.map(m=>m.name)));

// junk text is refused without breaking anything
await p.click('#libtx summary');await p.fill('#libtext','{"hello":1}');await p.click('#libpaste');
if(!/Nothing was imported/.test(await p.textContent('#libmsg')))fail('junk import message missing');
L=await lib(p);if(L.maps.length!==4)fail('junk import changed the library');
await p.screenshot({path:out('map_library.png')});
await p.keyboard.press('Escape');if(await p.isVisible('#libmodal'))fail('Escape should close the dialog');

// reload keeps the open map and the library
const before=await cur(p);await p.reload();await p.waitForTimeout(1500);
const L2=await lib(p);if(L2.cur!==L.cur||L2.maps.length!==4)fail('library lost on reload');
if(JSON.stringify((await cur(p)).ops)!==JSON.stringify(before.ops))fail('open map changed on reload');
if(errs.length)fail('page errors: '+errs.join(' | '));
console.log('PASS: map library new/rename/switch/export/import/delete');
}catch(e){console.error('FAIL:',e.message);code=1}
await b.close();process.exit(code)})();
