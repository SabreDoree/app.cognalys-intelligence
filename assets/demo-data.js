'use strict';

const Demo = (() => {
  // A fixed day keeps the examples, the voice transcript and the activity feed in sync.
  const day = '2026-11-09';
  const services = ['Nettoyage de bureaux', 'Entretien d’immeuble', 'Ménage d’appartement', 'Nettoyage de vitres', 'Remise en état'];
  const frequencies = ['Intervention ponctuelle', 'Tous les jours ouvrés', '3 fois par semaine', '2 fois par semaine', '1 fois par semaine', '2 fois par mois', '1 fois par mois'];
  const statuses = {
    todo: 'À traiter', ready: 'Devis prêt', missing: 'Informations manquantes',
    analysis: 'En cours d’analyse', sent: 'Envoyé'
  };
  const requiredDetails = {
    name: 'Nom du client', service: 'Type de prestation', area: 'Surface', frequency: 'Fréquence',
    street: 'Adresse d’intervention', city: 'Ville', desired: 'Date souhaitée', phone: 'Téléphone', email: 'Email'
  };
  const transcription = 'J’ai eu Monsieur Dupont au téléphone. Il souhaite un nettoyage de bureaux de 120 m² à Strasbourg, trois fois par semaine. Il aimerait commencer lundi prochain. Son email est mdupont@example.com.';
  const voiceExample = {
    name: 'M. Dupont', company: '', service: services[0], area: '120', frequency: frequencies[2],
    street: '', city: 'Strasbourg', desired: '2026-11-16', email: 'mdupont@example.com',
    phone: '', notes: '', source: 'Téléphone', mode: 'voice', transcript: transcription
  };
  const eventTypes = {
    call: ['Appel reçu', 'phone', 'sage'], mail: ['Demande reçue par email', 'mail', 'blue'],
    voice: ['Note vocale envoyée', 'mic', 'teal'], entry: ['Saisie rapide terminée', 'form', 'sage'],
    analyzing: ['Analyse en cours', 'waveform', 'blue'], analysis: ['Analyse terminée', 'waveform', 'teal'],
    missing: ['Informations à compléter', 'alert', 'amber'], quote: ['Brouillon de devis généré', 'fileCheck', 'green'],
    update: ['Fiche mise à jour', 'pen', 'sage'], editQuote: ['Brouillon modifié', 'pen', 'sage'],
    valid: ['Devis validé', 'circleCheck', 'green'], send: ['Envoi du devis simulé', 'send', 'teal']
  };

  function dateAt(offset, time) {
    const date = new Date(day + 'T' + time + ':00');
    date.setDate(date.getDate() + offset);
    return date;
  }
  function formatDate(value, options = { day: 'numeric', month: 'short' }) {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value + 'T12:00:00') : value;
    return new Intl.DateTimeFormat('fr-FR', options).format(date);
  }
  function formatTime(date) {
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
  }
  function price(value) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  }
  function missing(record) {
    return Object.entries(requiredDetails).filter(([key]) => !record[key]).map(([, label]) => label);
  }

  const seeds = [
    { id: 1048, name: 'M. Dupont', company: 'Bureau des Quais', service: 0, city: 'Strasbourg', status: 'todo', time: '11:32', street: '8 quai des Pêcheurs', area: 120, frequency: 2, email: 'mdupont@example.com', initials: 'MD', tone: 'sage' },
    { id: 1047, name: 'Atelier Rivage', company: 'Atelier Rivage', service: 0, city: 'Schiltigheim', status: 'ready', time: '10:48', street: '14 rue des Ateliers', area: 210, amount: 185, initials: 'AR', tone: 'lilac' },
    { id: 1046, name: 'Mme Martin', service: 2, city: 'Illkirch', status: 'missing', time: '10:05', street: '', area: 68, frequency: 0, phone: '', initials: 'CM', tone: 'peach' },
    { id: 1045, name: 'Cabinet Orangerie', company: 'Cabinet Orangerie', service: 0, city: 'Strasbourg', status: 'analysis', time: '09:20', street: '3 allée des Tilleuls', area: 145, initials: 'CO', tone: 'blue' },
    { id: 1044, name: 'SCI Les Terrasses', company: 'SCI Les Terrasses', service: 1, city: 'Ostwald', status: 'sent', offset: -1, time: '14:38', street: '19 rue du Parc', area: 380, amount: 260, initials: 'LT', tone: 'sand' },
    { id: 1043, name: 'Maison Kieffer', service: 3, city: 'Bischheim', status: 'todo', offset: -2, time: '15:20', street: '15 route de Bischwiller', area: 50, source: 'Email', initials: 'MK', tone: 'blue' },
    { id: 1042, name: 'M. Morel', service: 4, city: 'Strasbourg', status: 'ready', offset: -3, time: '14:40', street: '21 rue des Serruriers', area: 96, frequency: 0, amount: 360, initials: 'PM', tone: 'peach' },
    { id: 1041, name: 'Résidence Bellis', service: 1, city: 'Lingolsheim', status: 'missing', offset: -3, time: '10:10', street: '4 impasse des Près', area: '', desired: '', initials: 'RB', tone: 'green' },
    { id: 1040, name: 'Studio Canopée', service: 0, city: 'Strasbourg', status: 'todo', offset: -4, time: '16:25', street: '25 rue des Jardins', area: 85, initials: 'SC', tone: 'lilac' },
    { id: 1039, name: 'Mme Bernard', service: 2, city: 'Hœnheim', status: 'ready', offset: -5, time: '11:40', street: '6 rue des Vergers', area: 54, frequency: 5, amount: 95, initials: 'AB', tone: 'sand' },
    { id: 1038, name: 'Bureau Marceau', service: 3, city: 'Strasbourg', status: 'sent', offset: -5, time: '09:14', street: '11 rue du Faubourg', area: 70, source: 'Email', frequency: 6, amount: 140, initials: 'BM', tone: 'sage' },
    { id: 1037, name: 'SCI du Canal', service: 1, city: 'Schiltigheim', status: 'todo', offset: -6, time: '15:50', street: '9 rue du Canal', area: 260, initials: 'DC', tone: 'green' }
  ];
  function makeSeed(seed, index) {
    const created = dateAt(seed.offset || 0, seed.time);
    const source = seed.source || 'Téléphone';
    const mode = index === 3 ? 'voice' : 'form';
    const events = [{ type: source === 'Email' ? 'mail' : 'call', at: created }];
    const add = (type, minutes) => events.push({ type, at: new Date(created.getTime() + minutes * 60000) });
    add(mode === 'voice' ? 'voice' : 'entry', 1);
    if (seed.status === 'analysis') add('analyzing', 2);
    if (seed.status === 'missing') add('missing', 2);
    if (['ready', 'sent'].includes(seed.status)) add('quote', 5);
    if (seed.status === 'sent') {
      add('valid', 10);
      add('send', 12);
    }
    return {
      ...seed, company: seed.company || '', created, source, mode, events, service: services[seed.service],
      desired: seed.desired ?? '2026-11-16', frequency: frequencies[seed.frequency ?? 4],
      area: String(seed.area), email: seed.email ?? ('contact' + seed.id + '@example.com'),
      phone: seed.phone ?? ('03 88 XX XX ' + String(70 + index)), notes: index === 1 ? 'Prévoir l’entretien des sols et des postes de travail, de préférence avant l’ouverture.' : '',
      quote: seed.amount ? { amount: seed.amount, stage: seed.status === 'sent' ? 'sent' : 'draft', notes: 'Accès aux locaux à confirmer avant la première intervention.' } : null
    };
  }

  const records = seeds.map(makeSeed);
  let nextId = Math.max(...records.map(r => r.id)) + 1;
  const opened = Date.now();
  function now() {
    return new Date(dateAt(0, '11:45').getTime() + Date.now() - opened);
  }
  function log(record, type) {
    record.events.push({ type, at: now() });
  }
  function initials(name) {
    const tokens = name.trim().split(/\s+/).filter(Boolean);
    return [tokens[0]?.[0], tokens.length > 1 ? tokens[tokens.length - 1][0] : ''].join('').toLocaleUpperCase('fr');
  }
  function create(fields, mode) {
    const record = {
      ...fields, id: nextId++, created: now(), source: 'Téléphone', mode, tone: 'sage',
      initials: initials(fields.name), events: [], quote: null
    };
    record.status = missing(record).length ? 'missing' : 'todo';
    log(record, 'call');
    log(record, mode === 'voice' ? 'voice' : 'entry');
    if (mode === 'voice') log(record, 'analysis');
    if (record.status === 'missing') log(record, 'missing');
    records.unshift(record);
    return record;
  }
  function update(record, fields) {
    Object.assign(record, fields, { initials: initials(fields.name) });
    if (record.quote?.stage === 'sent') record.status = 'sent';
    else if (missing(record).length) record.status = 'missing';
    else record.status = record.quote ? 'ready' : 'todo';
    log(record, 'update');
  }
  function prepareQuote(record) {
    if (record.quote) return;
    if (record.status === 'analysis') log(record, 'analysis');
    record.quote = { amount: 180, stage: 'draft', notes: record.notes || 'Montant indicatif à ajuster après confirmation des conditions d’intervention.' };
    record.status = missing(record).length ? 'missing' : 'ready';
    log(record, 'quote');
  }
  function setStage(record, stage) {
    if (record.quote.stage === stage) return;
    record.quote.stage = stage;
    record.status = stage === 'sent' ? 'sent' : (missing(record).length ? 'missing' : 'ready');
    log(record, stage === 'sent' ? 'send' : 'valid');
  }
  function dailyActivity() {
    // Surface milestones, keeping routine input steps in the longer request timeline.
    const shown = ['call', 'mail', 'missing', 'quote', 'analysis', 'analyzing', 'send', 'valid', 'update', 'editQuote'];
    const today = dateAt(0, '12:00').toDateString();
    return records.flatMap(record => record.events.map((event, order) => ({ ...event, record, order })))
      .filter(event => shown.includes(event.type) && event.at.toDateString() === today)
      .sort((a, b) => b.at - a.at || b.record.id - a.record.id || b.order - a.order);
  }

  return { day, services, frequencies, statuses, requiredDetails, eventTypes, voiceExample, records,
    formatDate, formatTime, price, missing, create, update, prepareQuote, setStage, log, dailyActivity };
})();
