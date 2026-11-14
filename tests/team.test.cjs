const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm'),fs=require('node:fs');
const {service}=require('../n8n/service.cjs');
const scope='a'.repeat(64),actor=uid=>({uid,email:uid+'@example.invalid',role:'manager'});
test('réservation concurrente : seul le premier identifiant inséré peut envoyer',()=>{
 const ops=require('../n8n/team-upgrade.json').api;const code=ops.find(o=>o.node?.name==='Élire réservation').node.parameters.jsCode;
 const rows=[{id:11,kind:'mail_claim'},{id:12,kind:'mail_claim'}];
 for(const id of [11,12]){const result=new Function('$input','$',code)({all:()=>rows.map(json=>({json}))},()=>({first:()=>({json:{id}})}));assert.equal(result[0].json.allowed,id===11);}
});
test('envoi : validation, confirmation web obligatoire, isolation et rejeu sans renvoi',()=>{
 const token=crypto.randomUUID(),id=crypto.randomUUID(),quote={quoteId:'DEV-test',token,numero:'DEV-test-V1',version:1,lines:[],client:{revision:1}};
 const rows=[{id:1,scope,kind:'quote',entity:quote.quoteId,payload:JSON.stringify(quote)}];
 const req={scope,source:'app',actor:actor('a'),command:'quote.send',requestId:id,params:{token,to:'test@example.invalid',subject:'Devis',message:'Bonjour',confirm:true}};
 const result=service(req,rows,token);assert.equal(result.mail,true);
 assert.equal(service(req,[...rows,{...result.claimEvent,id:2}],token).result.delivery,'unknown');
 assert.throws(()=>service({...req,source:'chat'},rows,token));assert.throws(()=>service({...req,scope:'other'},rows,token));
 assert.throws(()=>service({...req,params:{...req.params,to:'test@example.invalid,autre@example.invalid'}},rows,token));
});
test('deux identités partagent les désignations et leur historique, une autre entreprise reste isolée',()=>{
 const id=crypto.randomUUID(),r=service({scope,actor:actor('a'),params:{label:'Vitres',unit:'m²',price:3,vat:20},command:'catalog.save',requestId:id},[],id);
 const rows=[{...r.event,id:1}];assert.equal(service({scope,actor:actor('b'),params:{},command:'catalog.list'},rows,id).result.items[0].price,3);
 assert.equal(service({scope:'other',params:{},command:'catalog.list'},rows,id).result.items.length,0);
 assert.equal(service({scope,params:{},command:'audit.list'},rows,id).result.events[0].actorUid,'a');
});
test('droits : lecture seule ne peut muter ; collaborateur ne peut modifier les tarifs ou la présentation',()=>{
 for(const role of ['viewer','member'])assert.throws(()=>service({scope,actor:{role},params:{},command:'settings.save'},[],crypto.randomUUID()));
 assert.throws(()=>service({scope,actor:{role:'viewer'},params:{},command:'dossier.save'},[],crypto.randomUUID()),/lecture seule/);
});
test('brouillons séparés par utilisateur et entreprise et suppression à la déconnexion',()=>{
 const values=new Map(),ctx={localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},Date};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../assets/drafts.js','utf8')+';this.api=Drafts;',ctx);
 const a={user:{uid:'a'},access:{scope}},b={user:{uid:'b'},access:{scope}};
 ctx.api.save(a,{dossierDraft:{nom_client:'Test'}});assert.equal(ctx.api.restore(a).dossierDraft.nom_client,'Test');assert.equal(ctx.api.restore(b),null);assert.equal(ctx.api.restore({...a,access:{scope:'other'}}),null);ctx.api.clear(a);assert.equal(ctx.api.restore(a),null);
});
