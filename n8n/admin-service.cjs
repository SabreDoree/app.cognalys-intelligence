function adminService(actor,req,rows,newScope){
 const OWNER='TJFfqZBnzyfgpZRNmKGDwWnUltP2';
 const fail=error=>({write:false,result:{ok:false,error}});
 if(actor.uid!==OWNER||!actor.authorized||!req.web)return fail('Administration réservée au propriétaire.');
 const members=rows.filter(r=>r.uid);
 const clean=r=>({uid:r.uid,email:r.email||'',company:r.company||'',active:r.active===true,status:r.status||(r.active?'approved':r.scope?'suspended':'pending'),updatedAt:r.updatedAt,createdAt:r.createdAt});
 if(req.command==='admin.list')return {write:false,result:{ok:true,members:members.map(clean).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)))}};
 const p=req.params||{};
 if(p.uid===OWNER)return fail('Le compte propriétaire ne peut pas être désactivé ici.');
 const found=members.filter(r=>r.uid===p.uid);if(found.length!==1)return fail('Compte absent ou en doublon. Actualisez la liste.');
 const old=found[0];if(p.updatedAt!==old.updatedAt)return fail('Ce compte a changé. Actualisez avant de réessayer.');
 let status,active,scope=old.scope||'',company=old.company||'';
 if(req.command==='admin.approve'||req.command==='admin.reactivate'){company=String(p.company||company).trim();if(!company||company.length>160)return fail('Un nom d’entreprise est requis (160 caractères maximum).');if(!scope){if(!/^[a-f0-9]{64}$/.test(newScope))return fail('Impossible de créer l’espace.');scope=newScope;}status='approved';active=true;}
 else if(req.command==='admin.suspend'){status='suspended';active=false;}
 else if(req.command==='admin.reject'){status='rejected';active=false;}
 else return fail('Action administrative inconnue.');
 return {write:true,rowId:old.id,uid:old.uid,email:old.email||'',scope,company,status,active,result:{ok:true,member:{...clean(old),status,active,company}}};
}

module.exports={adminService};
