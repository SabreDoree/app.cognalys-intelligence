const {test}=require('node:test'),assert=require('node:assert/strict'),{adminService}=require('../n8n/admin-service.cjs');
const uid='TJFfqZBnzyfgpZRNmKGDwWnUltP2',actor={uid,authorized:true},member={id:2,uid:'client-a',email:'client@example.invalid',scope:'',company:'',active:false,status:'pending',updatedAt:'revision-a'};
const request=(command,params={})=>({command,params,web:true});
const scopeA='a'.repeat(64),scopeB='b'.repeat(64);
const company={uid:'',scope:scopeA,company:'Entreprise A',status:'company',active:false};
test('une entreprise sans membre apparaît et peut recevoir deux comptes',()=>{
 const first=adminService(actor,request('admin.company_create',{company:'Entreprise A'}),[member],scopeA);
 assert.equal(first.companyCreate,true);
 const rows=[member,first.companyRow];
 const list=adminService(actor,request('admin.list'),rows,scopeB).result;
 assert.equal(list.companies[0].memberCount,0);assert.equal(list.members.length,1);
 const approve=adminService(actor,request('admin.approve',{uid:member.uid,updatedAt:member.updatedAt,scope:scopeA}),rows,scopeB);
 assert.equal(approve.scope,scopeA);assert.equal(approve.company,'Entreprise A');
 const second={...member,id:3,uid:'client-b'};
 const updated=[{...member,...approve},second,first.companyRow];
 const linked=adminService(actor,request('admin.approve',{uid:second.uid,updatedAt:second.updatedAt,scope:scopeA}),updated,scopeB);
 assert.equal(linked.scope,scopeA);
 assert.equal(adminService(actor,request('admin.list'),[{...member,...approve},{...second,...linked},first.companyRow],scopeB).result.companies[0].memberCount,2);
});
test('créations invalides, doublons, collisions et entreprises inconnues ne déclenchent aucune écriture',()=>{
 for(const name of ['',null,{},'Entreprise A',' entreprise a ']){
  const r=adminService(actor,request('admin.company_create',{company:name}),[company],scopeB);
  assert.equal(r.result.ok,false);assert.equal(r.write,false);assert.notEqual(r.companyCreate,true);
 }
 assert.equal(adminService(actor,request('admin.company_create',{company:'Autre'}),[company],scopeA).result.ok,false);
 for(const scope of ['',scopeB,'invalid'])assert.equal(adminService(actor,request('admin.link',{uid:member.uid,updatedAt:member.updatedAt,scope}),[member,company],scopeB).write,false);
});
test('changer d’entreprise utilise le scope sélectionné sans renommer ni déplacer les documents',()=>{
 const active={...member,scope:scopeA,company:'Entreprise A',active:true,status:'approved'};
 const other={...company,scope:scopeB,company:'Entreprise B'};
 const linked=adminService(actor,request('admin.link',{uid:active.uid,updatedAt:active.updatedAt,scope:scopeB}),[active,company,other],'c'.repeat(64));
 assert.equal(linked.scope,scopeB);assert.equal(linked.company,'Entreprise B');assert.equal(active.scope,scopeA);
 assert.equal(linked.expectedUpdatedAt,active.updatedAt);
 assert.equal(adminService(actor,request('admin.link',{uid:active.uid,updatedAt:active.updatedAt,company:'Autre',scope:''}),[active,company],'c'.repeat(64)).write,false);
});
test('un utilisateur ordinaire, un administrateur déclaré dans le navigateur et un appel du modèle sont refusés',()=>{for(const a of [{uid:'client-a',authorized:true,isAdmin:true},{uid,authorized:false}])assert.equal(adminService(a,request('admin.list'),[member],'a'.repeat(64)).result.ok,false);assert.equal(adminService(actor,{...request('admin.list'),web:false},[member],'a'.repeat(64)).result.ok,false);});
test('activation crée un espace, suspension et réactivation conservent cet espace',()=>{const approve=adminService(actor,request('admin.approve',{uid:member.uid,updatedAt:member.updatedAt,company:'Entreprise A'}),[member],'a'.repeat(64));assert.equal(approve.write,true);assert.equal(approve.active,true);const active={...member,...approve};const suspend=adminService(actor,request('admin.suspend',{uid:member.uid,updatedAt:member.updatedAt}),[active],'b'.repeat(64));assert.equal(suspend.active,false);assert.equal(suspend.scope,approve.scope);assert.equal(adminService(actor,request('admin.reactivate',{uid:member.uid,updatedAt:member.updatedAt}),[{...active,...suspend}],'c'.repeat(64)).scope,approve.scope);});
test('le propriétaire, les doublons et les demandes obsolètes sont protégés',()=>{assert.equal(adminService(actor,request('admin.suspend',{uid}),[{...member,uid}],'a'.repeat(64)).write,false);assert.equal(adminService(actor,request('admin.approve',{uid:member.uid,updatedAt:member.updatedAt}),[member,member],'a'.repeat(64)).write,false);assert.equal(adminService(actor,request('admin.suspend',{uid:member.uid,updatedAt:'old'}),[member],'a'.repeat(64)).write,false);});
