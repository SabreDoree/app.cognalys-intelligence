const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ops=require('../n8n/admin-routing.json').operations;
const params=name=>ops.find(o=>o.nodeName===name&&o.parameters).parameters;
const {adminService}=require('../n8n/admin-service.cjs');
const actor={uid:'TJFfqZBnzyfgpZRNmKGDwWnUltP2',authorized:true};
test('le code livré à n8n reste identique au service testé',()=>{
 const source=fs.readFileSync(__dirname+'/../n8n/admin-service.cjs','utf8').replace('module.exports={adminService};','').trim();
 assert.ok(params('Préparer action admin').jsCode.startsWith(source));
});
test('le routage réel refuse la création invalide avant tout insert',()=>{
 const expression=params('Créer entreprise ?').conditions.conditions[0].leftValue.slice(3,-3);
 for(const company of ['',null,'Entreprise']){
  const r=adminService(actor,{web:true,command:'admin.company_create',params:{company}},[], 'b'.repeat(64));
  assert.equal(vm.runInNewContext(expression,{$json:r}),company==='Entreprise');
 }
});
test('confirmation : scope et entreprise incorrects, ou mise à jour concurrente, ne donnent pas de succès',()=>{
 const plan={uid:'u',scope:'a'.repeat(64),company:'A',active:true,status:'approved',result:{ok:true,member:{uid:'u'}}};
 const run=row=>new Function('$','$input',params('Accès confirmé').jsCode)(()=>({first:()=>({json:plan})}),{first:()=>({json:row})})[0].json;
 assert.equal(run({...plan,updatedAt:'new'}).member.updatedAt,'new');
 for(const row of [{},{...plan,scope:'b'.repeat(64)},{...plan,company:'B'}])assert.equal(run(row).ok,false);
 assert.ok(params('Enregistrer accès').filters.conditions.some(c=>c.keyName==='updatedAt'));
});
test('création depuis le formulaire : valeur capturée avant le remplacement du DOM',async()=>{
 const handlers={},calls=[],state={sessionId:'session',busy:false,pending:false};let task,detached=false;
 const form={id:'company-form',get elements(){assert.equal(detached,false);return {'new-company':{value:' Entreprise créée '}};}};
 const ctx={s:state,document:{addEventListener:(n,h)=>handlers[n]=h},main:{querySelector:()=>null},CognalysAuth:{state:{access:{authorized:true,isAdmin:true}}},operation(job){detached=true;task=job();},reloadAdmin:async()=>{},QuoteAPI:{call:async(...args)=>calls.push(args)}};
 const code=fs.readFileSync(__dirname+'/../assets/app.js','utf8');vm.createContext(ctx);
 vm.runInContext(code.slice(code.indexOf(' function captureFields()'),code.indexOf(" window.addEventListener('hashchange'")),ctx);
 handlers.submit({preventDefault(){},target:form});await task;
 assert.equal(calls[0][1],'admin.company_create');assert.equal(calls[0][2].company,'Entreprise créée');
});
