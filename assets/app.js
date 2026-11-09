'use strict';

(() => {
  const D = Demo;
  const V = Views;
  const main = document.querySelector('main');
  let route = {};
  let query = '';
  let voice = freshVoice();
  let tick;
  let analysisDelay;
  let toastDelay;

  function freshVoice() { return { stage: 'idle', elapsed: 0, started: 0, record: null }; }
  function go(path) { window.location.hash = path; }
  function notify(message) {
    const toast = document.querySelector('#toast');
    clearTimeout(toastDelay);
    toast.innerHTML = Icons.svg('circleCheck', 18);
    toast.append(document.createTextNode(message));
    toast.classList.add('visible');
    toastDelay = setTimeout(() => toast.classList.remove('visible'), 3600);
  }
  function parseRoute() {
    const [page = 'accueil', part = '', edit = ''] = location.hash.slice(1).split('/').filter(Boolean);
    if (page === 'accueil') return { view: 'dashboard' };
    if (page === 'nouvelle') {
      if (part === 'vocale') return { view: 'voice' };
      if (part === 'saisie') return { view: 'form' };
      return { view: 'modes' };
    }
    if (page === 'demandes' || (page === 'devis' && !/^\d+$/.test(part))) {
      const quoteList = page === 'devis';
      const choices = quoteList ? V.quoteFilters : V.filters;
      const filter = choices.some(([key]) => key === part) ? part : choices[0][0];
      return { view: 'list', quoteList, filter };
    }
    const record = D.records.find(r => String(r.id) === part);
    if (page === 'demande' && record) return { view: edit === 'modifier' ? 'edit' : 'detail', record };
    if (page === 'devis' && record?.quote) {
      const canEdit = edit === 'modifier' && record.quote.stage !== 'sent';
      return { view: canEdit ? 'quote-edit' : 'quote', record };
    }
    return { view: 'unavailable' };
  }
  function openRoute(focus = true) {
    const next = parseRoute();
    if (route.view === 'voice' && next.view !== 'voice') {
      clearInterval(tick);
      clearTimeout(analysisDelay);
      voice = freshVoice();
    }
    if (next.view !== 'list' || next.quoteList !== route.quoteList) query = '';
    route = next;
    const r = route.record;
    const requestCrumb = ['Demandes', 'demandes'];
    let active, crumbs, content;
    switch (route.view) {
      case 'dashboard':
        active = 'accueil'; crumbs = [['Tableau de bord']]; content = V.dashboard(); break;
      case 'modes':
        active = 'nouvelle'; crumbs = [['Nouvelle demande']]; content = V.chooseMode(); break;
      case 'voice':
        active = 'nouvelle/vocale'; crumbs = [['Nouvelle demande', 'nouvelle'], ['Note vocale']]; content = V.voice(voice); break;
      case 'form':
        active = 'nouvelle/saisie'; crumbs = [['Nouvelle demande', 'nouvelle'], ['Saisie rapide']]; content = V.quickForm(); break;
      case 'list': {
        const title = route.quoteList ? 'Devis' : 'Demandes';
        active = route.quoteList ? 'devis' : 'demandes'; crumbs = [[title]];
        content = V.listing(route.quoteList, route.filter, query); break;
      }
      case 'detail':
        active = 'demandes'; crumbs = [requestCrumb, ['DEM-' + r.id]]; content = V.detail(r); break;
      case 'edit':
        active = 'demandes'; crumbs = [requestCrumb, ['DEM-' + r.id, 'demande/' + r.id], ['Modifier']]; content = V.quickForm(r); break;
      case 'quote':
        active = 'devis'; crumbs = [['Devis', 'devis'], ['DEV-' + r.id]]; content = V.quote(r); break;
      case 'quote-edit':
        active = 'devis'; crumbs = [['Devis', 'devis'], ['DEV-' + r.id, 'devis/' + r.id], ['Modifier']]; content = V.quoteEditor(r); break;
      default:
        active = 'demandes'; crumbs = [requestCrumb, ['Fiche indisponible']]; content = V.unavailable();
    }
    V.shell(active, crumbs);
    main.innerHTML = content;
    document.title = (main.querySelector('h1')?.textContent || 'Espace de travail') + ' · Cognalys';
    if (focus) {
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    }
  }

  function paintVoice(focusAction) {
    main.innerHTML = V.voice(voice);
    if (focusAction) main.querySelector('[data-action="' + focusAction + '"]:not(:disabled)')?.focus({ preventScroll: true });
  }
  function startVoice() {
    if (!['idle', 'stopped'].includes(voice.stage)) return;
    clearInterval(tick);
    Object.assign(voice, { stage: 'recording', elapsed: 0, started: Date.now() });
    paintVoice('voice-stop');
    tick = setInterval(() => {
      voice.elapsed = Math.floor((Date.now() - voice.started) / 1000);
      const clock = document.querySelector('#rec-time');
      if (clock) clock.textContent = V.timer(voice.elapsed);
    }, 250);
  }
  function stopVoice() {
    if (voice.stage !== 'recording') return;
    clearInterval(tick);
    voice.elapsed = Math.max(1, Math.floor((Date.now() - voice.started) / 1000));
    voice.stage = 'stopped';
    paintVoice('voice-analyze');
  }
  function analyzeVoice() {
    if (voice.stage !== 'stopped') return;
    voice.stage = 'analyzing';
    paintVoice();
    analysisDelay = setTimeout(() => {
      if (route.view !== 'voice') return;
      voice.stage = 'complete';
      paintVoice();
      const result = main.querySelector('.analysis-result');
      result.tabIndex = -1;
      result.focus({ preventScroll: true });
      result.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      notify('Analyse de l’exemple terminée.');
    }, 750);
  }
  function openVoiceRecord() {
    if (voice.stage !== 'complete') return;
    voice.record ??= D.create({ ...D.voiceExample }, 'voice');
    go('demande/' + voice.record.id);
    notify('Fiche créée à partir de la note vocale.');
  }
  document.addEventListener('click', event => {
    if (event.target.closest('.skip-link')) {
      event.preventDefault();
      main.focus();
      return;
    }
    const row = event.target.closest('tr[data-href]');
    if (row && !event.target.closest('a')) { go(row.dataset.href); return; }
    const control = event.target.closest('button[data-action]');
    if (!control || control.disabled) return;
    const r = route.record;
    switch (control.dataset.action) {
      case 'voice-start': startVoice(); break;
      case 'voice-stop': stopVoice(); break;
      case 'voice-analyze': analyzeVoice(); break;
      case 'voice-create': openVoiceRecord(); break;
      case 'clear-list': {
        query = '';
        const dest = route.quoteList ? 'devis/tous' : 'demandes/toutes';
        if (location.hash === '#' + dest) openRoute(false);
        else go(dest);
        break;
      }
      case 'prepare':
        D.prepareQuote(r);
        go('devis/' + r.id);
        notify('Le brouillon de devis est prêt.');
        break;
      case 'quote-validate':
        if (r.quote.stage !== 'draft') return;
        D.setStage(r, 'valid');
        openRoute(false);
        main.querySelector('[data-action="quote-send"]').focus({ preventScroll: true });
        notify('Devis validé dans la démonstration.');
        break;
      case 'quote-send':
        if (r.quote.stage !== 'valid') return;
        D.setStage(r, 'sent');
        openRoute(false);
        main.querySelector('[data-action="quote-pdf"]').focus({ preventScroll: true });
        notify('Envoi simulé. Aucun email envoyé.');
        break;
      case 'quote-pdf': notify('Export simulé. Aucun fichier PDF créé.'); break;
    }
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'list-search') {
      query = event.target.value;
      document.querySelector('#list-results').innerHTML = V.results(route.quoteList, route.filter, query);
    }
    if (event.target.name === 'name') event.target.setCustomValidity('');
  });
  document.addEventListener('submit', event => {
    const form = event.target;
    event.preventDefault();
    const fields = Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, value.trim()]));
    if (form.id === 'request-form') {
      if (!fields.name) {
        const name = form.elements.namedItem('name');
        name.setCustomValidity('Indiquez le nom du client.');
        name.reportValidity();
        return;
      }
      form.querySelectorAll('[type="submit"]').forEach(btn => { btn.disabled = true; });
      const editing = route.view === 'edit';
      const r = editing ? route.record : D.create(fields, 'form');
      if (editing) D.update(r, fields);
      if (event.submitter?.value === 'quote') {
        D.prepareQuote(r);
        go('devis/' + r.id);
        notify('Demande créée et brouillon préparé.');
      } else {
        go('demande/' + r.id);
        notify(editing ? 'Fiche mise à jour.' : 'Demande créée.');
      }
    } else if (form.id === 'quote-form') {
      const r = route.record;
      r.quote.amount = Number(fields.amount);
      r.quote.notes = fields.notes;
      r.quote.stage = 'draft';
      D.log(r, 'editQuote');
      go('devis/' + r.id);
      notify('Modifications enregistrées dans le brouillon.');
    }
  });
  window.addEventListener('hashchange', () => openRoute());
  openRoute(false);
})();
