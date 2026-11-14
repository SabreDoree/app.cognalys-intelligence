'use strict';
(()=>{
 const main=document.querySelector('main');let page,capture,toastClock;
 const fresh=sessionId=>({sessionId,fields:{},messages:[],draft:'',pending:false,error:'',audio:'idle',transcribed:false,dossiers:[],catalog:[],quotes:[],dossierDraft:{},catalogDraft:{},quoteDraft:{lines:[{catalogId:'',quantity:''}]},busy:false,loading:false,notice:'',history:false,selectedVersions:{},members:[],presentationDraft:{}});
  const sessionKey = 'cognalys.conversation';
  const sessionUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let useHistoryFallback = false;

  function syncHistorySession(id) {
    const state = {...history.state};
    if (useHistoryFallback) state[sessionKey] = id;
    else if (sessionKey in state) delete state[sessionKey];
    else return;
    try { history.replaceState(state, ''); }
    catch { /* The current conversation can still continue in memory. */ }
  }

  function startSession(renew = false) {
    // An entry carries a fallback only if sessionStorage previously rejected a write.
    const fallback = history.state?.[sessionKey];
    let id;
    if (!renew) {
      if (sessionUuid.test(fallback)) id = fallback;
      else {
        try { id = sessionStorage.getItem(sessionKey); }
        catch { /* Storage may be disabled for this origin. */ }
      }
    }
    if (!sessionUuid.test(id)) id = crypto.randomUUID();
    try {
      sessionStorage.setItem(sessionKey, id);
      useHistoryFallback = false;
    } catch {
      useHistoryFallback = true;
    }
    syncHistorySession(id);
    return id;
  }


 let s=fresh(startSession());
 function go(hash){location.hash=hash;}
 function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('visible');clearTimeout(toastClock);toastClock=setTimeout(()=>el.classList.remove('visible'),4000);}
 function render(focus=false){
  const account=CognalysAuth.state;const adminNav=document.querySelector('#admin-nav');if(adminNav){adminNav.hidden=!account.access?.isAdmin;adminNav.style.display=account.access?.isAdmin?'':'none';}
  // Presentation state for the responsive navigation; routes and permissions stay unchanged.
  const route=location.hash.slice(1)||'accueil';
  const navRoute=({dossiers:'formulaire',verification:'formulaire',devis:'devis-pdf',espace:'parametres'})[route]||route;
  document.querySelectorAll('.top nav a').forEach(link=>{
   if(link.hash==='#'+navRoute)link.setAttribute('aria-current','page');
   else link.removeAttribute('aria-current');
  });
  if(!account.ready||!account.user||!account.access?.authorized){main.innerHTML=Views.login(account,s);document.title='Connexion · Cognalys Intelligence';return;}
  const hash=location.hash.slice(1)||'accueil';page=hash==='verification'?'formulaire':hash;
  if(page!=='conversation')cancelCapture();
  const views={accueil:Views.home,conversation:Views.conversation,formulaire:Views.dossiers,dossiers:Views.dossiers,parametres:Views.settings,devis:Views.composer,'devis-pdf':x=>'<h1>Devis PDF</h1>'+Views.status(x)+'<section class="box">'+Views.pdfPanel(x)+'</section>',espace:Views.settings,administration:Views.administration};
  main.innerHTML=(views[page]||Views.home)(s);
  if(page==='conversation')main.insertAdjacentHTML('beforeend','<button class="reset" data-act="new-chat" '+(s.pending?'disabled':'')+'>Nouvelle conversation</button><section class="box">'+Views.pdfPanel(s)+'</section>');
  document.title=(main.querySelector('h1')?.textContent||'Cognalys')+' · Cognalys Intelligence';if(focus){window.scrollTo(0,0);main.focus({preventScroll:true});}
 }
 async function reloadAdmin(){if(!CognalysAuth.state.access?.isAdmin)return;const state=s;try{const r=await QuoteAPI.call(state.sessionId,'admin.list');if(s===state){state.members=r.members||[];state.companies=r.companies||[];render();}}catch(e){if(s===state){state.error=e.message;render();}}}
 async function reload(){
  if(!CognalysAuth.state.access?.authorized)return;
  const chat=s;chat.loading=true;render();
  try{const [d,c,q,p]=await Promise.all([QuoteAPI.call(chat.sessionId,'dossier.list'),QuoteAPI.call(chat.sessionId,'catalog.list'),QuoteAPI.call(chat.sessionId,'quote.list',{history:true}),QuoteAPI.call(chat.sessionId,'settings.get')]);if(s!==chat)return;chat.dossiers=d.dossiers;chat.catalog=c.items;chat.quotes=q.quotes;chat.presentationDraft={...p.settings};}
  catch(e){if(s===chat)chat.error='Lecture du serveur impossible : '+e.message;}
  finally{if(s===chat){chat.loading=false;render();}}
 }
 async function operation(job){if(s.busy||s.pending)return;const state=s;state.busy=true;state.error=state.notice='';render();try{await job();}catch(e){state.error=e.message;}finally{state.busy=false;if(s===state)render();}}
 async function sendMessage(text,clip){
  const chat=s;if(chat.pending||chat.busy)return;chat.messages.push({user:true,text:clip?'':text,audioUrl:clip?.url});chat.pending=true;chat.error=chat.draft='';render();
  try{const data=await QuoteAPI.request('chat',{sessionId:chat.sessionId,chatInput:text});if(typeof data.output!=='string'||!data.output.trim())throw Error('Réponse vide.');chat.messages.push({text:data.output});if(clip)chat.clip=null;if(s===chat){await reload();if(data.document?.token){const exact=chat.quotes.find(q=>q.token===data.document.token);if(exact)await QuotePDF.action(chat.sessionId,exact,/\btélécharge/i.test(text)?'download':'preview');}}}
  catch(e){chat.error='Action non confirmée : '+e.message+' Actualisez les données avant de réessayer.';chat.draft=text;}
  finally{chat.pending=false;if(s===chat){render();main.querySelector('#answer')?.focus();}}
 }
  async function transcribe(clip) {
    const chat = s;
    if (!clip || chat.audio === 'transcribing') return;
    let messageToSend = '';
    clip.draftBefore ??= chat.draft.trim();
    chat.audio = 'transcribing';
    chat.transcribed = false;
    chat.error = '';
    render(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const body = new FormData();
      body.append('audio', clip.blob, clip.name);
      body.append('sessionId', chat.sessionId);
      body.append('idToken', await CognalysAuth.token());
      const response = await fetch('https://n8n.cognalys-intelligence.fr/webhook/cognalys/v2/audio', {
        method: 'POST', body, signal: controller.signal, credentials: 'omit',
        redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer'
      });
      const item = await response.json();
      if (!response.ok || item?.ok !== true) throw new Error(item?.error || 'Service de transcription indisponible (HTTP ' + response.status + ').');
      if (item.sessionId !== chat.sessionId) throw new Error('La transcription ne correspond pas à cette conversation.');
      const transcript = item.transcription;
      if (typeof transcript !== 'string' || !transcript.trim()) throw new Error('Transcription vide');
      if (s === chat && chat.clip === clip) {
        chat.draft = [clip.draftBefore, transcript.trim()].filter(Boolean).join(' ');
        chat.transcribed = true;
        messageToSend = chat.draft;
      }
    } catch (error) {
      if (s === chat && chat.clip === clip) chat.error = 'Transcription indisponible. Réessayez ou écrivez votre message. ' +
        (error.name === 'AbortError' ? 'Délai de transcription dépassé.' : error.message);
    } finally {
      clearTimeout(timeout);
      if (s === chat && chat.clip === clip) {
        chat.audio = 'idle';
        if (page === 'conversation' && !messageToSend) render(false);
      }
    }
    if (messageToSend && s === chat && chat.clip === clip) sendMessage(messageToSend, clip);
  }
  function cancelCapture() {
    if (!capture) return;
    const old = capture;
    capture = null;
    clearInterval(old.clock);
    old.speech?.abort();
    if (old.recorder?.state === 'recording') old.recorder.stop();
    old.stream?.getTracks().forEach(track => track.stop());
    s.audio = 'idle';
  }
  function stopRecording() {
    if (capture?.recorder?.state !== 'recording') return;
    s.audio = 'stopping';
    capture.speech?.stop();
    capture.recorder.stop();
    render(false);
  }
  async function record() {
    if (capture || s.pending) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      s.error = 'Enregistrement indisponible dans ce navigateur. Utilisez la dictée du clavier ou écrivez votre message.';
      return render(false);
    }
    const job = {parts:[]};
    capture = job;
    s.audio = 'permission';
    s.error = '';
    render(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      if (capture !== job) { stream.getTracks().forEach(t => t.stop()); return; }
      job.stream = stream;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']
        .find(type => MediaRecorder.isTypeSupported?.(type));
      const recorder = job.recorder = new MediaRecorder(stream, mimeType ? {mimeType} : undefined);
      recorder.ondataavailable = event => { if(event.data.size) job.parts.push(event.data); };
      recorder.onerror = () => {
        if (capture !== job) return;
        cancelCapture();
        s.error = 'Enregistrement interrompu. Réessayez.';
        render(false);
      };
      recorder.onstop = () => {
        if (capture !== job) return;
        const type = recorder.mimeType || job.parts[0]?.type || 'audio/webm';
        const blob = new Blob(job.parts,{type});
        cancelCapture();
        if (blob.size) {
          const ext = type.includes('mp4')?'m4a':type.includes('ogg')?'ogg':'webm';
          s.clip = {blob, name:'note-vocale.'+ext, url:URL.createObjectURL(blob)};
          transcribe(s.clip);
        } else s.error = 'Aucun son enregistré. Réessayez.';
        if (!blob.size) render(false);
      };
      recorder.start();
      s.audio = 'recording';
      render(false);
      const start = Date.now();
      job.clock = setInterval(() => {
        const sec = Math.floor((Date.now()-start)/1000);
        const timer = document.querySelector('#timer');
        if(timer) timer.textContent = [Math.floor(sec/60),sec%60].map(v=>String(v).padStart(2,'0')).join(':');
        if(sec>=180) stopRecording();
      },250);
    } catch(error) {
      if(capture !== job) return;
      cancelCapture();
      s.error = error.name === 'NotAllowedError' ? 'Autorisez le microphone dans les réglages du site pour enregistrer.' : 'Microphone indisponible. Vérifiez son accès puis réessayez.';
      render(false);
    }
  }

 function newConversation(){cancelCapture();for(const url of new Set([s.clip?.url,...s.messages.map(m=>m.audioUrl)]))if(url)URL.revokeObjectURL(url);QuotePDF.closePreview();s=fresh(startSession(true));render();reload();}
 window.addEventListener('pagehide',cancelCapture);
 function captureFields(){const pf=main.querySelector('#presentation-form');if(pf)Object.assign(s.presentationDraft,Object.fromEntries(new FormData(pf)));const f=main.querySelector('#dossier-form');if(f)Object.assign(s.dossierDraft,Object.fromEntries(new FormData(f)));const c=main.querySelector('#catalog-form');if(c){Object.assign(s.catalogDraft,Object.fromEntries(new FormData(c)));s.catalogDraft.active=c.elements.active.checked;}const q=main.querySelector('#quote-form');if(q){if(q.elements.dossierId)s.quoteDraft.dossierId=q.elements.dossierId.value;s.quoteDraft.reason=q.elements.reason.value;if(s.quoteDraft.client)for(const k of Object.keys(s.quoteDraft.client)){const el=q.elements['client-'+k];if(el)s.quoteDraft.client[k]=el.value;}for(const [i,l] of s.quoteDraft.lines.entries()){if(!l.lineId)l.catalogId=q.elements['catalog-'+i].value;l.quantity=q.elements['quantity-'+i].value;if(l.lineId)for(const k of ['label','description','unit','price','vat'])l[k]=q.elements[k+'-'+i].value;}}}
 document.addEventListener('input',e=>{if(e.target.id==='answer')s.draft=e.target.value;else captureFields();});
 document.addEventListener('change',async e=>{if(e.target.dataset.quoteVersion){s.selectedVersions[e.target.dataset.quoteVersion]=e.target.value;render();return;}if(e.target.id==='company-logo'){const state=s;const file=e.target.files[0];if(!file)return;captureFields();try{if(!['image/png','image/jpeg'].includes(file.type)||file.size>256000)throw Error('Choisissez un logo PNG ou JPEG de 250 Ko maximum.');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Lecture du logo impossible.'));reader.readAsDataURL(file);});if(s!==state)return;state.presentationDraft.logo=data;state.error='';}catch(err){if(s!==state)return;state.error=err.message;}render();return;}if(e.target.id==='history-toggle'){s.history=e.target.checked;render();}else captureFields();});
 document.addEventListener('click',e=>{
  if(e.target.closest('.skip')){e.preventDefault();main.focus();return;}
  const el=e.target.closest('button');if(!el||s.busy)return;
  if(el.dataset.companyLink){if(!CognalysAuth.state.access?.isAdmin)return;const m=s.members.find(m=>m.uid===el.dataset.companyLink);if(!m)return;const state=s;CompanyLink.open({member:m,companies:s.companies||[],sessionId:s.sessionId,onSaved:async()=>{if(s!==state)return;state.notice='Entreprise rattachée avec succès.';await reloadAdmin();main.querySelector('[data-company-link="'+CSS.escape(m.uid)+'"]')?.focus();}});return;}
  if(el.dataset.adminAction){if(!CognalysAuth.state.access?.isAdmin)return;const m=s.members.find(m=>m.uid===el.dataset.uid);if(!m)return;operation(async()=>{await QuoteAPI.call(s.sessionId,'admin.'+el.dataset.adminAction,{uid:m.uid,updatedAt:m.updatedAt});s.notice='Modification d’accès confirmée par le serveur.';await reloadAdmin();});return;}
  if(el.dataset.pdf){const q=s.quotes.find(q=>q.token===el.dataset.token);if(q)operation(()=>QuotePDF.action(s.sessionId,q,el.dataset.pdf));return;}
  if(el.dataset.editDossier){s.dossierDraft={...s.dossiers.find(d=>d.dossierId===el.dataset.editDossier)};render();return;}
  if(el.dataset.editCatalog){s.catalogDraft={...s.catalog.find(c=>c.id===el.dataset.editCatalog)};render();return;}
  if(el.dataset.deleteCatalog){const c=s.catalog.find(c=>c.id===el.dataset.deleteCatalog);operation(async()=>{await QuoteAPI.call(s.sessionId,'catalog.delete',{id:c.id,revision:c.revision});s.notice='Suppression confirmée par le serveur.';if(s.catalogDraft.id===c.id)s.catalogDraft={};await reload();});return;}
  if(el.dataset.compose){s.quoteDraft={dossierId:el.dataset.compose,lines:[{catalogId:'',quantity:''}]};go('devis');return;}
  if(el.dataset.revise){const q=s.quotes.find(q=>q.token===el.dataset.revise);s.quoteDraft={token:q.token,client:Object.fromEntries(['prenom_client','nom_client','email_client','telephone_client','prestation','surface','frequence','adresse_chantier','adresse_facturation','notes'].map(k=>[k,q.client[k]||''])),lines:q.lines.map(l=>({...l})),reason:''};go('devis');return;}
  if(el.dataset.removeLine!==undefined){captureFields();s.quoteDraft.lines.splice(Number(el.dataset.removeLine),1);render();return;}
  switch(el.dataset.act){
   case 'remove-logo':captureFields();s.presentationDraft.logo='';render();break;
   case 'logout':CognalysAuth.logout().catch(e=>{s.error=e.message;render();});break;
   case 'check-access':CognalysAuth.check();break;
   case 'auth-mode':s.signup=!s.signup;s.error='';render();break;
   case 'reload-admin':reloadAdmin();break;
   case 'reload':s.error='';reload();break;
   case 'new-dossier':s.dossierDraft={};render();break;
   case 'new-catalog':s.catalogDraft={};render();break;
   case 'add-line':captureFields();s.quoteDraft.lines.push({catalogId:'',quantity:''});render();break;
   case 'new-chat':if(!s.pending)newConversation();break;
   case 'record':record();break;case 'stop':stopRecording();break;
   case 'transcribe':transcribe(s.clip);break;
   case 'discard':URL.revokeObjectURL(s.clip.url);s.clip=null;s.transcribed=false;s.error='';render();break;
  }
 });
 document.addEventListener('submit',e=>{
  e.preventDefault();const f=e.target;if(s.busy||s.pending)return;
  if(f.id==='auth-form'){const email=f.elements.email.value.trim(),password=f.elements.password.value;s.busy=true;s.error='';render();CognalysAuth.login(email,password,s.signup).catch(e=>{s.error=e.message;}).finally(()=>{s.busy=false;render();});return;}
  if(!CognalysAuth.state.access?.authorized)return;
  if(f.id==='chat-form'){const text=f.elements.answer.value.trim();if(text)sendMessage(text,s.clip);return;}
  captureFields();
  if(f.id==='company-form'){const company=f.elements['new-company'].value.trim();operation(async()=>{await QuoteAPI.call(s.sessionId,'admin.company_create',{company});s.notice='Entreprise créée. Vous pouvez maintenant y rattacher des comptes.';await reloadAdmin();});}
  if(f.id==='presentation-form')operation(async()=>{const result=await QuoteAPI.call(s.sessionId,'settings.save',s.presentationDraft);s.presentationDraft={...result.settings};s.notice='Présentation enregistrée par le serveur.';});
  if(f.id==='dossier-form')operation(async()=>{const d=s.dossierDraft;const fields=Object.fromEntries(['nom_client','prenom_client','prestation','surface','adresse_chantier','adresse_facturation','frequence','notes'].map(k=>[k,d[k]||'']));const result=await QuoteAPI.call(s.sessionId,'dossier.save',{dossierId:d.dossierId,revision:d.revision,fields});s.dossierDraft=result.dossier;s.notice='Dossier enregistré par le serveur.';await reload();});
  if(f.id==='catalog-form')operation(async()=>{const c=s.catalogDraft;const result=await QuoteAPI.call(s.sessionId,'catalog.save',{...c,price:Number(c.price),vat:Number(c.vat)});s.catalogDraft=result.item;s.notice='Désignation enregistrée par le serveur.';await reload();});
  if(f.id==='quote-form')operation(async()=>{const d=s.quoteDraft,old=s.quotes.find(q=>q.token===d.token);const params=old?{token:old.token,clientFields:d.client,lineChanges:d.lines.filter(l=>l.lineId).map(l=>({lineId:l.lineId,label:l.label,description:l.description,unit:l.unit,price:Number(l.price),vat:Number(l.vat)})),quantities:d.lines.filter(l=>l.lineId).map(l=>({lineId:l.lineId,quantity:Number(l.quantity)})),removeLineIds:old.lines.filter(l=>!d.lines.some(x=>x.lineId===l.lineId)).map(l=>l.lineId),addLines:d.lines.filter(l=>!l.lineId).map(l=>({catalogId:l.catalogId,quantity:Number(l.quantity)})),reason:d.reason||'Correction demandée'}:{dossierId:d.dossierId,lines:d.lines.map(l=>({catalogId:l.catalogId,quantity:Number(l.quantity)})),reason:d.reason||'Création'};
   const result=await QuoteAPI.call(s.sessionId,old?'quote.revise':'quote.create',params);s.notice='PDF confirmé : '+result.quote.numero;s.quoteDraft={lines:[{catalogId:'',quantity:''}]};await reload();go('devis-pdf');await QuotePDF.action(s.sessionId,result.quote,'preview');});
 });
 window.addEventListener('hashchange',()=>{syncHistorySession(s.sessionId);s.notice='';QuotePDF.closePreview();render(true);if(page==='administration')reloadAdmin();});
 let signedIdentity='';
 let knownUser;try{knownUser=sessionStorage.getItem('cognalys.account.uid');}catch{}
 CognalysAuth.subscribe(()=>{
  const a=CognalysAuth.state;const current=a.user?.uid+'|'+(a.access?.authorized?a.access.scope:'');
  if(current!==signedIdentity){cancelCapture();QuotePDF.closePreview();for(const m of s.messages)if(m.audioUrl)URL.revokeObjectURL(m.audioUrl);if(s.clip)URL.revokeObjectURL(s.clip.url);const uid=a.user?.uid||'';s=fresh(startSession(knownUser!==uid));knownUser=uid;try{sessionStorage.setItem('cognalys.account.uid',uid);}catch{}signedIdentity=current;render();if(a.access?.authorized){reload();if(location.hash==='#administration')reloadAdmin();}}else render();
 });
 render();
})();




