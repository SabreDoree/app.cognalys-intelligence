'use strict';
const SendQuote=(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 let state;const d=()=>document.querySelector('#send-quote-dialog');
 function open({quote,sessionId}){if((CognalysAuth.state.access?.role||'manager')==='viewer')return;state={quote,sessionId,requestId:crypto.randomUUID(),uid:CognalysAuth.state.user?.uid};
 d().innerHTML='<h2>Envoyer le devis</h2><p>'+esc(quote.numero)+' · PDF joint</p><p>Expéditeur : cognalysintelligence@gmail.com</p><p>Une confirmation sera adressée à '+esc(CognalysAuth.state.user?.email||'votre adresse de connexion')+'.</p><form id="send-quote-form"><label>Destinataire<input name="to" type="email" required value="'+esc(quote.client.email_client||'')+'"></label><label>Objet<input name="subject" required maxlength="200" value="'+esc('Votre devis '+quote.numero)+'"></label><label>Message<textarea name="message" required maxlength="8000" rows="5">'+esc('Bonjour,\n\nVeuillez trouver votre devis en pièce jointe.\n\n'+(quote.presentation?.companyName||''))+'</textarea></label><p data-send-feedback role="status"></p><div class="actions"><button type="button" class="secondary" data-send-preview>Prévisualiser le PDF</button><button type="button" class="secondary" data-send-close>Fermer</button><button class="primary">Confirmer et envoyer</button></div></form>';d().showModal();}
 document.addEventListener('click',async e=>{if(e.target.closest('[data-send-close]')&&!state?.busy)d().close();if(e.target.closest('[data-send-preview]')&&state&&!state.busy)await QuotePDF.action(state.sessionId,state.quote,'preview');});
 document.addEventListener('submit',async e=>{if(e.target.id!=='send-quote-form')return;e.preventDefault();const s=state;if(!s||s.busy||s.uid!==CognalysAuth.state.user?.uid)return;
 const params=Object.fromEntries(new FormData(e.target));if(!s.params)s.params={...params,token:s.quote.token,confirm:true};else if(JSON.stringify(params)!==JSON.stringify({to:s.params.to,subject:s.params.subject,message:s.params.message})){d().querySelector('[data-send-feedback]').textContent='Fermez puis rouvrez la fenêtre pour préparer un nouvel envoi.';return;}
 s.busy=true;d().querySelectorAll('button,input,textarea').forEach(el=>el.disabled=true);
 try{const r=await QuoteAPI.call(s.sessionId,'quote.send',s.params,s.requestId);if(state!==s)return;d().querySelector('[data-send-feedback]').textContent=r.delivery==='accepted'?(r.confirmation==='accepted'?'Devis envoyé au client et mail de confirmation adressé à votre compte.':'Devis envoyé au client. Le mail de confirmation n’a pas été confirmé : consultez l’historique.'):'Résultat incertain ou envoi en cours. Consultez l’historique avant toute nouvelle tentative.';}
 catch(err){if(state===s)d().querySelector('[data-send-feedback]').textContent=err.message;}
 finally{if(state===s){s.busy=false;d().querySelector('[data-send-close]').disabled=false;}}
 });
 d()?.addEventListener('cancel',e=>{if(state?.busy)e.preventDefault();});
 window.addEventListener('hashchange',()=>{d()?.close();state=null;});
 CognalysAuth.subscribe(()=>{if(state&&state.uid!==CognalysAuth.state.user?.uid){state=null;d()?.close();}});
 return {open};
})();
