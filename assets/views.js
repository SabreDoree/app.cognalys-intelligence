'use strict';
const Views = (() => {
  const icon = Icons.svg;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[c]);

  function formatAssistant(text) {
    const input = String(text ?? '');
    const formats = {
      '**': html => `<strong>${html}</strong>`,
      [String.fromCharCode(36, 36)]: html => `<span class="chat-yellow">${html}</span>`,
      '__': html => `<u>${html}</u>`,
      '€€': html => `<span class="chat-green">${html}</span>`,
      '&&': html => `<span class="chat-red">${html}</span>`
    };
    // Code spans stay literal: formatting markers inside them are never interpreted.
    const markers = ['`', ...Object.keys(formats)];
    // If the AI mistakenly wraps an entire formatted token in backticks,
    // display the requested style rather than treating it as a code literal.
    function renderWrappedFormat(value) {
      for (const marker of Object.keys(formats)) {
        if (value.startsWith(marker) && value.endsWith(marker) &&
            value.length > marker.length * 2) {
          return formats[marker](esc(value.slice(marker.length, -marker.length)));
        }
      }
      return null;
    }
    function parse(start, closing, depth) {
      let html = '', i = start;
      while (i < input.length) {
        const marker = markers.find(token => input.startsWith(token, i));
        if (marker === closing) return {html, next: i + marker.length, closed: true};
        if (marker === '`') {
          // Parse an entire run of backticks, not each backtick separately.
          // Both `texte` and ``texte`` form one code span.
          let runEnd = i;
          while (input[runEnd] === '`') runEnd++;
          const runLength = runEnd - i;
          let searchFrom = runEnd;
          let matched = false;
          while (searchFrom < input.length) {
            const next = input.indexOf('`', searchFrom);
            if (next === -1) break;
            let closingEnd = next;
            while (input[closingEnd] === '`') closingEnd++;
            if (closingEnd - next === runLength) {
              const codeText = input.slice(runEnd, next);
              if (codeText.trim()) {
                html += renderWrappedFormat(codeText) ?? `<code class="chat-code">${esc(codeText)}</code>`;
                i = closingEnd;
                matched = true;
                break;
              }
            }
            searchFrom = closingEnd;
          }
          if (matched) continue;
        }
        if (marker && marker !== '`' && depth < 12 && input.indexOf(marker, i + marker.length) !== -1) {
          const inner = parse(i + marker.length, marker, depth + 1);
          if (inner.closed) {
            html += formats[marker](inner.html);
            i = inner.next;
            continue;
          }
        }
        if (marker) {
          html += esc(marker);
          i += marker.length;
        } else {
          html += esc(input[i]);
          i++;
        }
      }
      return {html, next: i, closed: false};
    }
    return parse(0, null, 0).html;
  }
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
    const history = s.messages.map(m => m.audioUrl
      ? `<div class="reply voice-message"><strong>Message vocal</strong><audio controls aria-label="Écouter le message vocal" src="${esc(m.audioUrl)}"></audio></div>`
      : `<p class="${m.user ? 'reply' : 'ask'}">${m.user ? esc(m.text) : formatAssistant(m.text)}</p>`).join('');
    const busy = s.pending || ['permission','recording','stopping','transcribing'].includes(s.audio);
    const recording = s.audio === 'recording';
    return back('accueil','Modes de création')+`<h1>Audio ou chat</h1><p class="lead">Dictez les détails de l’appel ou écrivez votre message. La note vocale est transmise automatiquement à l’assistant après transcription.</p>
      <section class="box chat"><div class="chat-title"><img src="./assets/symbole.svg" alt="">Assistant devis</div>
      <div class="thread">${history || '<p class="ask">Décrivez votre demande de devis.</p>'}${s.pending ? '<p role="status">Réponse en cours…</p>' : ''}${s.error ? `<p role="alert">${esc(s.error)}</p>` : ''}</div>
      <div class="audio">${s.clip && !s.pending ? `<div><strong>Votre note vocale</strong><audio controls src="${esc(s.clip.url)}" style="display:block;max-width:100%"></audio></div><button class="secondary" data-act="discard" ${busy?'disabled':''}>Supprimer la note</button>${s.error && !busy && !s.transcribed ? '<button type="button" class="secondary" data-act="transcribe">Réessayer la transcription</button>' : ''}` : s.clip ? '<p role="status">Votre message vocal est envoyé à l’assistant…</p>' :
        `<button type="button" class="secondary" data-act="${recording?'stop':'record'}" ${busy&&!recording?'disabled':''}>${icon(recording?'stop':'mic',17)}${recording?'Arrêter':s.audio==='permission'?'Autorisation du micro…':s.audio==='stopping'?'Préparation…':'Enregistrer une note vocale'}</button>${recording?`<div class="recording">${wave()}<span id="timer">00:00</span></div>`:''}`}</div>
      ${s.clip ? `<p role="status">${s.audio === 'transcribing' ? 'Transcription de votre note en cours…' : s.pending ? 'Transcription envoyée à l’assistant…' : s.transcribed ? 'Envoi interrompu. Corrigez le texte et réessayez.' : 'Écrivez votre message ou réessayez la transcription.'}</p>` : ''}<form id="chat-form"><label for="answer">${s.clip?'Transcription ou précisions':'Votre réponse'}</label><div class="composer"><input id="answer" name="answer" placeholder="${s.clip?'Ajoutez ou corrigez le texte…':'Écrivez votre réponse…'}" required value="${esc(s.draft)}" ${busy?'disabled':''}><button class="primary" ${busy?'disabled':''} aria-label="${s.clip?'Envoyer la note vocale':'Envoyer la réponse'}">${icon('send',19)}</button></div></form>
      </section>`;
  }
  const money=n=>n==null?'À chiffrer':new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n/100);
  const input=(name,label,value='',type='text',extra='')=>`<div><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
  const select=(name,label,options)=>`<div><label for="${name}">${label}</label><select id="${name}" name="${name}">${options}</select></div>`;
  const clientFields=['prenom_client','nom_client','email_client','telephone_client','prestation','surface','frequence','adresse_chantier','adresse_facturation','notes'];
  function clientEditor(client={},prefix='client-'){
    const labels=['Prénom','Nom ou société *','E-mail','Téléphone','Prestation *','Surface (m²)','Fréquence','Adresse du chantier','Adresse de facturation','Notes'];
    return '<div class="fields">'+clientFields.map((k,i)=>input(prefix+k,labels[i],client[k]||'',k==='email_client'?'email':k==='telephone_client'?'tel':'text',(k==='nom_client'||k==='prestation'?'required ':'')+'maxlength="'+(k==='notes'?2000:1000)+'"')).join('')+'</div>';
  }
  function unitSelect(name,value){const units=['m²','m³','mètre linéaire','unité','heure','jour','passage','forfait','mois'];if(value&&!units.includes(value))units.push(value);return select(name,'Unité *',units.map(v=>`<option value="${esc(v)}" ${v===(value||'m²')?'selected':''}>${esc(v)}</option>`).join(''));}
  const status=s=>`${s.loading?'<p role="status">Lecture des données enregistrées…</p>':''}${s.error?`<p class="error" role="alert">${esc(s.error)}</p>`:''}${s.notice?`<p class="notice" role="status">${esc(s.notice)}</p>`:''}`;
  function dossiers(s){const d=s.dossierDraft;
    return `<h1>Dossiers clients</h1><p class="lead">Enregistrez une demande même incomplète. Le chat retrouve ces mêmes dossiers dans toutes les conversations de cet espace.</p>${status(s)}<section class="box">${pdfPanel(s,true)}</section><div class="workspace-grid"><section class="box"><h2>Demandes enregistrées</h2><button class="secondary" data-act="reload">Actualiser</button>${s.dossiers.map(x=>`<article class="pdf-card"><h3>${esc(x.clientName)}</h3><p>${esc(x.prestation)} · ${esc(x.surface||'Surface à préciser')}</p><small>${esc(x.dossierId)}</small><p><button class="secondary" data-edit-dossier="${esc(x.dossierId)}">Compléter ou corriger</button><button class="secondary" data-compose="${esc(x.dossierId)}">Créer un devis</button></p></article>`).join('')||'<p>Aucune demande enregistrée.</p>'}</section><form id="dossier-form" class="box"><h2>${d.dossierId?'Modifier la demande':'Nouvelle demande'}</h2><div class="fields">${input('prenom_client','Prénom',d.prenom_client)}${input('nom_client','Nom ou société *',d.nom_client,'text','required maxlength="160"')}${input('prestation','Prestation demandée *',d.prestation,'text','required maxlength="300"')}${input('surface','Surface (m²)',d.surface)}${input('frequence','Fréquence',d.frequence)}${input('adresse_chantier','Adresse du chantier',d.adresse_chantier)}${input('adresse_facturation','Adresse de facturation',d.adresse_facturation)}${input('notes','Notes',d.notes)}</div><div class="actions"><button type="button" class="secondary" data-act="new-dossier">Nouvelle demande</button><button class="primary" ${s.busy?'disabled':''}>${s.busy?'Enregistrement…':'Enregistrer le dossier'}</button></div></form></div>`;
  }
  function catalogSettings(s){const c=s.catalogDraft;
    return `<h2>Désignations et prix</h2><p class="lead">Les tarifs enregistrés ici sont utilisés par le chat et le formulaire. Les PDF déjà créés conservent leurs tarifs.</p>${status(s)}<div class="workspace-grid"><section class="box"><h2>Catalogue enregistré</h2><button class="secondary" data-act="reload">Actualiser</button>${s.catalog.map(c=>`<article class="pdf-card"><h3>${esc(c.label)}</h3><p>${esc(c.description)}</p><p>${money(Math.round(c.price*100))} HT / ${esc(c.unit)} · TVA ${c.vat} % · ${c.active?'Active':'Désactivée'}</p><button class="secondary" data-edit-catalog="${esc(c.id)}">Modifier</button> <button class="secondary" data-delete-catalog="${esc(c.id)}" ${s.busy?'disabled':''}>Supprimer</button></article>`).join('')||'<p>Aucune désignation. Ajoutez vos propres tarifs.</p>'}</section><form id="catalog-form" class="box"><h2>${c.id?'Modifier la désignation':'Ajouter une désignation'}</h2><div class="fields">${input('label','Libellé *',c.label,'text','required maxlength="160"')}${input('description','Description',c.description,'text','maxlength="1000"')}${unitSelect('unit',c.unit)}${input('price','Prix unitaire HT (€) *',c.price,'number','required min="0" max="1000000" step="0.01"')}${input('vat','TVA (%) *',c.vat,'number','required min="0" max="100" step="0.01"')}</div><p><label><input name="active" type="checkbox" ${c.active!==false?'checked':''}> Désignation active</label></p><div class="actions"><button type="button" class="secondary" data-act="new-catalog">Nouvelle désignation</button><button class="primary" ${s.busy?'disabled':''}>Enregistrer</button></div><small>Une désignation déjà utilisée doit être désactivée. La suppression est réservée aux désignations jamais utilisées.</small></form></div>`;
  }
  function settings(s){const p=s.presentationDraft||{},a=CognalysAuth.state;
   const area=(name,label)=>'<div><label for="'+name+'">'+label+'</label><textarea id="'+name+'" name="'+name+'" rows="3" maxlength="3000">'+esc(p[name]||'')+'</textarea></div>';
   return '<h1>Paramètres</h1><p class="lead">Tarifs et présentation des devis de votre entreprise.</p><section class="box"><h2>Votre compte</h2><p>'+esc(a.user?.email)+' · '+esc(a.access?.company)+'</p><button class="secondary" data-act="logout">Se déconnecter</button></section><form id="presentation-form" class="box"><h2>Présentation des devis</h2><p>Ces réglages seront appliqués aux prochains PDF et aux nouvelles versions. Les anciens documents sont conservés.</p>'+status(s)+'<div class="fields">'+input('companyName','Nom de l’entreprise sur le devis',p.companyName,'text','required maxlength="160"')+input('street','Numéro et voie *',p.street,'text','required maxlength="160" autocomplete="street-address"')+input('addressExtra','Complément d’adresse',p.addressExtra)+input('postalCode','Code postal *',p.postalCode,'text','required pattern="[0-9]{5}" maxlength="5" inputmode="numeric" autocomplete="postal-code"')+input('city','Ville *',p.city,'text','required autocomplete="address-level2"')+input('country','Pays','France','text','readonly')+select('legalForm','Forme juridique *','<option value="">Choisir</option>'+['EI','SAS','SASU','SARL','EURL','SA','SNC','Association','Autre'].map(v=>'<option '+(p.legalForm===v?'selected':'')+'>'+v+'</option>').join(''))+input('siren','SIREN *',p.siren,'text','required pattern="[0-9]{9}" maxlength="9" inputmode="numeric"')+input('siret','SIRET',p.siret,'text','pattern="[0-9]{14}" maxlength="14" inputmode="numeric"')+input('capital','Capital social (€, pour les sociétés)',p.capital,'number','min="0" step="0.01"')+input('rcsCity','Ville d’immatriculation au RCS (sociétés)',p.rcsCity)+select('vatMode','Régime de TVA','<option value="standard" '+(p.vatMode!=='franchise'?'selected':'')+'>TVA applicable</option><option value="franchise" '+(p.vatMode==='franchise'?'selected':'')+'>Franchise en base de TVA</option>')+input('vatNumber','Numéro de TVA français (si applicable)',p.vatNumber,'text','maxlength="13" placeholder="FR…"')+input('companyEmail','E-mail de l’entreprise',p.companyEmail,'email')+input('companyPhone','Téléphone de l’entreprise',p.companyPhone,'tel')+input('validityDays','Validité de l’offre (jours) *',p.validityDays||30,'number','required min="1" max="365" step="1"')+input('depositPercent','Acompte (%)',p.depositPercent||0,'number','min="0" max="100" step="0.01"')+input('primaryColor','Couleur principale',p.primaryColor||'#3E7CE0','color')+input('accentColor','Couleur des encadrés',p.accentColor||'#E9F0FA','color')+'</div><p><label for="company-logo">Logo de l’entreprise (PNG ou JPEG, 250 Ko maximum)</label><input id="company-logo" type="file" accept="image/png,image/jpeg"></p>'+(p.logo?'<img src="'+esc(p.logo)+'" alt="Logo sélectionné" style="max-width:200px;max-height:100px;object-fit:contain"><p><button type="button" class="secondary" data-act="remove-logo">Retirer le logo</button></p>':'')+area('paymentTerms','Modalités de paiement *')+area('executionTerms','Date ou délai d’exécution *')+area('insuranceInfo','Assurance professionnelle (si applicable)')+input('sapNumber','Déclaration ou agrément services à la personne (si applicable)',p.sapNumber)+area('mediator','Médiateur de la consommation : nom et coordonnées (si applicable)')+'<p>Les formats et clés de contrôle sont vérifiés. Ces contrôles ne certifient ni l’existence de l’entreprise ni l’exactitude de son adresse. Renseignez les informations de vos documents officiels.</p>'+(p.companyDetails?'<p class="notice">Anciennes coordonnées à reporter dans les champs structurés : '+esc(p.companyDetails)+'</p>':'')+area('intro','Description en début de devis')+area('comments','Commentaires sous les lignes du devis')+area('footer','Texte de pied de page / conditions')+'<div class="actions"><button class="primary" '+(s.busy?'disabled':'')+'>Enregistrer la présentation</button></div></form>'+catalogSettings(s);
  }
  function composer(s){const draft=s.quoteDraft,old=s.quotes.find(q=>q.token===draft.token);const ds=s.dossiers;
   return `<h1>${old?'Nouvelle version du devis':'Créer un devis'}</h1><p class="lead">Choisissez un dossier enregistré et les désignations à chiffrer. Chaque correction produit un nouveau PDF.</p>${status(s)}<form id="quote-form" class="box">${old?`<h2>${esc(old.numero)}</h2><p>Modifiez les informations du client et les lignes. Seule la nouvelle version du PDF sera modifiée.</p>`:select('dossierId','Dossier client *','<option value="">Choisir un dossier</option>'+ds.map(d=>`<option value="${esc(d.dossierId)}" ${d.dossierId===draft.dossierId?'selected':''}>${esc(d.clientName+' · '+d.prestation+' · '+d.dossierId.slice(-8))}</option>`).join(''))}<p><a href="#formulaire">Enregistrer ou compléter un dossier</a> · <a href="#parametres">Gérer les désignations</a></p>${old?'<h2>Informations du client</h2>'+clientEditor(draft.client)+'<p>Ces corrections concernent ce devis. Le dossier client reste modifiable dans Dossiers clients.</p>':''}<h2>Prestations et tarifs</h2><div class="line-list">${draft.lines.map((l,i)=>{const frozen=l.lineId;return `<div class="quote-line" data-line="${i}">${frozen?`<div class="fields">${input('label-'+i,'Désignation',l.label,'text','required maxlength="160"')}${input('description-'+i,'Description',l.description,'text','maxlength="1000"')}${unitSelect('unit-'+i,l.unit)}${input('price-'+i,'Prix unitaire HT (€)',l.price,'number','required min="0" max="1000000" step="0.01"')}${input('vat-'+i,'TVA (%)',l.vat,'number','required min="0" max="100" step="0.01"')}</div>`:select('catalog-'+i,'Désignation',`<option value="">Choisir</option>`+s.catalog.filter(c=>c.active).map(c=>`<option value="${esc(c.id)}" ${c.id===l.catalogId?'selected':''}>${esc(c.label+' · '+money(Math.round(c.price*100))+' / '+c.unit)}</option>`).join(''))}${input('quantity-'+i,'Quantité',l.quantity,'number','required min="0.001" max="1000000" step="0.001"')}<button class="secondary" type="button" data-remove-line="${i}">Retirer</button></div>`;}).join('')}</div><button class="secondary" type="button" data-act="add-line">Ajouter une ligne</button>${input('reason','Motif de création ou correction',draft.reason||'','text','maxlength="500"')}<div class="actions"><button class="primary" ${s.busy?'disabled':''}>${s.busy?'Génération…':old?'Générer une nouvelle version':'Générer le PDF chiffré'}</button></div></form>`;
  }
  function pdfPanel(s,timeline=false){
    const groups=new Map();for(const q of s.quotes){const id=q.quoteId||q.numero; if(!groups.has(id))groups.set(id,[]);groups.get(id).push(q);}
    return `<div class="pdf-heading"><h2>Devis de cet espace</h2><button class="secondary" data-act="reload">Actualiser</button></div><p><a href="#devis">Créer un devis</a></p>`+[...groups.entries()].map(([id,versions])=>{
      versions.sort((a,b)=>b.version-a.version||String(b.createdAt).localeCompare(String(a.createdAt)));
      const q=versions.find(q=>q.token===s.selectedVersions?.[id])||versions.find(q=>q.current)||versions[0];
      const head=versions.find(q=>q.current&&!q.conflict);
      return `<article class="pdf-card"><div class="pdf-heading"><h3>${esc(id)}</h3><span class="demo">${q.conflict?'Conflit à résoudre':q.current?'Version actuelle':'Version antérieure'}</span></div><label>Version du document<select data-quote-version="${esc(id)}">${versions.map(v=>`<option value="${esc(v.token)}" ${v.token===q.token?'selected':''}>Version ${esc(v.version)} · ${esc(new Date(v.createdAt).toLocaleString('fr-FR'))}${v.current?' · actuelle':''}</option>`).join('')}</select></label><p><strong>${esc(q.clientName)}</strong> · ${money(q.htCents)} HT · ${money(q.ttcCents)} TTC</p><p>${q.lines.map(l=>esc(l.label)+' × '+l.quantity).join(' · ')}</p><small>${esc(new Date(q.createdAt).toLocaleString('fr-FR'))} · Brouillon${q.documentType==='estimate'?' · Reçu du formulaire':''}</small>${q.stale?'<p class="notice">Le dossier a changé depuis ce PDF.</p>':''}<div class="pdf-actions"><button class="secondary" data-pdf="preview" data-token="${esc(q.token)}" ${s.busy?'disabled':''}>Prévisualiser</button><button class="secondary" data-pdf="download" data-token="${esc(q.token)}" ${s.busy?'disabled':''}>Télécharger</button>${head?`<button class="secondary" data-revise="${esc(head.token)}">Corriger · nouvelle version${q.token!==head.token?' depuis la version actuelle':''}</button>`:''}</div></article>`;
    }).join('')+(groups.size?'':'<p>Aucun devis enregistré.</p>');
  }
  function login(a,s){
   if(!a.ready)return '<h1>Connexion</h1><p role="status">Chargement de la connexion…</p>';
   if(a.user)return '<h1>Votre compte</h1><section class="box"><p>Connecté : <strong>'+esc(a.user.email)+'</strong></p>'+(a.access?'<p role="status">'+esc(a.access.error||'Accès confirmé.')+'</p><p>Identifiant à communiquer pour activer votre espace :</p><p><code>'+esc(a.user.uid)+'</code></p>':'<p role="status">'+esc(a.problem||'Vérification de votre accès…')+'</p>')+'<div class="actions"><button class="primary" data-act="check-access">Vérifier mon accès</button><button class="secondary" data-act="logout">Se déconnecter</button></div></section>';
   return '<h1>'+ (s.signup?'Créer votre compte':'Connexion à votre espace')+'</h1><p class="lead">Retrouvez les dossiers, tarifs et devis de votre entreprise sur tous vos appareils.</p><form id="auth-form" class="box">'+(s.error||a.problem?'<p class="error" role="alert">'+esc(s.error||a.problem)+'</p>':'')+input('email','Adresse e-mail','','email','required autocomplete="email"')+input('password','Mot de passe','','password','required minlength="8" autocomplete="'+(s.signup?'new-password':'current-password')+'"')+(s.signup?'<p>Votre espace sera accessible après activation par Cognalys.</p>':'')+'<div class="actions"><button class="primary" '+(s.busy?'disabled':'')+'>'+(s.busy?'Connexion…':s.signup?'Créer mon compte':'Se connecter')+'</button><button class="secondary" type="button" data-act="auth-mode" '+(s.busy?'disabled':'')+'>'+(s.signup?'J’ai déjà un compte':'Créer un compte')+'</button></div></form>';
  }
  function workspace(s){const a=CognalysAuth.state;return '<h1>Mon entreprise</h1>'+status(s)+'<section class="box"><h2>'+esc(a.access?.company||'Mon espace')+'</h2><p>Connecté : '+esc(a.user?.email)+'</p><p>Vos dossiers, tarifs et devis restent accessibles après une nouvelle conversation et sur vos autres appareils.</p><button class="secondary" data-act="logout">Se déconnecter</button></section>';}
  function administration(s){
   if(!CognalysAuth.state.access?.isAdmin)return '<h1>Accès refusé</h1>';
   const companyName=m=>m.scope?((s.companies||[]).find(c=>c.scope===m.scope)?.company||m.company||'Entreprise sans nom'):'';
   const companies=(s.companies||[]).map(c=>'<article class="pdf-card"><h3>'+esc(c.company)+'</h3><p>'+c.memberCount+' membre(s) actif(s)</p></article>').join('')||'<p>Aucune entreprise. Ajoutez-en une ci-dessous pour rattacher des comptes.</p>';
   return '<h1>Administration des entreprises</h1><p class="lead">Gérez les entreprises et les accès de leurs membres.</p>'+status(s)+'<section class="box"><h2>Entreprises</h2>'+companies+'</section><form id="company-form" class="box"><h2>Ajouter une entreprise</h2><div class="fields">'+input('new-company','Nom de l’entreprise *','','text','required maxlength="160"')+'</div><button class="primary" '+(s.busy?'disabled':'')+'>Créer l’entreprise</button></form><div class="pdf-heading"><h2>Comptes membres</h2><button class="secondary" data-act="reload-admin">Actualiser</button></div>'+s.members.map(m=>'<article class="box" data-member="'+esc(m.uid)+'"><h3>'+esc(m.email||m.uid)+'</h3><p>État : '+esc({pending:'En attente',approved:'Actif',suspended:'Suspendu',rejected:'Refusé'}[m.status]||m.status)+'</p><p>Entreprise actuelle : <strong class="'+(m.scope?'':'company-none')+'">'+esc(companyName(m)||'Aucune')+'</strong></p>'+(m.uid==='TJFfqZBnzyfgpZRNmKGDwWnUltP2'?'<p>Compte propriétaire</p>':'<div class="actions"><button class="primary" data-company-link="'+esc(m.uid)+'">Rattacher une entreprise</button>'+(m.active?'<button class="secondary" data-admin-action="suspend" data-uid="'+esc(m.uid)+'">Suspendre l’accès</button>':'')+(m.status==='pending'?'<button class="secondary" data-admin-action="reject" data-uid="'+esc(m.uid)+'">Refuser l’inscription</button>':'')+'</div>')+'</article>').join('');
  }
  return {home,conversation,dossiers,settings,composer,pdfPanel,workspace,status,login,administration};
})();



