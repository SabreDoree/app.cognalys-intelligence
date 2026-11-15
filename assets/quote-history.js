'use strict';
const QuoteHistory=(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 const date=v=>v&&Number.isFinite(new Date(v).getTime())?new Date(v).toLocaleString('fr-FR'):'Date non renseignée';
 const source=q=>({'chat':'Chat de l’application','app':'Application','formulaire':'Formulaire','formulaire-clair-soin':'Formulaire Clair & Soin'})[q._audit?.source||q.source]||(q.documentType==='estimate'?'Formulaire':'Canal non renseigné');
 const actions={'quote.create':'Devis créé','quote.revise':'Nouvelle version créée','quote.sent':'Envoi accepté par SMTP','quote.send_requested':'Envoi demandé','quote.send_unknown':'Résultat de l’envoi à vérifier','quote.confirmation_sent':'Confirmation adressée à l’expéditeur','quote.confirmation_unknown':'Confirmation à vérifier'};
 let generation=0;
 async function open({quote,sessionId}){
  const id=++generation,dialog=document.querySelector('#quote-history-dialog');
  dialog.innerHTML='<h2>Historique du devis</h2><p>'+esc(quote.numero)+'</p><section class="company-current"><strong>Informations conservées</strong><p>Création de cette version : '+esc(date(quote.createdAt))+'</p><p>Origine : '+esc(source(quote))+'</p><p>Statut : '+esc(quote.status==='brouillon'||!quote.status?'Brouillon':quote.status)+'</p><p>Auteur : '+esc(quote._audit?.actorEmail||quote._audit?.actorUid||'Non enregistré pour ce document')+'</p></section><div data-history-events role="status">Chargement des actions…</div><div class="actions"><button class="secondary" type="button" data-history-close>Fermer</button></div>';
  dialog.showModal();
  try{const r=await QuoteAPI.call(sessionId,'audit.list',{entity:quote.quoteId});if(id!==generation||!dialog.open)return;dialog.querySelector('[data-history-events]').innerHTML=(r.events||[]).map(e=>'<article class="pdf-card"><strong>'+esc(actions[e.action]||'Action sur le devis')+'</strong><p>'+esc(date(e.createdAt))+' · '+esc(e.actorEmail||e.actorUid||'Formulaire / système')+'</p><small>'+esc(e.source)+' · version '+esc(e.version||'—')+'</small></article>').join('')||'<p>Les informations ci-dessus sont disponibles. Aucune action détaillée supplémentaire n’a été enregistrée pour ce devis.</p>';}
  catch(err){if(id===generation&&dialog.open)dialog.querySelector('[data-history-events]').textContent='Les informations du document restent affichées. Chargement des actions impossible : '+err.message;}
 }
 document.addEventListener('click',e=>{if(e.target.closest('[data-history-close]')){generation++;document.querySelector('#quote-history-dialog').close();}});
 window.addEventListener('hashchange',()=>{generation++;document.querySelector('#quote-history-dialog')?.close();});
 CognalysAuth.subscribe(()=>{generation++;document.querySelector('#quote-history-dialog')?.close();});
 return {open,source};
})();
