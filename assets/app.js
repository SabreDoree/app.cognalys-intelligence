'use strict';
(() => {
  const main=document.querySelector('main');
  const paths=['accueil','conversation','verification','formulaire','devis','devis-pdf'];
  let page, capture, toastClock;
  const fresh=(sessionId)=>({fields:{},messages:[],sessionId,pending:false,error:"",draft:"",audio:'idle',transcribed:false,timer:'00:00',review:false,stage:'draft',prepared:false});
  let s=fresh(QuotePDF.session());
  let pdf=QuotePDF.conversation(s.sessionId, paintPdf);

  function paintPdf() {
    const panel = main.querySelector('#pdf-panel');
    if (!panel) return;
    const focused = panel.contains(document.activeElement) ? document.activeElement.dataset : {};
    panel.innerHTML = Views.pdfPanel(pdf.state, page === 'devis-pdf');
    if (focused.pdf || focused.act) {
      const buttons = [...panel.querySelectorAll('button:not(:disabled)')];
      buttons.find(button => focused.pdf ? button.dataset.pdf === focused.pdf && button.dataset.token === focused.token : button.dataset.act === focused.act)?.focus({preventScroll:true});
    }
    const generate = main.querySelector('[data-act="pdf"]');
    if (generate) {
      generate.disabled = pdf.state.generating;
      generate.lastChild.textContent = pdf.state.generating ? 'Génération en cours…' : 'Générer le PDF';
    }
  }
  function go(path){ location.hash=path; }
  function toast(message){
    const el=document.querySelector('#toast');
    clearTimeout(toastClock);
    el.textContent=message;
    el.classList.add('visible');
    toastClock=setTimeout(()=>el.classList.remove('visible'),3300);
  }
  function render(focus=true){
    const path=location.hash.slice(1);
    const next=paths.includes(path)?path:'accueil';
    if(next !== 'conversation') cancelCapture();
    const previous=page;
    page=next;
    if(page==='devis'&&!s.prepared) page='devis-pdf';
    if(page==='verification'&&!s.review) page='accueil';
    if(page==='conversation') main.innerHTML=Views.conversation(s);
    else if(page==='formulaire'||page==='verification') main.innerHTML=Views.form(s.fields,page==='verification');
    else if(page==='devis') main.innerHTML=Views.quote(s.fields,s.review,s.stage);
    else if(page==='devis-pdf') main.innerHTML=Views.pdfPage();
    else main.innerHTML=Views.home();
    if (['conversation','devis','devis-pdf'].includes(page)) {
      main.insertAdjacentHTML('beforeend','<section id="pdf-panel" class="box" aria-label="Devis PDF de la conversation"></section>');
      if (previous !== page) pdf.refresh();
      else paintPdf();
      if (page === 'conversation') main.insertAdjacentHTML('beforeend','<button class="reset" data-act="new-chat">Nouvelle conversation</button>');
    }
    document.title=main.querySelector('h1').textContent+' · Cognalys Intelligence';
    if(focus){window.scrollTo(0,0);main.focus({preventScroll:true});}
  }
  async function sendMessage(text, clip) {
    const chat = s;
    if (chat.pending) return;
    chat.messages.push({user:true, text:clip ? '' : text, audioUrl:clip?.url});
    chat.pending = true;
    chat.error = chat.draft = '';
    render(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const body = JSON.stringify({action:'sendMessage', sessionId:chat.sessionId, chatInput:text});
      const response = await fetch('https://n8n.cognalys-intelligence.fr/webhook/759b9f24-ac69-4c11-9b44-f3032ea8a444/chat', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body,
        signal: controller.signal
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      const item = Array.isArray(data) ? data[0] : data;
      const reply = item?.output ?? item?.text ?? (typeof item === 'string' ? item : null);
      if (typeof reply !== 'string' || !reply.trim()) throw new Error('Réponse vide ou illisible');
      chat.messages.push({user:false,text:reply});
      if (clip) chat.clip = null;
      if (s === chat) pdf.refresh();
      chat.review = true;
      chat.fields.notes ??= text;
    } catch (error) {
      chat.messages.pop();
      chat.draft = text;
      chat.error = 'Réponse indisponible. Vérifiez la connexion et réessayez. ' +
        (error.message.startsWith('HTTP ') ? error.message : '');
    } finally {
      clearTimeout(timeout);
      chat.pending = false;
      if (s === chat && page === 'conversation') {
        render(false);
        main.querySelector('#answer')?.focus();
      }
    }
  }
  async function transcribe(clip) {
    const chat = s;
    if (!clip || chat.audio === 'transcribing') return;
    let messageToSend = '';
    chat.audio = 'transcribing';
    chat.transcribed = false;
    chat.error = '';
    render(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const body = new FormData();
      body.append('audio', clip.blob, clip.name);
      body.append('sessionId', chat.sessionId);
      const response = await fetch('https://n8n.cognalys-intelligence.fr/webhook/transcription-audio-openrouter', {
        method: 'POST', body, signal: controller.signal
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      const item = Array.isArray(data) ? data[0] : data;
      const transcript = item?.transcription ?? item?.transcript ?? item?.text;
      if (typeof transcript !== 'string' || !transcript.trim()) throw new Error('Transcription vide');
      if (s === chat && chat.clip === clip) {
        chat.draft = [chat.draft.trim(), transcript.trim()].filter(Boolean).join(' ');
        chat.transcribed = true;
        messageToSend = chat.draft;
      }
    } catch (error) {
      if (s === chat && chat.clip === clip) chat.error = 'Transcription indisponible. Réessayez ou écrivez votre message. ' +
        (error.message.startsWith('HTTP ') ? error.message : '');
    } finally {
      clearTimeout(timeout);
      if (s === chat && chat.clip === clip) {
        chat.audio = 'idle';
        if (page === 'conversation' && !messageToSend) render(false);
      }
    }
    if (messageToSend && s === chat && chat.clip === clip) sendMessage(messageToSend, clip);
  }
  function cancelCapture() {
    if (!capture) return;
    const old = capture;
    capture = null;
    clearInterval(old.clock);
    old.speech?.abort();
    if (old.recorder?.state === 'recording') old.recorder.stop();
    old.stream?.getTracks().forEach(track => track.stop());
    s.audio = 'idle';
  }
  function stopRecording() {
    if (capture?.recorder?.state !== 'recording') return;
    s.audio = 'stopping';
    capture.speech?.stop();
    capture.recorder.stop();
    render(false);
  }
  async function record() {
    if (capture || s.pending) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      s.error = 'Enregistrement indisponible dans ce navigateur. Utilisez la dictée du clavier ou écrivez votre message.';
      return render(false);
    }
    const job = {parts:[]};
    capture = job;
    s.audio = 'permission';
    s.error = '';
    render(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      if (capture !== job) { stream.getTracks().forEach(t => t.stop()); return; }
      job.stream = stream;
      const recorder = job.recorder = new MediaRecorder(stream);
      recorder.ondataavailable = event => { if(event.data.size) job.parts.push(event.data); };
      recorder.onerror = () => {
        if (capture !== job) return;
        cancelCapture();
        s.error = 'Enregistrement interrompu. Réessayez.';
        render(false);
      };
      recorder.onstop = () => {
        if (capture !== job) return;
        const type = recorder.mimeType || job.parts[0]?.type || 'audio/webm';
        const blob = new Blob(job.parts,{type});
        cancelCapture();
        if (blob.size) {
          const ext = type.includes('mp4')?'m4a':type.includes('ogg')?'ogg':'webm';
          s.clip = {blob, name:'note-vocale.'+ext, url:URL.createObjectURL(blob)};
          transcribe(s.clip);
        } else s.error = 'Aucun son enregistré. Réessayez.';
        if (!blob.size) render(false);
      };
      recorder.start();
      s.audio = 'recording';
      render(false);
      const start = Date.now();
      job.clock = setInterval(() => {
        const sec = Math.floor((Date.now()-start)/1000);
        const timer = document.querySelector('#timer');
        if(timer) timer.textContent = [Math.floor(sec/60),sec%60].map(v=>String(v).padStart(2,'0')).join(':');
        if(sec>=180) stopRecording();
      },250);
    } catch(error) {
      if(capture !== job) return;
      cancelCapture();
      s.error = error.name === 'NotAllowedError' ? 'Autorisez le microphone dans les réglages du site pour enregistrer.' : 'Microphone indisponible. Vérifiez son accès puis réessayez.';
      render(false);
    }
  }
  function newConversation(){
    cancelCapture();
    const urls = new Set([s.clip?.url, ...s.messages.map(message => message.audioUrl)]);
    urls.forEach(url => { if (url) URL.revokeObjectURL(url); });
    pdf.dispose();
    s=fresh(QuotePDF.session(true));
    pdf=QuotePDF.conversation(s.sessionId, paintPdf);
    page=null;
    render();
  }
  window.addEventListener('pagehide',cancelCapture);
  document.addEventListener('click',event=>{
    if(event.target.closest('.skip')){event.preventDefault();main.focus();return;}
    const pdfButton=event.target.closest('[data-pdf]');
    if (pdfButton) {
      pdf.action(pdfButton.dataset.pdf, pdfButton.dataset.token, location.hash);
      return;
    }
    const ctl=event.target.closest('[data-act]');
    if(!ctl)return;
    switch(ctl.dataset.act){
      case 'record': record(); break;
      case 'stop': stopRecording(); break;
      case 'discard': URL.revokeObjectURL(s.clip.url);s.clip=null;s.transcribed=false;s.error='';render(false);break;
      case 'transcribe': transcribe(s.clip);break;
      case 'validate':s.stage='valid';render();toast('Validation simulée.');break;
      case 'send':s.stage='sent';render();toast('Envoi simulé. Aucun email envoyé.');break;
      case 'pdf':pdf.generate(s.fields);break;
      case 'refresh-pdf':pdf.refresh();break;
      case 'new-chat':newConversation();break;
      case 'reset':
        s.fields={};s.prepared=false;s.stage='draft';pdf.state.notice=pdf.state.error='';
        go('accueil');break;
    }
  });
  document.addEventListener('input',event=>{
    const el=event.target;
    if(el.id==='answer') s.draft=el.value;
    if(el.setCustomValidity)el.setCustomValidity('');
    if(el.form?.id==='details'){s.fields[el.name]=el.value;s.prepared=false;s.stage='draft';}
  });
  document.addEventListener('change',event=>{
    if (event.target.id !== 'mode_tva') return;
    const enabled = event.target.value === 'taux';
    const rate = document.querySelector('#taux_tva');
    rate.disabled = !enabled;
    document.querySelector('#tax-field').hidden = !enabled;
  });
  document.addEventListener('submit',event=>{
    event.preventDefault();
    const f=event.target;
    if(f.id==='chat-form'){
      const text=f.elements.answer.value.trim();
      if(!text){f.elements.answer.setCustomValidity('Écrivez une réponse.');f.elements.answer.reportValidity();return;}
      sendMessage(text,s.clip);
    }else if(f.id==='details'){
      const fields=Object.fromEntries([...new FormData(f)].map(([k,v])=>[k,v.trim()]));
      if(!fields.name){f.elements.namedItem('name').setCustomValidity('Indiquez le nom du client.');f.reportValidity();return;}
      for (const key of ['montant_ht','taux_tva']) {
        if (fields[key]) fields[key] = String(Number(fields[key]));
      }
      s.fields=fields;s.review=page==='verification';s.prepared=true;s.stage='draft';go('devis');
    }
  });
  window.addEventListener('hashchange',()=>{ QuotePDF.closePreview(); render(); });
  render(false);
})();
