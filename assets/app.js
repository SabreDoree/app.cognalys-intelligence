'use strict';
(() => {
  const main=document.querySelector('main');
  const paths=['accueil','conversation','verification','formulaire','devis'];
  let page, clock, toastClock;
  const fresh=()=>({fields:{},messages:[],sessionId:null,pending:false,error:"",draft:"",audio:'idle',timer:'00:00',review:false,stage:'draft',prepared:false});
  let s=fresh();
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
    if(next!=='conversation' && s.audio==='actif'){clearInterval(clock);s.audio='arrêté';}
    page=next;
    if(page==='devis'&&!s.prepared || page==='verification'&&!s.review) page='accueil';
    if(page==='conversation') main.innerHTML=Views.conversation(s);
    else if(page==='formulaire'||page==='verification') main.innerHTML=Views.form(s.fields,page==='verification');
    else if(page==='devis') main.innerHTML=Views.quote(s.fields,s.review,s.stage);
    else main.innerHTML=Views.home();
    document.title=main.querySelector('h1').textContent+' · Cognalys Intelligence';
    if(focus){window.scrollTo(0,0);main.focus({preventScroll:true});}
  }
  async function sendMessage(text) {
    const chat = s;
    if (chat.pending) return;
    chat.sessionId ??= crypto.randomUUID();
    chat.messages.push({user:true, text});
    chat.pending = true;
    chat.error = chat.draft = '';
    render(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch('https://n8n.cognalys-intelligence.fr/webhook/759b9f24-ac69-4c11-9b44-f3032ea8a444/chat', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({action:'sendMessage', sessionId:chat.sessionId, chatInput:text}),
        signal: controller.signal
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      const item = Array.isArray(data) ? data[0] : data;
      const reply = item?.output ?? item?.text ?? (typeof item === 'string' ? item : null);
      if (typeof reply !== 'string' || !reply.trim()) throw new Error('Réponse vide ou illisible');
      chat.messages.push({user:false,text:reply});
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
  function reset(){clearInterval(clock);s=fresh();}
  document.addEventListener('click',event=>{
    if(event.target.closest('.skip')){event.preventDefault();main.focus();return;}
    if(page==='accueil'&&event.target.closest('.voice-option,.form-option')) reset();
    const ctl=event.target.closest('[data-act]');
    if(!ctl)return;
    switch(ctl.dataset.act){
      case 'record': {
        s.audio='actif';s.timer='00:00';const start=Date.now();
        render(false);
        main.querySelector('[data-act="stop"]').focus();
        clock=setInterval(()=>{
          const n=Math.floor((Date.now()-start)/1000);
          s.timer=[Math.floor(n/60),n%60].map(v=>String(v).padStart(2,'0')).join(':');
          const time=document.querySelector('#timer');if(time)time.textContent=s.timer;
        },250);break;
      }
      case 'stop':clearInterval(clock);s.audio='arrêté';render(false);main.querySelector('[data-act="analyse"]').focus();break;
      case 'analyse':s.fields={...QuoteData.example};s.audio='analysé';s.review=true;render(false);main.querySelector('.chat a.primary').focus();break;
      case 'validate':s.stage='valid';render();toast('Validation simulée.');break;
      case 'send':s.stage='sent';render();toast('Envoi simulé. Aucun email envoyé.');break;
      case 'pdf':toast('Export simulé. Aucun fichier PDF créé.');break;
      case 'reset':reset();go('accueil');break;
    }
  });
  document.addEventListener('input',event=>{
    const el=event.target;
    if(el.setCustomValidity)el.setCustomValidity('');
    if(el.form?.id==='details'){s.fields[el.name]=el.value;s.prepared=false;s.stage='draft';}
  });
  document.addEventListener('submit',event=>{
    event.preventDefault();
    const f=event.target;
    if(f.id==='chat-form'){
      const text=f.elements.answer.value.trim();
      if(!text){f.elements.answer.setCustomValidity('Écrivez une réponse.');f.elements.answer.reportValidity();return;}
      sendMessage(text);
    }else if(f.id==='details'){
      const fields=Object.fromEntries([...new FormData(f)].map(([k,v])=>[k,v.trim()]));
      if(!fields.name){f.elements.namedItem('name').setCustomValidity('Indiquez le nom du client.');f.reportValidity();return;}
      s.fields=fields;s.review=page==='verification';s.prepared=true;s.stage='draft';go('devis');
    }
  });
  window.addEventListener('hashchange',()=>render());
  render(false);
})();
