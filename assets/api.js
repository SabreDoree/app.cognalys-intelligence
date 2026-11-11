'use strict';
const QuoteAPI=(()=>{
 const base='https://n8n.cognalys-intelligence.fr/webhook/cognalys/v2/';
 const storage='cognalys.private-demo.v2';let key,storageAvailable=true;
 try{key=localStorage.getItem(storage);}catch{storageAvailable=false;}
 if(!/^[a-f0-9]{64}$/.test(key||'')){key=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');try{localStorage.setItem(storage,key);}catch{storageAvailable=false;}}
 async function request(route,data,binary=false){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),120000);
  try{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,workspaceKey:key}),credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});
   if(!r.ok)throw Error('Service indisponible (HTTP '+r.status+').');
   if(binary){const blob=await r.blob();if(blob.type.split(';')[0]!=='application/pdf'||await blob.slice(0,5).text()!=='%PDF-')throw Error('Le serveur n’a pas renvoyé un PDF valide.');return blob;}
   const d=await r.json();if(route==='api'&&d.ok!==true)throw Error(d.error||'Réponse métier invalide.');if(d.ok===false)throw Error(d.error||'Opération refusée.');return d;
  }catch(e){if(e.name==='AbortError')throw Error('Délai dépassé. Le résultat est incertain : actualisez avant de réessayer.');throw e;}finally{clearTimeout(timeout);}
 }
 return {request,call:(sessionId,command,params={},requestId=crypto.randomUUID())=>request('api',{sessionId,command,params,requestId}),getKey:()=>key,storageAvailable,importKey(value){if(!/^[a-f0-9]{64}$/.test(value))throw Error('Clé invalide : 64 caractères hexadécimaux requis.');localStorage.setItem(storage,value);location.reload();}};
})();
