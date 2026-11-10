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
  const taxLabels = {a_preciser:'À préciser', franchise:'Franchise en base', taux:'TVA à un taux précisé'};
  function pricing(r) {
    const mode = r.mode_tva || 'a_preciser';
    return `<fieldset><legend>Tarification</legend><div class="fields">
      <div><label for="montant_ht">Montant HT par intervention (€)</label><input type="number" inputmode="decimal" min="0" max="1000000" step="0.01" id="montant_ht" name="montant_ht" value="${esc(r.montant_ht)}" placeholder="À chiffrer"></div>
      <div><label for="mode_tva">Régime de TVA</label><select id="mode_tva" name="mode_tva">${Object.entries(taxLabels).map(([key, label]) => `<option value="${key}" ${key === mode ? 'selected' : ''}>${label}</option>`).join('')}</select></div>
      <div id="tax-field" ${mode === 'taux' ? '' : 'hidden'}><label for="taux_tva">Taux de TVA (%)</label><input type="number" inputmode="decimal" min="0" max="100" step="0.01" id="taux_tva" name="taux_tva" value="${esc(r.taux_tva)}" required ${mode === 'taux' ? '' : 'disabled'}></div>
    </div></fieldset>`;
  }
  function form(r,review) {
    return back(review?'conversation':'accueil',review?'Audio ou chat':'Modes de création')+`<h1>${review?'Vérifier les informations':'Formulaire rapide'}</h1><p class="lead">${review?'Complétez les détails de l’appel avant de préparer le devis.':'Saisissez les détails de l’appel pour préparer le brouillon.'}</p>
      <form id="details" class="box"><fieldset><legend>Client</legend><div class="fields">${field(r,'name','Nom du client')}${field(r,'company','Société')}${field(r,'phone','Téléphone','tel')}${field(r,'email','Email','email')}</div></fieldset>
      <fieldset><legend>Intervention</legend><div class="fields">${field(r,'service','Type de prestation','text',QuoteData.services)}${field(r,'area','Surface estimée (m²)','number')}${field(r,'frequency','Fréquence','text',QuoteData.frequencies)}${field(r,'desired','Date souhaitée','date')}${field(r,'street','Adresse')}${field(r,'city','Ville')}${field(r,'notes','Détails complémentaires','textarea')}</div></fieldset>${pricing(r)}
      <div class="actions"><small>* Champ obligatoire</small><button class="primary">${icon('file',17)}Préparer le devis</button></div></form>`;
  }
  function quote(r,review,stage) {
    const entry=(key,value)=>`<div><dt>${key}</dt><dd>${esc(value||'À préciser')}</dd></div>`;
    const date=r.desired ? new Intl.DateTimeFormat('fr-FR',{dateStyle:'long'}).format(new Date(r.desired+'T12:00:00')) : '';
    const amount=r.montant_ht ? new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(r.montant_ht)):'À chiffrer';
    const origin=review?'verification':'formulaire';
    return back(origin,'Informations du devis')+`<h1>${stage==='draft'?'Brouillon de devis':stage==='valid'?'Devis validé':'Envoi simulé'}</h1><p class="lead">Vérifiez le contenu et le montant par intervention.</p>
      <article class="box paper"><div class="paperhead"><strong>Propreté Est</strong><span class="demo">${{draft:'Brouillon',valid:'Validé',sent:'Envoyé · simulation'}[stage]}</span></div><h2>${esc(r.name)}</h2><p>${esc([r.company,r.email,r.phone].filter(Boolean).join(' · '))}</p>
      <dl>${entry('Prestation',r.service)}${entry('Surface',r.area && r.area+' m²')}${entry('Fréquence',r.frequency)}${entry('Adresse',[r.street,r.city].filter(Boolean).join(', '))}${entry('Date souhaitée',date)}${entry('Notes',r.notes||'Aucune note')}${entry('TVA',r.mode_tva === 'taux' ? r.taux_tva + ' %' : taxLabels[r.mode_tva || 'a_preciser'])}</dl><div class="total"><span>Montant HT<small>Par intervention</small></span><b>${amount}</b></div></article>
      <div class="quote-actions"><a class="secondary" href="#${origin}">${icon('pen',16)}Modifier</a><button class="secondary" data-act="pdf">${icon('download',16)}Générer le PDF</button>${stage==='draft'?'<button class="primary" data-act="validate">Valider</button>':stage==='valid'?'<button class="primary" data-act="send">Simuler l’envoi</button>':''}</div><button class="reset" data-act="reset">Créer un autre devis</button>`;
  }
  function pdfPanel(pdf, standalone) {
    const decision = {autorise:'Autorisée', refuse:'Refusée', en_attente:'En attente'};
    const button = (row, act, label, disabled) => `<button type="button" class="secondary" data-pdf="${act}" data-token="${esc(row.token)}" ${disabled ? 'disabled' : ''}>${label}</button>`;
    const cards = pdf.rows.map(row => {
      const busy = pdf.busy.get(row.token);
      const date = new Date(row.cree_le || '');
      const created = Number.isFinite(date.getTime()) ? date.toLocaleString('fr-FR', {dateStyle:'medium',timeStyle:'short'}) : 'Non renseignée';
      return `<article class="pdf-card"><div class="pdf-heading"><h3>${esc(row.numero)}</h3><span class="demo">${esc(row.statut || 'Statut inconnu')}</span></div>
        <dl><div><dt>Client</dt><dd>${esc(row.nom_client || 'Non renseigné')}</dd></div>
        <div><dt>Prestation</dt><dd>${esc(row.prestation || 'Non renseignée')}</dd></div><div><dt>Création</dt><dd>${esc(created)}</dd></div></dl>
        <div class="pdf-actions">${button(row,'preview',busy === 'preview' ? 'Ouverture…' : 'Prévisualiser',busy)}${button(row,'download',busy === 'download' ? 'Téléchargement…' : 'Télécharger',busy)}</div>
        <p>Préparation d’un brouillon email · <strong>${esc(decision[row.decision_brouillon_mail] || 'Non renseignée')}</strong></p>
        <div class="pdf-actions">${button(row,'autorise',busy === 'autorise' ? 'Enregistrement…' : 'Autoriser la préparation d’un brouillon email',busy || row.decision_brouillon_mail === 'autorise')}${button(row,'refuse',busy === 'refuse' ? 'Enregistrement…' : 'Refuser',busy || row.decision_brouillon_mail === 'refuse')}</div>
        </article>`;
    }).join('');
    return `<div class="pdf-heading">${standalone ? '<h2>Cette conversation</h2>' : '<h2>Devis PDF</h2>'}<button class="secondary" data-act="refresh-pdf" ${pdf.loading ? 'disabled' : ''}>Actualiser</button></div>
      <div role="status">${pdf.loading ? '<p>Chargement des devis…</p>' : ''}${pdf.notice ? `<p>${esc(pdf.notice)}</p>` : ''}</div>
      ${[pdf.error,pdf.listError].filter(Boolean).map(message => `<p role="alert">${esc(message)}</p>`).join('')}
      ${cards || (!pdf.loading && !pdf.listError ? '<p>Aucun devis PDF dans cette conversation.</p>' : '')}
      ${cards ? '<p class="pdf-note">La décision est enregistrée pour une future fonctionnalité. Aucun brouillon email n’est créé et aucun email n’est envoyé.</p>' : ''}`;
  }
  function pdfPage() {
    return back('conversation','Revenir à la conversation') + '<h1>Devis PDF</h1>';
  }
  return {home,conversation,form,quote,pdfPage,pdfPanel};
})();
