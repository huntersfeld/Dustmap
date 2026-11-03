// A stand-in for the claude.ai page runtime (db, room, user), for tests only.
// Every page talks to a hub in the Node test through window.__hubSend / window.__hubRecv,
// so pages in separate browser contexts (separate localStorage) share one db and one room.
// Rules mirror the published declaration: everyone reads, only admin (owner/Editor) writes.
module.exports=function install({id,name,owner,admin}){
  const peerLabel='peer-'+id+'-'+Math.random().toString(36).slice(2,6);
  const store=new Map();const docL=new Map();const colL=new Map();
  const peers=new Map();let peerL=[];
  const snapDoc=(path)=>{const d=store.get(path);return{id:path.split('/').pop(),exists:d!==undefined,data:()=>d===undefined?undefined:JSON.parse(JSON.stringify(d)),metadata:{fromCache:false,hasPendingWrites:false}}};
  const snapCol=(path)=>{const docs=[...store.keys()].filter(k=>k.startsWith(path+'/')&&k.split('/').length===path.split('/').length+1).sort().map(snapDoc);return{docs,size:docs.length,empty:!docs.length,docChanges:()=>[],metadata:{fromCache:false,hasPendingWrites:false}}};
  const fireDoc=path=>{(docL.get(path)||[]).forEach(f=>f(snapDoc(path)));const col=path.split('/').slice(0,-1).join('/');(colL.get(col)||[]).forEach(f=>f(snapCol(col)))};
  const docRef=path=>({id:path.split('/').pop(),path,
    get:async()=>snapDoc(path),
    set:async(data)=>{if(!admin)throw{code:'invalid_argument',message:'write below minimum level'};
      if(JSON.stringify(data).length>256*1024)throw{code:'invalid_argument',message:'too big'};
      await window.__hubSend({t:'set',path,data})},
    onSnapshot:(next)=>{const l=docL.get(path)||[];l.push(next);docL.set(path,l);setTimeout(()=>next(snapDoc(path)),0);return()=>{}},
    collection:(c)=>colRef(path+'/'+c)});
  const colRef=path=>({path,doc:(i)=>docRef(path+'/'+i),onSnapshot:(next)=>{const l=colL.get(path)||[];l.push(next);colL.set(path,l);setTimeout(()=>next(snapCol(path)),0);return()=>{}}});
  const db={doc:docRef,collection:colRef};
  const peerList=()=>[...peers.values()].map(p=>Object.freeze({...p,isMe:p.by===id,sameTab:p.peer===peerLabel}));
  let cached=[];const firePeers=(joined=[],left=[])=>{cached=peerList();peerL.forEach(f=>f({peers:cached,joined,left,updated:[]}))};
  let mine={};
  const room={presence:async(patch)=>{for(const[k,v]of Object.entries(patch)){if(v===null)delete mine[k];else mine[k]=v}await window.__hubSend({t:'pres',peer:peerLabel,by:id,presence:JSON.parse(JSON.stringify(mine))})},
    onPeers:(f)=>{peerL.push(f);setTimeout(()=>f({peers:cached,joined:cached,left:[],updated:[]}),0);return()=>{}},
    peers:()=>cached,emit:async()=>{},on:()=>()=>{},connected:()=>true};
  const user={id:async()=>id,isOwner:async()=>owner,canEdit:async()=>admin,can:async()=>admin,
    me:async()=>({id,name,isOwner:owner}),
    profiles:async(ids)=>{const r={};(Array.isArray(ids)?ids:[ids]).forEach(i=>r[i]={id:i,name:window.__names[i]||'',avatarUrl:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',color:'#888',email:null,isMe:i===id,guest:false});return r}};
  window.__hubRecv=m=>{
    if(m.t==='set'){store.set(m.path,m.data);fireDoc(m.path)}
    if(m.t==='pres'){const had=peers.has(m.peer);peers.set(m.peer,{peer:m.peer,by:m.by,kind:'viewer',guest:false,presence:Object.freeze(m.presence),updatedAt:Date.now()});firePeers(had?[]:[m.peer])}
    if(m.t==='leave'){peers.delete(m.peer);firePeers([],[{peer:m.peer}])}
    if(m.t==='init'){m.store.forEach(([k,v])=>store.set(k,v));m.peers.forEach(p=>peers.set(p.peer,{...p,presence:Object.freeze(p.presence)}));firePeers()}};
  window.__hubReady=window.__hubSend({t:'hello',peer:peerLabel,by:id});
  // the real runtime resolves use() after the page's first script run
  setTimeout(()=>{window.claude={use:async n=>({db,room,user})[n]||null}},50);
};
