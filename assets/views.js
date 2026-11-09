'use strict';

const Views = (() => {
  const I = Icons.svg;
  const D = Demo;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const brand = () => '<img src="./assets/brand.svg" alt="" width="33" height="33"><span>Cognalys</span>';
  const link = (url, label, icon, style = 'btn') => `<a class="${style}" href="#${url}">${icon ? I(icon, 17) : ''}<span>${label}</span></a>`;
  const button = (action, label, icon, style = 'btn', disabled = false) => `<button type="button" class="${style}" data-action="${action}" ${disabled ? 'disabled' : ''}>${icon ? I(icon, 17) : ''}<span>${label}</span></button>`;
  const anchorArrow = (url, label) => `<a class="text-link" href="#${url}">${label}${I('right', 15)}</a>`;
  const status = key => `<span class="status s-${key}"><i></i>${D.statuses[key]}</span>`;
  const quoteStatus = key => `<span class="status q-${key}"><i></i>${({ draft: 'Brouillon', valid: 'Validé', sent: 'Envoyé' })[key]}</span>`;
  const avatar = r => `<span class="avatar tone-${r.tone}" aria-hidden="true">${esc(r.initials)}</span>`;
  const fullDate = date => D.formatDate(date, { day: 'numeric', month: 'long', year: 'numeric' });
  const areas = r => r.area ? esc(r.area) + ' m²' : '';
  const navItems = [
    ['accueil', 'Tableau de bord', 'grid'], ['demandes', 'Demandes', 'inbox'], ['devis', 'Devis', 'file']
  ];
  function navItem([route, title, icon], active, count = '') {
    const selected = active === route;
    return `<a href="#${route}" class="nav-item ${selected ? 'active' : ''}" ${selected ? 'aria-current="page"' : ''}>${I(icon, 19)}<span>${title}</span>${count ? `<small>${count}</small>` : ''}</a>`;
  }
  function shell(active, crumbs) {
    document.querySelector('#sidebar').innerHTML = `<a class="brand" href="#accueil" aria-label="Cognalys, accueil">${brand()}</a>
      <nav aria-label="Navigation principale"><p class="nav-label">Espace de travail</p>
      ${navItems.map(item => navItem(item, active, item[0] === 'demandes' ? D.records.length : '')).join('')}
      <div class="nav-rule"></div><p class="nav-label">Accès rapides</p>
      ${navItem(['nouvelle/vocale', 'Note vocale', 'mic'], active)}
      ${navItem(['nouvelle/saisie', 'Saisie rapide', 'form'], active)}</nav>
      <div class="organization"><span class="org-icon">${I('building', 22)}</span><span><strong>Propreté Est</strong><small>Entreprise de nettoyage</small></span></div>`;
    document.querySelector('#topbar').innerHTML = `<nav class="breadcrumb" aria-label="Fil d’Ariane">${I('panel', 17)}<a href="#accueil">Espace de travail</a>
      ${crumbs.map(([label, path]) => `${I('chevron', 12)}${path ? `<a href="#${path}">${esc(label)}</a>` : `<span aria-current="page">${esc(label)}</span>`}`).join('')}</nav>
      <a class="mobile-brand brand" href="#accueil" aria-label="Cognalys, accueil">${brand()}</a><span class="demo-tag"><i></i>Mode démo</span>`;
    const mobile = [['accueil', 'Accueil', 'grid'], ['demandes', 'Demandes', 'inbox'], ['nouvelle', 'Créer', 'plus'], ['devis', 'Devis', 'file']];
    document.querySelector('#mobile-nav').innerHTML = mobile.map(([route, title, icon]) => {
      const selected = active.split('/')[0] === route;
      return `<a href="#${route}" class="${selected ? 'active ' : ''}${route === 'nouvelle' ? 'create-nav' : ''}" ${selected ? 'aria-current="page"' : ''}><span>${I(icon, 20)}</span>${title}</a>`;
    }).join('');
  }
  function heading(title, subtitle, extra = '') {
    return `<div class="page-heading"><div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${extra}</div>`;
  }
  function wavebars(className = '') {
    const heights = [13, 20, 12, 31, 22, 44, 32, 61, 46, 28, 44, 72, 57, 88, 61, 39, 72, 97, 75, 49, 80, 94, 56, 67, 41, 64, 88, 54, 36, 59, 34, 49, 26, 44, 32, 22, 35, 20, 27, 15, 22, 12];
    return `<span class="wavebars ${className}" aria-hidden="true">${heights.map((h, i) => `<i style="--height:${h}%;--delay:${-(i % 8) * 90}ms"></i>`).join('')}</span>`;
  }
  function hero() {
    return `<section class="hero" aria-labelledby="hero-title"><div class="hero-art" aria-hidden="true">
      <div class="audio-card"><div class="audio-top"><span class="clip-mic">${I('mic', 14)}</span><strong>Note vocale</strong><span class="clip-time">00:24</span></div>${wavebars('clip-wave')}</div></div>
      <div class="hero-copy"><div class="hero-kicker">${I('phone', 13)} Après un appel</div>
      <h2 id="hero-title">L’appel est terminé&nbsp;?</h2><p>Dictez une note ou saisissez les détails pour préparer votre devis.</p>
      ${link('nouvelle', 'Nouvelle demande', 'plus', 'btn btn-lime')}</div></section>`;
  }
  const metrics = [
    { key: 'todo', label: 'Demandes à traiter', icon: 'inbox', history: [2, 2, 3, 2, 3, 3], filter: 'a-traiter' },
    { key: 'ready', label: 'Devis prêts', icon: 'fileCheck', history: [1, 2, 1, 2, 2, 3], filter: 'devis-prets' },
    { key: 'missing', label: 'Informations manquantes', icon: 'alert', history: [3, 3, 2, 3, 2, 2], filter: 'incomplets' }
  ];
  function sparkline(metric, count) {
    const values = [...metric.history, count];
    const max = Math.max(...values) + 1;
    const points = values.map((v, i) => [3 + i * 15, 32 - 26 * v / max]);
    const line = points.map(([x, y], i) => {
      if (!i) return `M${x},${y}`;
      const [px, py] = points[i - 1];
      return `C${px + 7},${py} ${x - 7},${y} ${x},${y}`;
    }).join(' ');
    const [endX, endY] = points[points.length - 1];
    return `<svg class="spark" viewBox="0 0 98 36" role="img"><title>Effectifs fictifs sur sept jours, ${values.join(', ')}</title>
      <defs><linearGradient id="fade-${metric.key}" x2="0" y2="1"><stop stop-color="currentColor" stop-opacity=".19"/><stop offset="1" stop-color="currentColor" stop-opacity=".01"/></linearGradient></defs>
      <path d="${line} L${endX},35 L3,35 Z" fill="url(#fade-${metric.key})"/><path d="${line}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="${endX}" cy="${endY}" r="2.4" fill="currentColor"/></svg>`;
  }
  function metricCard(metric) {
    const count = D.records.filter(r => r.status === metric.key).length;
    return `<a class="metric metric-${metric.key}" href="#demandes/${metric.filter}">
      <div class="metric-label"><span class="metric-icon">${I(metric.icon, 19)}</span><span>${metric.label}</span></div>
      <div class="metric-value"><strong>${count}</strong>${sparkline(metric, count)}</div></a>`;
  }
  function recentRow(r) {
    return `<a class="recent-row" href="#demande/${r.id}"><span class="client-cell">${avatar(r)}<span class="cell-copy"><strong>${esc(r.name)}</strong><small>${esc(r.service)}<span class="recent-place"> · ${esc(r.city || 'Ville à préciser')}</span></small></span></span>
      ${status(r.status)}${I('chevron', 14)}</a>`;
  }
  function activityItem(event) {
    const [title, icon, tone] = D.eventTypes[event.type];
    return `<li class="activity-item"><a href="#demande/${event.record.id}"><span class="timeline-icon tone-${tone}">${I(icon, 15)}</span>
      <span class="activity-copy"><strong>${title}</strong><small>${esc(event.record.name)}</small></span><time>${D.formatTime(event.at)}</time></a></li>`;
  }
  function dashboard() {
    const when = D.formatDate(D.day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const milestones = D.dailyActivity();
    const seen = new Set();
    const highlights = milestones.filter(e => !seen.has(e.record.id) && seen.add(e.record.id)).slice(0, 4);
    return heading('Tableau de bord', 'Centralisez vos demandes de devis.', `<span class="date-label">${I('calendar', 16)}<span>${when}</span></span>`) +
      hero() + `<section class="overview" aria-label="Vue d’ensemble"><div class="section-heading"><h2>Vue d’ensemble</h2><span class="section-meta">${I('activity', 14)}Tendance sur 7 jours</span></div>
      <div class="metrics">${metrics.map(metricCard).join('')}</div></section>
      <div class="dashboard-grid"><section class="panel recent"><div class="panel-title"><span class="title-with-icon">${I('inbox', 18)}<h2>Demandes récentes</h2></span>${anchorArrow('demandes', 'Tout voir')}</div>
      <div>${D.records.slice(0, 5).map(recentRow).join('')}</div></section>
      <section class="panel activity"><div class="panel-title"><span class="title-with-icon">${I('clock', 18)}<h2>Activité du jour</h2></span></div>
      <ol class="activity-list">${highlights.map(activityItem).join('')}</ol></section></div>`;
  }

  const filters = [
    ['toutes', 'Toutes'], ['telephone', 'Téléphone'], ['a-traiter', 'À traiter'],
    ['devis-prets', 'Devis prêts'], ['incomplets', 'Incomplets']
  ];
  const quoteFilters = [['tous', 'Tous'], ['brouillons', 'Brouillons'], ['valides', 'Validés'], ['envoyes', 'Envoyés']];
  function filterRecords(quoteList, filter, query) {
    const norm = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replaceAll('œ', 'oe');
    const match = {
      telephone: r => r.source === 'Téléphone', 'a-traiter': r => r.status === 'todo',
      'devis-prets': r => r.status === 'ready', incomplets: r => r.status === 'missing',
      brouillons: r => r.quote?.stage === 'draft', valides: r => r.quote?.stage === 'valid', envoyes: r => r.quote?.stage === 'sent'
    };
    const term = norm(query.trim());
    return D.records.filter(r => (!quoteList || r.quote) && (!match[filter] || match[filter](r))
      && norm([r.name, r.company, r.city, r.service, r.id].join(' ')).includes(term));
  }
  function results(quoteList, filter, query) {
    const records = filterRecords(quoteList, filter, query);
    if (!records.length) return `<div class="empty-state">${I('search', 30)}<h2>Aucun ${quoteList ? 'devis' : 'résultat'}</h2><p>Essayez un autre filtre ou un autre terme.</p>${button('clear-list', 'Réinitialiser les filtres', '', 'btn btn-light')}</div>`;
    return `<div class="list-count">${records.length} ${quoteList ? 'devis' : ('demande' + (records.length > 1 ? 's' : ''))}</div>
      <div class="table-wrap"><table class="records-table"><thead><tr><th>Client</th><th>Prestation</th><th>Ville</th><th>Statut</th>
      <th>${quoteList ? 'Estimation' : 'Date'}</th><th>Source</th></tr></thead><tbody>
      ${records.map(r => `<tr data-href="${quoteList ? 'devis' : 'demande'}/${r.id}"><td><a class="client-cell" href="#${quoteList ? 'devis' : 'demande'}/${r.id}">${avatar(r)}<span class="cell-copy"><strong>${esc(r.name)}</strong><small>${quoteList ? 'DEV' : 'DEM'}-${r.id}</small></span></a></td>
        <td data-label="Prestation">${esc(r.service || 'À préciser')}</td><td data-label="Ville">${esc(r.city || 'À préciser')}</td>
        <td class="table-status" data-label="Statut">${quoteList ? quoteStatus(r.quote.stage) : status(r.status)}</td>
        <td data-label="${quoteList ? 'Estimation' : 'Date'}">${quoteList ? D.price(r.quote.amount) : D.formatDate(r.created)}</td>
        <td data-label="Source"><span class="inline-icon">${I(r.source === 'Téléphone' ? 'phone' : 'mail', 14)}${esc(r.source)}</span></td></tr>`).join('')}</tbody></table></div>`;
  }
  function listing(quoteList, filter, query) {
    const base = quoteList ? 'devis' : 'demandes';
    return heading(quoteList ? 'Devis' : 'Demandes', quoteList ? 'Retrouvez vos brouillons et vos devis validés ou envoyés.' : 'Retrouvez les demandes de devis et suivez leur avancement.',
      link('nouvelle', 'Nouvelle demande', 'plus', 'btn btn-primary')) +
      `<section class="panel list-panel"><div class="list-tools"><label class="search">${I('search', 18)}<input id="list-search" type="search" autocomplete="off" value="${esc(query)}" aria-label="Rechercher un client, une ville ou une prestation" placeholder="Rechercher un client, une ville…"></label>
      <div class="filters" aria-label="Filtres">${(quoteList ? quoteFilters : filters).map(([key, label]) => `<a class="filter ${key === filter ? 'selected' : ''}" href="#${base}/${key}" ${key === filter ? 'aria-current="true"' : ''}>${label}</a>`).join('')}</div></div>
      <div id="list-results" aria-live="polite">${results(quoteList, filter, query)}</div></section>`;
  }

  function steps(current) {
    return `<ol class="steps" aria-label="Progression">${['Saisie', 'Fiche demande', 'Brouillon de devis'].map((name, index) => {
      const step = index + 1;
      return `<li class="${step === current ? 'current' : step < current ? 'done' : ''}" ${step === current ? 'aria-current="step"' : ''}>
        <span>${step < current ? I('check', 13) : step}</span>${name}</li>`;
    }).join('')}</ol>`;
  }
  function chooseMode() {
    const mode = (route, icon, title, description, action, tone) => `<a class="mode-card ${tone}" href="#nouvelle/${route}">
      <span class="mode-icon">${I(icon, 29)}</span><div><h2>${title}</h2><p>${description}</p></div><span class="mode-action">${action}${I('right', 18)}</span></a>`;
    return heading('Nouvelle demande', 'Comment souhaitez-vous saisir les informations de l’appel ?') + steps(1) +
      `<div class="mode-grid">${mode('vocale', 'mic', 'Dicter une note vocale', 'Testez un exemple dicté et retrouvez les informations extraites de l’appel.', 'Ouvrir la note vocale', 'voice-choice')}
      ${mode('saisie', 'form', 'Saisie rapide', 'Renseignez directement les coordonnées du client et les détails de l’intervention.', 'Ouvrir le formulaire', 'form-choice')}</div>`;
  }
  function requestFields(record) {
    return [
      ['Nom du client', record.name], ['Société', record.company, 'Facultatif'], ['Type de prestation', record.service],
      ['Surface', areas(record)], ['Fréquence', record.frequency], ['Ville', record.city], ['Adresse d’intervention', record.street],
      ['Date souhaitée', record.desired && fullDate(record.desired)], ['Email', record.email], ['Téléphone', record.phone],
      ['Commentaire', record.notes, 'Aucun commentaire']
    ];
  }
  function facts(fields) {
    return `<dl class="facts">${fields.map(([title, value, fallback = 'À compléter']) => `<div><dt>${esc(title)}</dt><dd ${!value ? 'class="unfilled"' : ''}>${esc(value || fallback)}</dd></div>`).join('')}</dl>`;
  }
  function sectionTitle(icon, label, extra = '') {
    return `<div class="panel-title"><span class="title-with-icon">${I(icon, 18)}<h2>${label}</h2></span>${extra}</div>`;
  }
  function completeness(record) {
    const n = D.missing(record).length;
    return n ? `<span class="status s-missing"><i></i>Il manque ${n} ${n === 1 ? 'information' : 'informations'}</span>` : '<span class="status s-ready"><i></i>Informations complètes</span>';
  }
  function timer(seconds) {
    return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  }
  function voice(state) {
    const { stage, elapsed } = state;
    const recording = stage === 'recording';
    const stopped = stage === 'stopped';
    const busy = stage === 'analyzing';
    const done = stage === 'complete';
    const control = recording ? 'voice-stop' : 'voice-start';
    const statusText = { idle: 'Prêt à démarrer', recording: 'Enregistrement simulé', stopped: 'Note prête à être analysée', analyzing: 'Analyse en cours…', complete: 'Analyse terminée' }[stage];
    let bottom = '';
    if (!done) {
      bottom = `<div class="rec-actions">${recording ? button('voice-stop', 'Arrêter', 'stop', 'btn btn-light') : ''}
      ${button('voice-analyze', busy ? 'Analyse en cours…' : 'Analyser la demande', busy ? 'spinner' : 'waveform', 'btn btn-primary', !stopped)}</div>`;
    }
    return link('nouvelle', 'Modes de saisie', 'back', 'back-link') + heading('Note vocale', 'Simulez la dictée d’un compte rendu après un appel.') + steps(1) +
      `<section class="panel recorder"><div class="rec-header"><span class="title-with-icon">${I('mic', 18)}<h2>Enregistrement</h2></span><span class="mini-tag">Simulation</span></div>
      <div class="rec-body ${recording ? 'is-recording' : ''}"><span class="rec-state"><i></i>${statusText}</span>
      <button type="button" class="mic-button" data-action="${control}" aria-label="${recording ? 'Arrêter l’enregistrement' : 'Démarrer un enregistrement simulé'}" ${busy || done ? 'disabled' : ''}>${I(recording ? 'stop' : 'mic', 33)}</button>
      <strong class="rec-time" id="rec-time">${timer(elapsed)}</strong>${wavebars('rec-wave')}
      <p>${recording ? 'Laissez défiler le compteur, puis arrêtez la simulation.' : (stopped ? 'Vous pouvez analyser cet exemple ou relancer la simulation.' : done ? 'La transcription de l’exemple est disponible ci-dessous.' : busy ? 'Préparation de la transcription et des informations extraites.' : 'Touchez le micro pour lancer l’exemple. Votre micro reste désactivé.')}</p>${bottom}</div></section>
      ${done ? `<section class="panel flow-panel analysis-result">${sectionTitle('note', 'Transcription')}<blockquote>${esc(D.voiceExample.transcript)}</blockquote></section>
        <section class="panel flow-panel">${sectionTitle('layers', 'Informations extraites', completeness(D.voiceExample))}${facts(requestFields(D.voiceExample))}
        <div class="form-actions">${button('voice-create', 'Ouvrir la fiche demande', 'right', 'btn btn-primary')}</div></section>` : ''}`;
  }

  function field(name, label, value, options = {}) {
    const { type = 'text', choices, placeholder = '', required, unit } = options;
    const id = 'field-' + name;
    const attrs = `id="${id}" name="${name}" ${required ? 'required' : ''}`;
    let control;
    if (choices) {
      control = `<select ${attrs}><option value="">Choisir…</option>${choices.map(item => `<option ${item === value ? 'selected' : ''}>${esc(item)}</option>`).join('')}</select>`;
    } else if (type === 'textarea') {
      control = `<textarea ${attrs} rows="3" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
    } else {
      const numberAttrs = type === 'number' ? 'min="0.01" step="0.01" inputmode="decimal"' : '';
      control = `<input ${attrs} type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${numberAttrs}>`;
    }
    return `<div class="field ${options.wide ? 'field-wide' : ''}"><label for="${id}">${label}${required ? ' <span class="required-mark" aria-hidden="true">*</span>' : ''}</label><div class="input-wrap ${unit ? 'with-unit' : ''}">${control}${unit ? `<span class="field-unit">${unit}</span>` : ''}</div></div>`;
  }
  function quickForm(record) {
    const edit = Boolean(record?.id);
    const r = record || {};
    const back = edit ? 'demande/' + r.id : 'nouvelle';
    return link(back, edit ? 'Fiche demande' : 'Modes de saisie', 'back', 'back-link') +
      heading(edit ? 'Modifier la demande' : 'Saisie rapide', edit ? `Mettez à jour les informations de ${esc(r.name)}.` : 'Saisissez ce que le client vous a indiqué au téléphone.') +
      (edit ? '' : steps(1)) + `<form id="request-form" autocomplete="off"><section class="panel form-panel">
      ${sectionTitle('user', 'Coordonnées du client', '<span class="field-note">* Champ obligatoire</span>')}<div class="form-grid">
      ${field('name', 'Nom du client', r.name, { required: true, placeholder: 'Ex. Mme Martin' })}
      ${field('company', 'Société', r.company, { placeholder: 'Nom de l’entreprise' })}
      ${field('phone', 'Téléphone', r.phone, { type: 'tel', placeholder: 'Ex. 03 88 00 00 00' })}
      ${field('email', 'Email', r.email, { type: 'email', placeholder: 'contact@example.com' })}</div></section>
      <section class="panel form-panel">${sectionTitle('layers', 'Détails de l’intervention')}<div class="form-grid">
      ${field('service', 'Type de prestation', r.service, { choices: D.services })}
      ${field('area', 'Surface estimée', r.area, { type: 'number', placeholder: 'Ex. 120', unit: 'm²' })}
      ${field('frequency', 'Fréquence', r.frequency, { choices: D.frequencies })}
      ${field('desired', 'Date souhaitée', r.desired, { type: 'date' })}
      ${field('street', 'Adresse d’intervention', r.street, { placeholder: 'Numéro et rue' })}
      ${field('city', 'Ville', r.city, { placeholder: 'Ex. Strasbourg' })}
      ${field('notes', 'Détails complémentaires', r.notes, { type: 'textarea', wide: true, placeholder: 'Accès, horaires, contraintes particulières…' })}</div>
      <div class="form-actions request-actions"><button class="btn btn-primary" type="submit" value="request">${I('check', 17)}${edit ? 'Enregistrer les modifications' : 'Créer la demande'}</button>
      ${edit ? link(back, 'Annuler', '', 'btn btn-light') : '<button class="btn btn-light" type="submit" value="quote">Créer et préparer le devis</button>'}</div></section></form>`;
  }
  function timeline(record) {
    return `<ol class="record-history">${record.events.map(event => {
      const [title, icon, tone] = D.eventTypes[event.type];
      return `<li><span class="timeline-icon tone-${tone}">${I(icon, 15)}</span><span><strong>${title}</strong><small>${D.formatDate(event.at)} · ${D.formatTime(event.at)}</small></span></li>`;
    }).join('')}</ol>`;
  }
  function detail(record) {
    const r = record;
    const absent = D.missing(r);
    const next = r.quote ? link('devis/' + r.id, 'Voir le devis', 'file', 'btn btn-primary') : button('prepare', 'Préparer le brouillon de devis', 'file', 'btn btn-primary');
    return link('demandes', 'Toutes les demandes', 'back', 'back-link') +
      heading(esc(r.name), `Demande DEM-${r.id} · ${esc(r.service || 'Prestation à préciser')}`, status(r.status)) + steps(2) +
      `<div class="detail-layout"><section class="panel details-panel">${sectionTitle('layers', 'Informations de la demande', link('demande/' + r.id + '/modifier', 'Modifier', 'pen', 'text-link'))}
      <div class="metadata"><span class="inline-icon">${I(r.source === 'Téléphone' ? 'phone' : 'mail', 15)}${esc(r.source)}</span>
      <span class="inline-icon">${I('calendar', 15)}Créée le ${fullDate(r.created)} à ${D.formatTime(r.created)}</span></div>${facts(requestFields(r))}
      ${r.transcript ? `<details class="transcript"><summary>${I('mic', 16)}Transcription de la note vocale${I('down', 15)}</summary><blockquote>${esc(r.transcript)}</blockquote></details>` : ''}</section>
      <div class="detail-aside"><section class="panel completeness ${absent.length ? 'has-missing' : 'all-set'}">${sectionTitle(absent.length ? 'alert' : 'circleCheck', absent.length ? 'Informations manquantes' : 'Informations complètes')}
      ${absent.length ? `<ul>${absent.map(label => `<li>${esc(label)}</li>`).join('')}</ul>${anchorArrow('demande/' + r.id + '/modifier', 'Compléter la fiche')}` : '<p>Les informations nécessaires à la préparation du devis sont renseignées.</p>'}</section>
      <section class="panel history">${sectionTitle('clock', 'Historique')}${timeline(r)}</section></div></div>
      <div class="detail-next">${next}</div>`;
  }
  function quoteEditor(r) {
    return link('devis/' + r.id, 'Retour au devis', 'back', 'back-link') + heading('Modifier le brouillon', `DEV-${r.id} · ${esc(r.name)}`) + `
      <form id="quote-form" class="panel form-panel" autocomplete="off">${sectionTitle('pen', 'Conditions de l’intervention')}
      <div class="form-grid">${field('amount', 'Montant estimé par intervention', r.quote.amount, { type: 'number', unit: '€', required: true })}
      ${field('notes', 'Notes du devis', r.quote.notes, { type: 'textarea', wide: true })}</div>
      <div class="form-actions">${link('devis/' + r.id, 'Annuler', '', 'btn btn-light')}<button class="btn btn-primary" type="submit">${I('check', 17)}Enregistrer</button></div></form>`;
  }
  function quote(record) {
    const r = record;
    const q = r.quote;
    const initial = q.stage === 'draft';
    const sent = q.stage === 'sent';
    const address = [r.street, r.city].filter(Boolean).map(esc).join(', ');
    const quoteEvent = r.events.find(e => e.type === 'quote');
    const title = initial ? 'Brouillon de devis' : (sent ? 'Devis envoyé' : 'Devis validé');
    return link('demande/' + r.id, 'Fiche demande', 'back', 'back-link') + heading(title, `Prévisualisation du devis pour ${esc(r.name)}.`) + steps(3) +
      `<div class="quote-layout"><article class="quote-paper"><div class="paper-header"><div class="issuer"><span class="org-icon">${I('building', 23)}</span><div><strong>Propreté Est</strong><small>Entreprise de nettoyage</small></div></div>${quoteStatus(q.stage)}</div>
      <div class="paper-title"><div><span class="eyebrow">Devis estimatif</span><h2>DEV-${r.id}</h2></div><span>${fullDate(quoteEvent?.at || r.created)}</span></div>
      <div class="bill-to"><div><span class="eyebrow">Client</span><strong>${esc(r.name)}</strong>${r.company && r.company !== r.name ? `<span>${esc(r.company)}</span>` : ''}<span>${esc(r.email || 'Email à préciser')}</span></div>
      <div><span class="eyebrow">Lieu d’intervention</span><strong>${address || 'À préciser'}</strong>${r.city && !r.street ? '<span>Adresse à préciser</span>' : ''}</div></div>
      <div class="quote-service"><span class="eyebrow">Prestation</span><h3>${esc(r.service || 'À préciser')}</h3>
      <dl><div><dt>Surface</dt><dd>${areas(r) || 'À préciser'}</dd></div><div><dt>Fréquence</dt><dd>${esc(r.frequency || 'À préciser')}</dd></div><div><dt>Date souhaitée</dt><dd>${r.desired ? fullDate(r.desired) : 'À préciser'}</dd></div></dl></div>
      <div class="quote-total"><div><strong>Montant estimé</strong><small>Par intervention</small></div><b>${D.price(q.amount)}</b></div>
      <div class="paper-notes"><span class="eyebrow">Notes</span><p>${esc(q.notes || 'Aucune note.')}</p></div></article>
      <aside class="panel quote-tools">${sectionTitle('file', 'Actions du devis')}<div>
      ${button('quote-validate', 'Valider', 'check', 'btn btn-primary', !initial)}
      ${button('quote-send', 'Envoyer', 'send', 'btn btn-light', q.stage !== 'valid')}
      ${sent ? button('quote-edit', 'Modifier', 'pen', 'btn btn-light', true) : link('devis/' + r.id + '/modifier', 'Modifier', 'pen', 'btn btn-light')}
      ${button('quote-pdf', 'Télécharger en PDF', 'download', 'btn btn-light')}
      <p class="actions-note">${initial ? 'Validez le brouillon pour tester l’envoi.' : sent ? 'L’envoi de ce devis a été simulé.' : 'Le devis est prêt pour la simulation d’envoi.'} L’export PDF est simulé.</p></div></aside></div>`;
  }
  function unavailable() {
    return `<section class="panel empty-state">${I('inbox', 32)}<h1>Fiche indisponible</h1><p>Les saisies de démonstration sont effacées au rechargement de la page.</p>${link('demandes', 'Retrouver les demandes', 'back', 'btn btn-primary')}</section>`;
  }
  return { shell, dashboard, listing, results, chooseMode, voice, timer, quickForm, detail,
    quote, quoteEditor, unavailable, filters, quoteFilters };
})();
