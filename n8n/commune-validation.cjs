function communeValidation(response,params){
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 if(response.statusCode!==200||!Array.isArray(response.body))return {valid:false,error:'Le contrôle officiel du code postal est momentanément indisponible. Réessayez avant d’enregistrer.'};
 const communes=response.body.filter(x=>x.codePostal===params.postalCode);
 const valid=communes.some(c=>[c.nomCommune,c.libelleAcheminement].some(n=>norm(n)===norm(params.city)));
 return {valid,error:valid?'':'Code postal et ville incompatibles. Communes attendues : '+[...new Set(communes.map(c=>c.libelleAcheminement||c.nomCommune))].join(', ')};
}

module.exports={communeValidation};
