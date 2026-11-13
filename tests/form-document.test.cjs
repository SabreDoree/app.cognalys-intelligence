const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const token='11111111-2222-4333-8444-555555555555',scope='a'.repeat(64);
const source=name=>fs.readFileSync(__dirname+'/../n8n/form-'+name+'.js','utf8');
function prepare(description){const fixture={
 'Valider la demande':[{json:{email:'fixture@example.invalid',prenom:'Client',nomFamille:'Fictif',nom:'Client Fictif',telephone:'+33000000000',surface:null,frequence:'',projet:{service:'nettoyage',description,commune:'Ville test',codePostal:'00000',details:'',delai:''}}}],
 'Analyser la demande':[{json:{output:'{"ids":["vitres"]}'}}],
 'Vérifier l’espace du formulaire':[{json:{scope}}],
 'Lire les réglages du devis':[{json:{scope,kind:'settings',entity:'company',id:1,payload:JSON.stringify({companyName:'Entreprise test'})}}],
 'Créer le jeton du formulaire':[{json:{token}}],
 };const $=name=>({first:()=>fixture[name][0],all:()=>fixture[name]});return new Function('$',source('prepare'))($)[0].json;}
for(const [description,chiffre] of [['Nettoyage de 25 m² de vitres',true],['Nettoyage de vitres, surface à préciser',false]]){
 test('le PDF envoyé est archivé avec son devis : '+(chiffre?'chiffré':'à compléter'),()=>{
  const prepared=prepare(description);assert.equal(prepared.quote.ttcCents!==null,chiffre);assert.equal(prepared.quote.lines[0].lineId,token+'-0');
  const binary={data:Buffer.from('%PDF-1.4 fixture').toString('base64'),mimeType:'application/pdf',fileName:'original.pdf'};
  const fixture={'Vérifier l’espace du formulaire':{json:{scope}},'Préparer l’estimation':{json:prepared},'Rendre l’estimation PDF':{json:{},binary:{pdf:binary}},'Valider la demande':{json:{email:'fixture@example.invalid'}}};const $=name=>({first:()=>fixture[name]});
  const events=new Function('$',source('events'))($);assert.equal(events.length,2);const q=JSON.parse(events[1].json.payload);assert.equal(q.token,token);assert.equal(q.quoteId,prepared.quote.quoteId);assert.equal(events[1].json.scope,scope);
  const attached=new Function('$',source('attachment'))($)[0];assert.equal(attached.binary.devis.data,binary.data);assert.equal(attached.binary.devis.fileName,q.numero+'.pdf');assert.equal(q.token,prepared.quote.token);
 });
}
