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
  const money=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n/100);
  const input=(name,label,value='',type='text',extra='')=>`<div><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
  const select=(name,label,options)=>`<div><label for="${name}">${label}</label><select id="${name}" name="${name}">${options}</select></div>`;
  const status=s=>`${s.loading?'<p role="status">Lecture des données enregistrées…</p>':''}${s.error?`<p class="error" role="alert">${esc(s.error)}</p>`:''}${s.notice?`<p class="notice" role="status">${esc(s.notice)}</p>`:''}`;
  function dossiers(s){const d=s.dossierDraft;
    return `<h1>Dossiers clients</h1><p class="lead">Enregistrez une demande même incomplète. Le chat retrouve ces mêmes dossiers dans toutes les conversations de cet espace.</p>${status(s)}<div class="workspace-grid"><section class="box"><h2>Demandes enregistrées</h2><button class="secondary" data-act="reload">Actualiser</button>${s.dossiers.map(x=>`<article class="pdf-card"><h3>${esc(x.clientName)}</h3><p>${esc(x.prestation)} · ${esc(x.surface||'Surface à préciser')}</p><small>${esc(x.dossierId)}</small><p><button class="secondary" data-edit-dossier="${esc(x.dossierId)}">Compléter ou corriger</button><button class="secondary" data-compose="${esc(x.dossierId)}">Créer un devis</button></p></article>`).join('')||'<p>Aucune demande enregistrée.</p>'}</section><form id="dossier-form" class="box"><h2>${d.dossierId?'Modifier la demande':'Nouvelle demande'}</h2><div class="fields">${input('prenom_client','Prénom',d.prenom_client)}${input('nom_client','Nom ou société *',d.nom_client,'text','required maxlength="160"')}${input('prestation','Prestation demandée *',d.prestation,'text','required maxlength="300"')}${input('surface','Surface (m²)',d.surface)}${input('frequence','Fréquence',d.frequence)}${input('adresse_chantier','Adresse du chantier',d.adresse_chantier)}${input('adresse_facturation','Adresse de facturation',d.adresse_facturation)}${input('notes','Notes',d.notes)}</div><div class="actions"><button type="button" class="secondary" data-act="new-dossier">Nouvelle demande</button><button class="primary" ${s.busy?'disabled':''}>${s.busy?'Enregistrement…':'Enregistrer le dossier'}</button></div></form></div>`;
  }
  function settings(s){const c=s.catalogDraft;
    return `<h1>Désignations et prix</h1><p class="lead">Les tarifs enregistrés ici sont utilisés par le chat et le formulaire. Les PDF déjà créés conservent leurs tarifs.</p>${status(s)}<div class="workspace-grid"><section class="box"><h2>Catalogue enregistré</h2><button class="secondary" data-act="reload">Actualiser</button>${s.catalog.map(c=>`<article class="pdf-card"><h3>${esc(c.label)}</h3><p>${esc(c.description)}</p><p>${money(Math.round(c.price*100))} HT / ${esc(c.unit)} · TVA ${c.vat} % · ${c.active?'Active':'Désactivée'}</p><button class="secondary" data-edit-catalog="${esc(c.id)}">Modifier</button> <button class="secondary" data-delete-catalog="${esc(c.id)}" ${s.busy?'disabled':''}>Supprimer</button></article>`).join('')||'<p>Aucune désignation. Ajoutez vos propres tarifs.</p>'}</section><form id="catalog-form" class="box"><h2>${c.id?'Modifier la désignation':'Ajouter une désignation'}</h2><div class="fields">${input('label','Libellé *',c.label,'text','required maxlength="160"')}${input('description','Description',c.description,'text','maxlength="1000"')}${input('unit','Unité (m², passage, forfait…) *',c.unit,'text','required maxlength="30"')}${input('price','Prix unitaire HT (€) *',c.price,'number','required min="0" max="1000000" step="0.01"')}${input('vat','TVA (%) *',c.vat,'number','required min="0" max="100" step="0.01"')}</div><p><label><input name="active" type="checkbox" ${c.active!==false?'checked':''}> Désignation active</label></p><div class="actions"><button type="button" class="secondary" data-act="new-catalog">Nouvelle désignation</button><button class="primary" ${s.busy?'disabled':''}>Enregistrer</button></div><small>Une désignation déjà utilisée doit être désactivée. La suppression est réservée aux désignations jamais utilisées.</small></form></div>`;
  }
  function composer(s){const draft=s.quoteDraft,old=s.quotes.find(q=>q.token===draft.token);const ds=s.dossiers;
   return `<h1>${old?'Nouvelle version du devis':'Créer un devis'}</h1><p class="lead">Choisissez un dossier enregistré et les désignations à chiffrer. Chaque correction produit un nouveau PDF.</p>${status(s)}<form id="quote-form" class="box">${old?`<h2>${esc(old.numero)}</h2><p>Les prix des lignes existantes sont conservés.</p>`:select('dossierId','Dossier client *','<option value="">Choisir un dossier</option>'+ds.map(d=>`<option value="${esc(d.dossierId)}" ${d.dossierId===draft.dossierId?'selected':''}>${esc(d.clientName+' · '+d.prestation+' · '+d.dossierId.slice(-8))}</option>`).join(''))}<p><a href="#formulaire">Enregistrer ou compléter un dossier</a> · <a href="#parametres">Gérer les désignations</a></p><div class="line-list">${draft.lines.map((l,i)=>{const frozen=l.lineId;return `<div class="quote-line" data-line="${i}">${frozen?`<div><strong>${esc(l.label)}</strong><small>${money(Math.round(l.price*100))} HT / ${esc(l.unit)} · TVA ${l.vat} %</small></div>`:select('catalog-'+i,'Désignation',`<option value="">Choisir</option>`+s.catalog.filter(c=>c.active).map(c=>`<option value="${esc(c.id)}" ${c.id===l.catalogId?'selected':''}>${esc(c.label+' · '+money(Math.round(c.price*100))+' / '+c.unit)}</option>`).join(''))}${input('quantity-'+i,'Quantité',l.quantity,'number','required min="0.001" max="1000000" step="0.001"')}<button class="secondary" type="button" data-remove-line="${i}">Retirer</button></div>`;}).join('')}</div><button class="secondary" type="button" data-act="add-line">Ajouter une ligne</button>${input('reason','Motif de création ou correction',draft.reason||'','text','maxlength="500"')}<div class="actions"><button class="primary" ${s.busy?'disabled':''}>${s.busy?'Génération…':old?'Générer une nouvelle version':'Générer le PDF chiffré'}</button></div></form>`;
  }
  function pdfPanel(s){return `<div class="pdf-heading"><h2>Devis de cet espace</h2><button class="secondary" data-act="reload">Actualiser</button></div><p><a href="#devis">Créer un devis</a> · <label><input id="history-toggle" type="checkbox" ${s.history?'checked':''}> Afficher les anciennes versions</label></p>${s.quotes.filter(q=>s.history||q.current).map(q=>`<article class="pdf-card"><div class="pdf-heading"><h3>${esc(q.numero)}</h3><span class="demo">${q.conflict?'Conflit à résoudre':q.current?'Version actuelle':'Version antérieure'}</span></div><p><strong>${esc(q.clientName)}</strong> · ${money(q.htCents)} HT · ${money(q.ttcCents)} TTC</p><p>${q.lines.map(l=>esc(l.label)+' × '+l.quantity).join(' · ')}</p><small>${esc(new Date(q.createdAt).toLocaleString('fr-FR'))} · Brouillon</small>${q.stale?'<p class="notice">Le dossier a changé depuis ce PDF. Créez une nouvelle version pour reprendre ses informations.</p>':''}<div class="pdf-actions"><button class="secondary" data-pdf="preview" data-token="${esc(q.token)}" ${s.busy?'disabled':''}>Prévisualiser</button><button class="secondary" data-pdf="download" data-token="${esc(q.token)}" ${s.busy?'disabled':''}>Télécharger</button>${q.current&&!q.conflict?`<button class="secondary" data-revise="${esc(q.token)}">Corriger · nouvelle version</button>`:''}</div></article>`).join('')||'<p>Aucun devis enregistré.</p>'}`;}
  function workspace(s){return `<h1>Espace privé de démonstration</h1><p class="lead">Vos dossiers, désignations et devis sont rattachés à cet espace, indépendamment des conversations.</p>${status(s)}<section class="box"><h2>Conserver l’accès</h2><p>La clé reste sur ce navigateur. Conservez une copie pour retrouver cet espace sur un autre appareil. Toute personne qui possède cette clé peut consulter et modifier cet espace.</p><button class="secondary" data-act="show-key">Afficher ma clé de récupération</button><div id="workspace-key"></div><p>Utilisez des données fictives pour cette démonstration. Pour des données clients réelles, une connexion utilisateur et une gestion des accès restent nécessaires.</p></section><form id="workspace-form" class="box"><h2>Ouvrir un espace existant</h2>${input('workspaceKey','Clé de récupération','','password','required minlength="64" maxlength="64" autocomplete="off"')}<div class="actions"><button class="primary">Ouvrir cet espace</button></div></form>`;}
  return {home,conversation,dossiers,settings,composer,pdfPanel,workspace,status};
})();
