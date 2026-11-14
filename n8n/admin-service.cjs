function adminService(actor,req,rows,newScope){
 const OWNER='TJFfqZBnzyfgpZRNmKGDwWnUltP2';
 const fail=error=>({write:false,result:{ok:false,error}});
 if(actor.uid!==OWNER||!actor.authorized||!req.web)return fail('Administration réservée au propriétaire.');
 const validScope=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
 const members=rows.filter(r=>r.uid&&r.status!=='company');
 const visible=members.filter(r=>r.status!=='archived');
 const records=rows.filter(r=>r.status==='company'&&!r.uid&&validScope(r.scope));
 const byScope=new Map();
 for(const r of [...visible,...records])if(validScope(r.scope))byScope.set(r.scope,{scope:r.scope,company:r.company||'Entreprise sans nom',memberCount:visible.filter(m=>m.scope===r.scope&&m.active===true).length});
 const companies=[...byScope.values()].sort((a,b)=>a.company.localeCompare(b.company,'fr'));
 const clean=r=>({uid:r.uid,email:r.email||'',scope:r.scope||'',company:byScope.get(r.scope)?.company||r.company||'',active:r.active===true,status:r.status||(r.active?'approved':r.scope?'suspended':'pending'),updatedAt:r.updatedAt,createdAt:r.createdAt});
 if(req.command==='admin.list')return {write:false,result:{ok:true,members:visible.map(clean).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt))),companies}};
 const p=req.params||{};
 if(req.command==='admin.company_create'){
   if(typeof p.company!=='string')return fail('Nom d’entreprise requis.');
   const name=p.company.trim();
   if(!name||name.length>160)return fail('Un nom d’entreprise est requis (160 caractères maximum).');
   if(companies.some(c=>c.company.trim().toLocaleLowerCase('fr')===name.toLocaleLowerCase('fr')))return fail('Cette entreprise existe déjà.');
   if(!validScope(newScope)||rows.some(r=>r.scope===newScope))return fail('Impossible de créer un espace inédit. Réessayez.');
   return {write:false,companyCreate:true,companyRow:{uid:'',email:'',scope:newScope,company:name,active:false,status:'company'},result:{ok:true,company:{scope:newScope,company:name,memberCount:0}}};
 }
 if(p.uid===OWNER)return fail('Le compte propriétaire ne peut pas être désactivé ici.');
 const found=members.filter(r=>r.uid===p.uid);if(found.length!==1)return fail('Compte absent ou en doublon. Actualisez la liste.');
 const old=found[0];if(p.updatedAt!==old.updatedAt)return fail('Ce compte a changé. Actualisez avant de réessayer.');
 let status,active,scope=old.scope||'',company=old.company||'';
 if(req.command==='admin.approve'||req.command==='admin.reactivate'||req.command==='admin.link'){
   if(Object.hasOwn(p,'scope')){
     const target=validScope(p.scope)?byScope.get(p.scope):null;
     if(!target)return fail('Sélectionnez une entreprise existante.');
     scope=target.scope;company=target.company;
   }else{
     if(req.command==='admin.link')return fail('Sélectionnez une entreprise existante.');
     company=String(p.company||company).trim();if(!company||company.length>160)return fail('Un nom d’entreprise est requis (160 caractères maximum).');
     if(!scope){if(!validScope(newScope)||rows.some(r=>r.scope===newScope))return fail('Impossible de créer l’espace.');scope=newScope;}
     else company=byScope.get(scope)?.company||company;
   }
   status='approved';active=true;
 }
 else if(req.command==='admin.suspend'){status='suspended';active=false;}
 else if(req.command==='admin.reject'){status='rejected';active=false;}
 else return fail('Action administrative inconnue.');
 return {write:true,rowId:old.id,expectedUpdatedAt:old.updatedAt,uid:old.uid,email:old.email||'',scope,company,status,active,result:{ok:true,member:{...clean(old),scope,status,active,company}}};
}

module.exports={adminService};
