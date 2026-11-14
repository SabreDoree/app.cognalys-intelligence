const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup({scope='',active=false,status='pending',failure=false}={}){
 const handlers={},dialogHandlers={},calls=[];let saved=0,sub;
 const panel={innerHTML:''};const dialog={open:false,querySelector:s=>s==='[data-company-content]'?panel:{focus(){}},contains:()=>true,showModal(){this.open=true;},close(){this.open=false;dialogHandlers.close?.();},addEventListener:(n,h)=>dialogHandlers[n]=h};
 const auth={state:{user:{uid:'owner'},access:{isAdmin:true}},subscribe(fn){sub=fn;}};
 const ctx={CognalysAuth:auth,document:{querySelector:()=>dialog,addEventListener:(n,h)=>handlers[n]=h},window:{addEventListener(){}},QuoteAPI:{call:async(...args)=>{calls.push(args);if(failure)throw Error('Compte modifié entre-temps');}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../assets/company-link.js','utf8')+'\nthis.api=CompanyLink;',ctx);
 ctx.api.open({member:{uid:'u',email:'test@example.invalid',scope,company:'Entreprise A',active,status,updatedAt:'r1'},companies:[{scope:'a',company:'Entreprise A'},{scope:'b',company:'Entreprise B'}],sessionId:'s',onSaved:async()=>{saved++;}});
 return {panel,dialog,calls,auth,get saved(){return saved;},notify:()=>sub(),click(attr){handlers.click({target:{closest:()=>({hasAttribute:a=>a===attr})}});},change(value){handlers.change({target:{id:'company-link-choice',value}});},submit:()=>handlers.submit({target:{id:'company-link-form'},preventDefault(){}})};
}
test('aucune entreprise en rouge, consultation puis modification, annulation sans appel serveur',()=>{
 const h=setup();assert.match(h.panel.innerHTML,/company-none/);assert.match(h.panel.innerHTML,/>Aucune</);assert.doesNotMatch(h.panel.innerHTML,/<select/);
 h.click('data-company-edit');assert.match(h.panel.innerHTML,/<select/);h.change('b');h.click('data-company-cancel');assert.doesNotMatch(h.panel.innerHTML,/<select/);assert.equal(h.calls.length,0);
 h.click('data-company-close');assert.equal(h.dialog.open,false);
});
test('entreprise actuelle visible ; modification uniquement après confirmation',async()=>{
 const h=setup({scope:'a',active:true,status:'approved'});assert.match(h.panel.innerHTML,/>Entreprise A</);
 h.click('data-company-edit');await h.submit();assert.equal(h.calls.length,0);
 h.change('b');assert.match(h.panel.innerHTML,/ne sont pas transférés/);assert.equal(h.calls.length,0);await h.submit();
 assert.equal(h.calls[0][1],'admin.link');assert.equal(h.calls[0][2].scope,'b');assert.equal(h.saved,1);assert.equal(h.dialog.open,false);
});
test('compte en attente : confirmation approuve et rattache ; erreurs visibles dans la fenêtre',async()=>{
 const h=setup({failure:true});h.click('data-company-edit');h.change('a');await h.submit();assert.equal(h.calls[0][1],'admin.approve');assert.equal(h.saved,0);assert.equal(h.dialog.open,true);assert.match(h.panel.innerHTML,/role="alert"/);
});
test('changement de compte ferme la fenêtre ; aucune mutation sans privilèges',async()=>{
 const h=setup();h.click('data-company-edit');h.change('a');h.auth.state.access.isAdmin=false;h.notify();assert.equal(h.dialog.open,false);await h.submit();assert.equal(h.calls.length,0);
});
