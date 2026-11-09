'use strict';
const Views = (() => {
  const icon = Icons.svg;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[c]);
  const back = (to, label) => `<a class="back" href="#${to}">${icon('back',16)}${label}</a>`;
  function wave() {
    const bars=[8,13,20,11,25,38,26,17,36,48,61,37,22,40,68,88,72,46,30,49,79,100,70,43,58,83,60,39,24,46,65,44,24,36,52,30,17,24,35,20,12,18,10,6];
    return `<span class="wave" aria-hidden="true">${bars.map((v,i)=>`<i style="--h:${v}%;--d:-${i%7}00ms"></i>`).join('')}</span>`;
  }
  function home() {
    return `<div class="intro"><h1>Créer un devis</h1><p>Comment souhaitez-vous saisir les détails de l’intervention&nbsp;?</p></div>
      <a class="voice-option" href="#conversation"><div class="signal" aria-hidden="true">${wave()}</div><div class="option-copy"><span class="big-icon">${icon('mic',27)}</span><h2>Audio ou chat</h2><p>Dictez le résumé de l’appel ou écrivez vos réponses.</p><span class="start">Commencer ${icon('right',16)}</span></div></a>
      <a class="form-option" href="#formulaire"><span class="form-icon">${icon('form',25)}</span><span><strong>Formulaire rapide</strong><small>Renseignez directement les informations du devis.</small></span>${icon('right',20)}</a>`;
  }
  function conversation(s) {
    const history = s.messages.map(m => `<p class="${m.user ? 'reply' : 'ask'}">${esc(m.text)}</p>`).join('');
    const busy = s.pending || ['permission','recording','stopping'].includes(s.audio);
    const recording = s.audio === 'recording';
    return back('accueil','Modes de création')+`<h1>Audio ou chat</h1><p class="lead">Dictez les détails de l’appel ou écrivez votre message.</p>
      <section class="box chat"><div class="chat-title"><img src="./assets/symbole.svg" alt="">Assistant devis</div>
      <div class="thread">${history || '<p class="ask">Décrivez votre demande de devis.</p>'}${s.pending ? '<p role="status">Réponse en cours…</p>' : ''}${s.error ? `<p role="alert">${esc(s.error)}</p>` : ''}</div>
      <div class="audio">${s.clip ? `<div><strong>Votre note vocale</strong><audio controls src="${s.clip.url}" style="display:block;max-width:100%"></audio></div><button class="secondary" data-act="discard" ${busy?'disabled':''}>Supprimer la note</button>` :
        `<button type="button" class="secondary" data-act="${recording?'stop':'record'}" ${busy&&!recording?'disabled':''}>${icon(recording?'stop':'mic',17)}${recording?'Arrêter':s.audio==='permission'?'Autorisation du micro…':s.audio==='stopping'?'Préparation…':'Enregistrer une note vocale'}</button>${recording?`<div class="recording">${wave()}<span id="timer">00:00</span></div>`:''}`}</div>
      ${s.clip && !s.draft ? '<p>Aucune transcription disponible. Dictez avec le clavier ou ajoutez le texte pour que le chatbot comprenne la note.</p>' : ''}<form id="chat-form"><label for="answer">${s.clip?'Transcription ou précisions':'Votre réponse'}</label><div class="composer"><input id="answer" name="answer" placeholder="${s.clip?'Ajoutez ou corrigez le texte…':'Écrivez votre réponse…'}" required value="${esc(s.draft)}" ${busy?'disabled':''}><button class="primary" ${busy?'disabled':''} aria-label="${s.clip?'Envoyer la note vocale':'Envoyer la réponse'}">${icon('send',19)}</button></div></form>
      ${s.review && !busy ? '<a class="back" href="#verification">Passer au brouillon →</a>' : ''}</section>`;
  }
  function field(r,key,label,type='text',options) {
    const value=r[key]||'';
    const attrs=`id="f-${key}" name="${key}" ${key==='name'?'required':''}`;
    let control;
    if(options) {
      const choices=value&&!options.includes(value)?[value,...options]:options;
      control=`<select ${attrs}><option value="">Choisir…</option>${choices.map(x=>`<option ${x===value?'selected':''}>${esc(x)}</option>`).join('')}</select>`;
    } else if(type==='textarea') control=`<textarea ${attrs} rows="3">${esc(value)}</textarea>`;
    else control=`<input ${attrs} type="${type}" value="${esc(value)}" ${type==='number'?'min="0.01" step="0.01" inputmode="decimal"':''}>`;
    return `<div class="field ${type==='textarea'?'wide':''}"><label for="f-${key}">${label}${key==='name'?' *':''}</label>${control}</div>`;
  }
  function form(r,review) {
    return back(review?'conversation':'accueil',review?'Audio ou chat':'Modes de création')+`<h1>${review?'Vérifier les informations':'Formulaire rapide'}</h1><p class="lead">${review?'Complétez les détails de l’appel avant de préparer le devis.':'Saisissez les détails de l’appel pour préparer le brouillon.'}</p>
      <form id="details" class="box"><fieldset><legend>Client</legend><div class="fields">${field(r,'name','Nom du client')}${field(r,'company','Société')}${field(r,'phone','Téléphone','tel')}${field(r,'email','Email','email')}</div></fieldset>
      <fieldset><legend>Intervention</legend><div class="fields">${field(r,'service','Type de prestation','text',QuoteData.services)}${field(r,'area','Surface estimée (m²)','number')}${field(r,'frequency','Fréquence','text',QuoteData.frequencies)}${field(r,'desired','Date souhaitée','date')}${field(r,'street','Adresse')}${field(r,'city','Ville')}${field(r,'notes','Détails complémentaires','textarea')}${field(r,'amount','Montant estimé par intervention (€)','number')}</div></fieldset>
      <div class="actions"><small>* Champ obligatoire</small><button class="primary">${icon('file',17)}Préparer le devis</button></div></form>`;
  }
  function quote(r,review,stage) {
    const entry=(key,value)=>`<div><dt>${key}</dt><dd>${esc(value||'À préciser')}</dd></div>`;
    const date=r.desired ? new Intl.DateTimeFormat('fr-FR',{dateStyle:'long'}).format(new Date(r.desired+'T12:00:00')) : '';
    const amount=r.amount ? new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(r.amount)):'À chiffrer';
    const origin=review?'verification':'formulaire';
    return back(origin,'Informations du devis')+`<h1>${stage==='draft'?'Brouillon de devis':stage==='valid'?'Devis validé':'Envoi simulé'}</h1><p class="lead">Vérifiez le contenu et le montant par intervention.</p>
      <article class="box paper"><div class="paperhead"><strong>Propreté Est</strong><span class="demo">${{draft:'Brouillon',valid:'Validé',sent:'Envoyé · simulation'}[stage]}</span></div><h2>${esc(r.name)}</h2><p>${esc([r.company,r.email,r.phone].filter(Boolean).join(' · '))}</p>
      <dl>${entry('Prestation',r.service)}${entry('Surface',r.area && r.area+' m²')}${entry('Fréquence',r.frequency)}${entry('Adresse',[r.street,r.city].filter(Boolean).join(', '))}${entry('Date souhaitée',date)}${entry('Notes',r.notes||'Aucune note')}</dl><div class="total"><span>Montant estimé<small>Par intervention</small></span><b>${amount}</b></div></article>
      <div class="quote-actions"><a class="secondary" href="#${origin}">${icon('pen',16)}Modifier</a><button class="secondary" data-act="pdf">${icon('download',16)}Télécharger en PDF</button>${stage==='draft'?'<button class="primary" data-act="validate">Valider</button>':stage==='valid'?'<button class="primary" data-act="send">Simuler l’envoi</button>':''}</div><button class="reset" data-act="reset">Créer un autre devis</button>`;
  }
  return {home,conversation,form,quote};
})();
