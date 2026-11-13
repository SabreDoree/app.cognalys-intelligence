const {test}=require('node:test'),assert=require('node:assert/strict'),{service}=require('../n8n/service.cjs');
const scope='test',sid='12345678-1234-4234-8234-123456789012',token='87654321-4321-4321-8321-210987654321';
const client={dossierId:'DOS-1',nom_client:'Client',prenom_client:'Avant',clientName:'Avant Client',prestation:'Vitres',revision:1};
const line={lineId:'l',catalogId:'c',label:'Vitres',description:'',unit:'m²',quantity:2,price:3,vat:20,htCents:600,vatCents:120};
const old={quoteId:'DEV-1',numero:'DEV-1-V1',token:'old',version:1,dossierId:client.dossierId,clientName:client.clientName,client,lines:[line],presentation:{vatMode:'standard'}};
const row=(kind,entity,data,id)=>({id,scope,kind,entity,payload:JSON.stringify(data)});
const rows=[row('dossier',client.dossierId,client,1),row('quote',old.quoteId,old,2)];
const run=(params,r=rows)=>service({scope,sessionId:sid,requestId:sid,command:'quote.revise',params:{token:'old',...params}},r,token);
test('correction client et tarif crée une version sans toucher au dossier ou au PDF précédent',()=>{
 const before=JSON.stringify(rows);const out=run({clientFields:{prenom_client:'Après',nom_client:'Nouveau',adresse_facturation:'12 rue du Test'},quantities:[{lineId:'l',quantity:4}],lineChanges:[{lineId:'l',label:'Vitres et cadres',description:'Deux faces',unit:'passage',price:5,vat:10}]});const q=out.result.quote;
 assert.equal(q.version,2);assert.equal(q.parentToken,'old');assert.equal(q.clientName,'Après Nouveau');assert.equal(q.client.adresse_facturation,'12 rue du Test');assert.equal(q.htCents,2000);assert.equal(q.vatCents,200);assert.equal(q.ttcCents,2200);assert.equal(q.lines[0].unit,'passage');assert(!q.missingInformation.includes('adresse du client'));assert.equal(JSON.stringify(rows),before);assert.equal(out.pdf,true);
});
test('les corrections de champs et de montants sont contrôlées côté serveur',()=>{
 assert.throws(()=>run({clientFields:{scope:'other'}}),/inconnu/);assert.throws(()=>run({clientFields:{nom_client:''}}),/requis/);assert.throws(()=>run({lineChanges:[{lineId:'l',price:-1}]}),/Nombre/);assert.throws(()=>run({lineChanges:[{lineId:'absent',price:1}]}),/introuvable/);
 const franchise=rows.map(r=>r.kind==='quote'?row('quote','DEV-1',{...old,presentation:{vatMode:'franchise'}},2):r).concat(row('settings','company',{vatMode:'franchise'},3));assert.throws(()=>run({lineChanges:[{lineId:'l',vat:20}]},franchise),/taux nul/);
});
test('le PDF formulaire historique se corrige dans le même devis sans catalogue ni recréation',()=>{
 const legacy={...old,documentType:'estimate',title:'Estimation · Nettoyage',lines:[{...line,lineId:undefined}],presentation:{companyName:'Entreprise du PDF',vatMode:'standard'}};
 const stored=[rows[0],row('quote','DEV-1',legacy,2)];const before=JSON.stringify(stored);
 const listed=service({scope,sessionId:sid,command:'quote.list',params:{history:true}},stored,token).result.quotes[0];assert.equal(listed.lines[0].lineId,'old-0');
 const q=run({clientFields:{adresse_facturation:'12 rue du Test'},quantities:[{lineId:'old-0',quantity:3}],lineChanges:[{lineId:'old-0',price:4}]},stored).result.quote;
 assert.equal(q.quoteId,legacy.quoteId);assert.equal(q.version,2);assert.equal(q.parentToken,legacy.token);assert.equal(q.htCents,1200);assert.equal(q.client.adresse_facturation,'12 rue du Test');assert.equal(q.documentType,'estimate');assert.equal(q.presentation.companyName,'Entreprise du PDF');assert.equal(JSON.stringify(stored),before);
});
test('un document à chiffrer doit être complété avant sa nouvelle version',()=>{
 const legacy={...old,documentType:'estimate',lines:[{...line,lineId:undefined,quantity:null,htCents:null,vatCents:null}],htCents:null,vatCents:null,ttcCents:null};const stored=[rows[0],row('quote','DEV-1',legacy,2)];assert.throws(()=>run({},stored),/Nombre/);const q=run({quantities:[{lineId:'old-0',quantity:2}]},stored).result.quote;assert.equal(q.ttcCents,720);assert.equal(q.quoteId,'DEV-1');
});
