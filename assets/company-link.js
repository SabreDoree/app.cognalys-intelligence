'use strict';
const CompanyLink = (() => {
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 let current=null;
 const dialog=()=>document.querySelector('#company-link-dialog');
 const allowed=state=>CognalysAuth.state.access?.isAdmin&&CognalysAuth.state.user?.uid===state.actor;
 function close(){if(current?.busy)return;current=null;dialog()?.close();}
 function draw(focus){
  const state=current;if(!state)return;
  const m=state.member,linked=!!m.scope;
  const name=state.companies.find(c=>c.scope===m.scope)?.company||m.company||'Entreprise sans nom';
  const unchanged=state.scope===m.scope&&m.active;
  const saveText=m.active?'Confirmer le rattachement':m.status==='pending'?'Approuver et rattacher':'Réactiver et rattacher';
  dialog().querySelector('[data-company-content]').innerHTML=`<p class="company-person">${esc(m.email||m.uid)}</p>
   <div class="company-current"><span>Entreprise actuelle :</span><strong class="${linked?'':'company-none'}">${linked?esc(name):'Aucune'}</strong></div>
   ${state.error?`<p class="error" role="alert">${esc(state.error)}</p>`:''}
   ${state.editing?`<form id="company-link-form"><label for="company-link-choice">Choisir une entreprise</label><select id="company-link-choice" name="scope" required ${state.busy?'disabled':''}><option value="">Sélectionner une entreprise</option>${state.companies.map(c=>`<option value="${esc(c.scope)}" ${c.scope===state.scope?'selected':''}>${esc(c.company)}${c.scope===m.scope?' · actuelle':''}</option>`).join('')}</select>
    ${state.companies.length?'<p class="company-help">Ce compte partagera les paramètres, les désignations, les dossiers et les devis de cette entreprise.</p>':'<p class="company-help">Ajoutez une entreprise dans l’administration, puis revenez ici.</p>'}
    ${linked&&state.scope&&state.scope!==m.scope?'<p class="company-help">Les documents de l’ancienne entreprise y restent conservés. Ils ne sont pas transférés.</p>':''}
    ${!m.active?'<p class="company-help">La confirmation activera aussi l’accès de ce compte.</p>':''}
    <div class="company-dialog-actions"><button type="button" class="secondary" data-company-cancel ${state.busy?'disabled':''}>Annuler</button><button class="primary" ${state.busy||!state.scope||unchanged?'disabled':''}>${state.busy?'Enregistrement…':saveText}</button></div></form>`:
    '<div class="company-dialog-actions"><button type="button" class="secondary" data-company-close>Fermer</button><button type="button" class="primary" data-company-edit autofocus>Modifier</button></div>'}`;
  if(focus)dialog().querySelector(focus)?.focus();
 }
 function open({member,companies,sessionId,onSaved}){
  if(!CognalysAuth.state.access?.isAdmin||current?.busy)return;
  current={member:{...member},companies:companies.map(c=>({...c})),scope:member.scope||'',editing:false,error:'',busy:false,sessionId,onSaved,actor:CognalysAuth.state.user?.uid};
  draw();dialog().showModal();
 }
 document.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button||!dialog()?.contains(button)||!current||current.busy)return;
  if(button.hasAttribute('data-company-close'))close();
  else if(button.hasAttribute('data-company-edit')){current.editing=true;draw('#company-link-choice');}
  else if(button.hasAttribute('data-company-cancel')){current.editing=false;current.scope=current.member.scope||'';current.error='';draw('[data-company-edit]');}
 });
 document.addEventListener('change',e=>{
  if(e.target.id!=='company-link-choice'||!current||current.busy)return;
  current.scope=e.target.value;current.error='';draw('#company-link-choice');
 });
 document.addEventListener('submit',async e=>{
  if(e.target.id!=='company-link-form')return;e.preventDefault();
  const state=current;if(!state||state.busy||!allowed(state))return;
  if(!state.companies.some(c=>c.scope===state.scope)||(state.member.active&&state.scope===state.member.scope))return;
  state.busy=true;state.error='';draw();
  try{
   const m=state.member,action=m.active?'link':m.status==='pending'?'approve':'reactivate';
   await QuoteAPI.call(state.sessionId,'admin.'+action,{uid:m.uid,updatedAt:m.updatedAt,scope:state.scope});
   if(current!==state||!allowed(state))return;
   state.busy=false;close();await state.onSaved();
  }catch(err){if(current===state&&allowed(state)){state.busy=false;state.error=err.message;draw('#company-link-choice');}}
 });
 dialog()?.addEventListener('cancel',e=>{if(current?.busy)e.preventDefault();else current=null;});
 dialog()?.addEventListener('close',()=>{current=null;});
 window.addEventListener('hashchange',()=>{current=null;dialog()?.close();});
 CognalysAuth.subscribe(()=>{if(current&&!allowed(current)){current=null;dialog()?.close();}});
 return {open};
})();
