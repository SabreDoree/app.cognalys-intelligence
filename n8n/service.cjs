'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function normalize(raw) {
  const p=raw.body ?? raw;
  if(typeof p.idToken!=='string'||!p.idToken) throw Error('Connexion requise.');
  if(!UUID.test(p.sessionId||'')) throw Error('sessionId doit être un UUID de conversation, jamais un dossierId.');
  let params=p.params??{};
  if(typeof params==='string') {try{params=JSON.parse(params);}catch{throw Error('Paramètres JSON invalides.');}}
  if(!params||Array.isArray(params)||typeof params!=='object') throw Error('Paramètres invalides.');
  if(JSON.stringify(params).length>(p.command==='settings.save'?500000:40000)) throw Error('Demande trop volumineuse.');
  return {idToken:p.idToken,sessionId:p.sessionId,command:String(p.command||''),params,requestId:String(p.requestId||'')};
}
function service(req, rows, token, now=new Date().toISOString()) {
  const p=req.params, command=req.command;
  const clean=(v,max=1000)=>{if(typeof v!=='string'||v.length>max)throw Error('Texte invalide ou trop long.');return v.trim();};
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
  const num=(v,min,max,dec=2)=>{if((typeof v!=='number'&&typeof v!=='string')||String(v).trim()===''||!/^\d+(\.\d+)?$/.test(String(v)))throw Error('Nombre requis.');const n=Number(v);if(!Number.isFinite(n)||n<min||n>max||Math.abs(n*10**dec-Math.round(n*10**dec))>1e-6)throw Error('Nombre hors limites.');return n;};
  const events=rows.filter(r=>r.scope===req.scope&&r.payload).sort((a,b)=>Number(a.id)-Number(b.id)).map(r=>{const data=JSON.parse(r.payload);const request=data._request;delete data._request;return {...r,request,data};});
  const latest=kind=>{const m=new Map();for(const e of events.filter(e=>e.kind===kind))m.set(e.entity,e.data);return [...m.values()];};
  const defaults={revision:0,companyName:'',companyDetails:'',primaryColor:'#3E7CE0',accentColor:'#E9F0FA',logo:'',intro:'',comments:'',footer:''};
  const settings=latest('settings')[0]||defaults;
  const catalog=latest('catalog'), dossiers=latest('dossier'), quotes=events.filter(e=>e.kind==='quote').map(e=>e.data);
  const headQuotes=()=>quotes.filter(q=>!quotes.some(r=>r.parentToken===q.token));
  const current=q=>headQuotes().filter(r=>r.quoteId===q.quoteId);
  const decorate=q=>({...q,current:current(q).some(x=>x.token===q.token),conflict:current(q).length>1,stale:dossiers.find(d=>d.dossierId===q.dossierId)?.revision!==q.client.revision});
  const out=result=>({result:{ok:true,...result},write:false,pdf:false});
  const write=(kind,entity,data,result,pdf=false)=>({result:{ok:true,...result},write:true,pdf,event:{scope:req.scope,kind,entity,requestId:req.requestId,payload:JSON.stringify({...data,_request:JSON.stringify({command,params:p})})}});
  const lookup=(list,ref,fields)=>list.filter(r=>fields.some(f=>norm(r[f])&&norm(r[f])===norm(ref)));
  const one=(list,label)=>{if(list.length!==1)throw Error(list.length?'Plusieurs '+label+' correspondent : précisez l’identifiant.':label+' introuvable dans cet espace.');return list[0];};
  const getDossier=id=>one(dossiers.filter(d=>d.dossierId===id),'Dossier');
  const getQuote=()=>{if(p.token)return one(quotes.filter(q=>q.token===p.token),'Devis');let found=lookup(quotes,p.ref||p.quoteId||p.dossierId,['quoteId','numero','dossierId','clientName']);if(!found.length&&p.ref){const ds=dossiers.filter(d=>[d.nom_client,d.prenom_client,d.clientName,d.dossierId].some(v=>norm(v)===norm(p.ref)));found=quotes.filter(q=>ds.some(d=>d.dossierId===q.dossierId));}if(p.version)found=found.filter(q=>q.version===Number(p.version));else if(!quotes.some(q=>norm(q.numero)===norm(p.ref)))found=found.filter(q=>headQuotes().some(h=>h.token===q.token));return one(found,'Devis');};
  const isWrite=['settings.save','catalog.save','catalog.delete','dossier.save','quote.create','quote.revise'].includes(command);
  if(isWrite){if(!UUID.test(req.requestId))throw Error('requestId UUID obligatoire.');const prior=events.find(e=>e.requestId===req.requestId);if(prior){if(prior.request!==JSON.stringify({command,params:p}))throw Error('requestId déjà utilisé pour une autre opération.');if(prior.kind!==command.split('.')[0])throw Error('requestId déjà utilisé.');return out({replayed:true,[prior.kind==='quote'?'quote':prior.kind==='settings'?'settings':prior.kind==='dossier'?'dossier':'item']:prior.kind==='quote'?decorate(prior.data):prior.data});}}
  if(command==='settings.get')return out({settings});
  if(command==='settings.save'){
    if(p.revision!==settings.revision)throw Error('Paramètres modifiés entre-temps. Actualisez avant de réessayer.');
    const next={revision:settings.revision+1};
    for(const k of ['companyName','companyDetails','intro','comments','footer'])next[k]=clean(p[k]??'',k==='companyName'?160:3000);
    for(const k of ['primaryColor','accentColor']){if(!/^#[0-9a-f]{6}$/i.test(p[k]||''))throw Error('Couleur hexadécimale invalide.');next[k]=p[k];}
    const logo=p.logo??'';if(typeof logo!=='string'||logo.length>350000)throw Error('Logo trop volumineux (250 Ko maximum).');
    if(logo){const m=logo.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/);if(!m)throw Error('Logo PNG ou JPEG requis.');const b=Buffer.from(m[2],'base64');if(b.length>256000||!(m[1]==='png'?b.subarray(0,8).toString('hex')==='89504e470d0a1a0a':b[0]===255&&b[1]===216&&b[2]===255))throw Error('Fichier logo invalide.');}
    next.logo=logo;return write('settings','company',next,{settings:next});
  }
  if(command==='catalog.list')return out({items:catalog.filter(x=>!x.deleted)});
  if(command==='catalog.save'||command==='catalog.delete'){
    const old=p.id?one(catalog.filter(c=>c.id===p.id&&!c.deleted),'Désignation'):null;
    if(old&&p.revision!==old.revision)throw Error('Catalogue modifié entre-temps. Rechargez avant d’enregistrer.');
    if(command==='catalog.delete'){
      if(quotes.some(q=>q.lines.some(l=>l.catalogId===old.id)))throw Error('Désignation utilisée : désactivez-la pour conserver son historique.');
      const item={...old,deleted:true,active:false,revision:old.revision+1};return write('catalog',item.id,item,{item});
    }
    const label=clean(p.label,160),description=clean(p.description??'',1000),unit=clean(p.unit,30);
    if(!label||!unit)throw Error('Libellé et unité requis.');
    const item={id:old?.id||'CAT-'+token,label,description,unit,price:num(p.price,0,1000000),vat:num(p.vat,0,100),active:p.active!==false,revision:(old?.revision||0)+1,deleted:false};
    return write('catalog',item.id,item,{item});
  }
  if(command==='dossier.list')return out({dossiers});
  if(command==='dossier.search'){
    const result=lookup(dossiers,clean(p.ref||'',160),['dossierId','nom_client','prenom_client','clientName']);
    return out({status:result.length===1?'trouve':result.length?'ambigu':'introuvable',dossiers:result});
  }
  if(command==='dossier.save'){
    const old=p.dossierId?getDossier(p.dossierId):null;
    if(old&&p.revision!==old.revision)throw Error('Dossier modifié entre-temps. Recherchez-le à nouveau.');
    const fields=['nom_client','prenom_client','prestation','surface','adresse_chantier','adresse_facturation','frequence','notes'];
    const dossier={...(old||{}),dossierId:old?.dossierId||'DOS-'+token,sessionId:old?.sessionId||req.sessionId,revision:(old?.revision||0)+1,updatedAt:now};
    const changes=p.fields;if(!changes||typeof changes!=='object'||Array.isArray(changes))throw Error('Champs de dossier requis.');
    for(const key of Object.keys(changes))if(!fields.includes(key))throw Error('Champ de dossier inconnu : '+key);
    for(const key of fields)dossier[key]=Object.hasOwn(changes,key)?clean(changes[key],key==='notes'?2000:1000):String(old?.[key]||'');
    dossier.clientName=[dossier.prenom_client,dossier.nom_client].filter(Boolean).join(' ');
    if(!dossier.clientName||!dossier.prestation)throw Error('Client identifiable et prestation requis ; les autres champs sont facultatifs.');
    if(!old&&dossiers.some(d=>norm(d.clientName)===norm(dossier.clientName)&&norm(d.prestation)===norm(dossier.prestation))&&!p.confirmNew)throw Error('Demande similaire existante. Recherchez le dossier ou confirmez une nouvelle demande distincte.');
    return write('dossier',dossier.dossierId,dossier,{dossier});
  }
  if(command==='quote.list')return out({quotes:(p.history?quotes:headQuotes()).map(decorate).reverse()});
  if(command==='quote.find') {const quote=decorate(getQuote());return out({quote});}
  if(command==='quote.create'||command==='quote.revise'){
    const old=command==='quote.revise'?getQuote():null;
    if(old&&(!decorate(old).current||decorate(old).conflict)){const heads=current(old);return {result:{ok:false,error:'Version ancienne ou ambiguë. Relire quote.find avec le quoteId sans suffixe de version avant correction.',quoteId:old.quoteId,currentQuote:heads.length===1?decorate(heads[0]):null},write:false,pdf:false};}
    const client=getDossier(old?.dossierId||p.dossierId);
    let lines;
    const makeLine=(l,index)=>{
      const c=one(catalog.filter(c=>c.id===l.catalogId&&!c.deleted&&c.active),'Désignation active');
      const quantity=num(l.quantity,0.001,1000000,3),price=c.price,vat=c.vat;
      const ht=Math.round(Math.round(quantity*1000)*Math.round(price*100)/1000),tax=Math.round(ht*Math.round(vat*100)/10000);
      if(ht>100000000000)throw Error('Montant de ligne trop élevé.');
      return {lineId:token+'-'+index,catalogId:c.id,catalogRevision:c.revision,label:c.label,description:c.description,unit:c.unit,quantity,price,vat,htCents:ht,vatCents:tax};
    };
    if(old){
      lines=old.lines.map(l=>({...l}));
      if(p.quantities){for(const change of p.quantities){const l=one(lines.filter(l=>l.lineId===change.lineId),'Ligne');l.quantity=num(change.quantity,0.001,1000000,3);l.htCents=Math.round(Math.round(l.quantity*1000)*Math.round(l.price*100)/1000);l.vatCents=Math.round(l.htCents*Math.round(l.vat*100)/10000);}}
      if(p.removeLineIds){if(!Array.isArray(p.removeLineIds))throw Error('Liste de lignes invalide.');for(const id of p.removeLineIds)one(lines.filter(l=>l.lineId===id),'Ligne');lines=lines.filter(l=>!p.removeLineIds.includes(l.lineId));}
      if(p.addLines){if(!Array.isArray(p.addLines))throw Error('Lignes invalides.');lines.push(...p.addLines.map(makeLine));}
    }else{if(!Array.isArray(p.lines))throw Error('Sélectionnez les désignations et quantités.');lines=p.lines.map(makeLine);}
    if(!lines.length||lines.length>50)throw Error('Le devis doit comporter entre 1 et 50 lignes chiffrées.');
    const htCents=lines.reduce((s,l)=>s+l.htCents,0),vatCents=lines.reduce((s,l)=>s+l.vatCents,0);
    const quoteId=old?.quoteId||'DEV-'+now.slice(0,10).replace(/-/g,'')+'-'+token.replace(/-/g,'').slice(0,12).toUpperCase();
    const version=(old?.version||0)+1;
    const quote={presentation:JSON.parse(JSON.stringify(settings)),quoteId,numero:quoteId+'-V'+version,token,version,parentToken:old?.token||null,dossierId:client.dossierId,clientName:client.clientName,client:{...client},sessionId:req.sessionId,createdAt:now,lines,htCents,vatCents,ttcCents:htCents+vatCents,status:'brouillon',reason:clean(p.reason||'Création',500)};
    return write('quote',quoteId,quote,{quote:{...quote,current:true,conflict:false,stale:false}},true);
  }
  throw Error('Commande inconnue.');
}
module.exports={normalize,service};
