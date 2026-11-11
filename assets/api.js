'use strict';
const QuoteAPI=(()=>{
 const base='https://n8n.cognalys-intelligence.fr/webhook/cognalys/v2/';
 async function request(route,data,binary=false){
  const identity=CognalysAuth.state.user?.uid;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),120000);
  try{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,idToken:await CognalysAuth.token()}),credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});
   if(CognalysAuth.state.user?.uid!==identity)throw Error('Le compte connecté a changé.');
   if(!r.ok){let d;try{d=await r.json()}catch{}throw Error(d?.error||'Service indisponible (HTTP '+r.status+').');}
   if(binary){const blob=await r.blob();if(blob.type.split(';')[0]!=='application/pdf'||await blob.slice(0,5).text()!=='%PDF-')throw Error('Le serveur n’a pas renvoyé un PDF valide.');return blob;}
   const d=await r.json();if(route==='api'&&d.ok!==true)throw Error(d.error||'Réponse métier invalide.');if(d.ok===false)throw Error(d.error||'Opération refusée.');return d;
  }catch(e){if(e.name==='AbortError')throw Error('Délai dépassé. Le résultat est incertain : actualisez avant de réessayer.');throw e;}finally{clearTimeout(timeout);}
 }
 return {request,call:(sessionId,command,params={},requestId=crypto.randomUUID())=>request('api',{sessionId,command,params,requestId}),storageAvailable:true};
})();

