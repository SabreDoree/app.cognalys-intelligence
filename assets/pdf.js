'use strict';
const QuotePDF = (() => {
  const base = 'https://n8n.cognalys-intelligence.fr/webhook/cognalys/devis/';
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const sessionKey = 'cognalys.conversation';
  const invalid = () => new Error('Réponse du service PDF invalide.');
  const viewer = document.querySelector('#pdf-viewer');
  let previewUrl, previewOwner;

  function session(renew = false) {
    try {
      const saved = sessionStorage.getItem(sessionKey);
      if (!renew && uuid.test(saved)) return saved;
    } catch { /* The tab still works in memory when storage is unavailable. */ }
    const id = crypto.randomUUID();
    try { sessionStorage.setItem(sessionKey, id); } catch { /* In-memory session. */ }
    return id;
  }

  async function request(path, data, binary = false) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(base + path, {
        method: data ? 'POST' : 'GET',
        headers: data ? {'Content-Type':'application/json'} : {},
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'omit', redirect: 'error', cache: 'no-store',
        referrerPolicy: 'no-referrer', signal: controller.signal
      });
      if (!response.ok) throw new Error('Service PDF indisponible (HTTP ' + response.status + ').');
      if (!binary) return await response.json();
      const blob = await response.blob();
      if (blob.type.split(';')[0] !== 'application/pdf' || await blob.slice(0, 5).text() !== '%PDF-') throw invalid();
      return blob;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Service PDF indisponible. Délai dépassé.');
      if (error.name === 'TypeError') throw new Error('Service PDF indisponible. Vérifiez la connexion ou les autorisations réseau.');
      if (error.name === 'SyntaxError') throw invalid();
      throw error;
    } finally { clearTimeout(timer); }
  }

  function checked(row, id) {
    if (!uuid.test(row?.token) || !row.numero || typeof row.numero !== 'string' ||
        (row.sessionId !== undefined && row.sessionId !== id) ||
        row.pdfUrl !== base + 'voir?token=' + row.token) throw invalid();
    return row;
  }

  function closePreview() {
    if (viewer.open) viewer.close();
    viewer.querySelector('.pdf-canvas').replaceChildren();
    viewer.querySelector('a').removeAttribute('href');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  viewer.querySelector('button').addEventListener('click', closePreview);
  viewer.addEventListener('cancel', event => { event.preventDefault(); closePreview(); });

  function showPreview(blob, row, owner) {
    closePreview();
    previewOwner = owner;
    previewUrl = URL.createObjectURL(blob);
    viewer.querySelector('h2').textContent = row.numero;
    viewer.querySelector('a').href = previewUrl;
    if (navigator.pdfViewerEnabled !== false) {
      const frame = document.createElement('iframe');
      frame.title = 'Aperçu du devis ' + row.numero;
      frame.src = previewUrl;
      viewer.querySelector('.pdf-canvas').append(frame);
    } else {
      viewer.querySelector('.pdf-canvas').textContent = 'Le lecteur intégré est indisponible sur ce navigateur.';
    }
    viewer.showModal();
  }

  function download(blob, row) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = row.numero.replace(/[^a-zA-Z0-9_-]/g, '_') + '.pdf';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function conversation(id, paint) {
    const state = {rows:[], loading:false, generating:false, busy:new Map(), error:'', listError:'', notice:''};
    let revision = 0;
    let active = true;

    async function refresh() {
      const version = ++revision;
      state.loading = true;
      state.listError = '';
      paint();
      try {
        const result = await request('lister?sessionId=' + encodeURIComponent(id));
        if (version !== revision) return;
        if (!Array.isArray(result?.devis)) throw invalid();
        state.rows = result.devis.map(row => checked(row, id));
      } catch (error) {
        if (version === revision) state.listError = error.message;
      } finally {
        if (version === revision) { state.loading = false; if (active) paint(); }
      }
    }

    async function generate(fields) {
      if (state.generating) return;
      state.generating = true;
      state.error = state.notice = '';
      paint();
      try {
        const {montant_ht = '', mode_tva = 'a_preciser', taux_tva = '', ...formulaire} = fields;
        const row = checked(await request('generer', {
          sessionId:id, dossierId:'', formulaire, montant_ht, mode_tva,
          taux_tva:mode_tva === 'taux' ? taux_tva : ''
        }), id);
        if (row.status !== 'pdf_genere' || row.sessionId !== id) throw invalid();
        if (!active) return;
        state.rows = [{nom_client:formulaire.name, prestation:formulaire.service, ...row}, ...state.rows.filter(x => x.token !== row.token)];
        state.notice = 'PDF généré · ' + row.numero;
      } catch (error) {
        state.error = error.message + ' Génération non confirmée. Vérifiez la liste avant de réessayer.';
      } finally {
        state.generating = false;
        if (active) refresh();
      }
    }

    async function action(type, token, originHash) {
      const row = state.rows.find(x => x.token === token);
      if (!row || state.busy.has(token)) return;
      state.busy.set(token, type);
      state.error = state.notice = '';
      paint();
      try {
        if (type === 'autorise' || type === 'refuse') {
          const result = await request('decision', {token, sessionId:id, decision:type});
          if (result?.success !== true || result.token !== token || result.decision_brouillon_mail !== type) throw invalid();
          if (!active) return;
          state.rows = state.rows.map(x => x.token === token ? {...x, decision_brouillon_mail:type} : x);
          state.notice = 'Décision enregistrée pour ' + row.numero + '.';
          refresh();
        } else {
          const blob = await request('voir?token=' + token, null, true);
          if (!active || !document.querySelector('#pdf-panel') || location.hash !== originHash) return;
          if (type === 'preview') showPreview(blob, row, token);
          else download(blob, row);
        }
      } catch (error) {
        state.error = error.message;
        if (active && (type === 'autorise' || type === 'refuse')) refresh();
      } finally {
        state.busy.delete(token);
        if (active) paint();
      }
    }

    return {state, refresh, generate, action, dispose() { active = false; ++revision; closePreview(); }};
  }
  viewer.addEventListener('close', () => {
    if (!viewer.open && previewOwner) {
      document.querySelector(`[data-pdf="preview"][data-token="${previewOwner}"]`)?.focus({preventScroll:true});
      previewOwner = null;
    }
  });
  return {session, conversation, closePreview};
})();
