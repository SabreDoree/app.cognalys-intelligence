'use strict';
const Drafts=(()=>{
 const prefix='cognalys.drafts.v1.';
 const key=a=>a.user?.uid&&a.access?.scope?prefix+a.user.uid+'.'+a.access.scope:null;
 function save(a,s){const k=key(a);if(!k)return false;try{localStorage.setItem(k,JSON.stringify({savedAt:Date.now(),dossierDraft:s.dossierDraft,catalogDraft:s.catalogDraft,quoteDraft:s.quoteDraft,presentationDraft:s.presentationDraft,draft:s.draft}));return true;}catch{return false;}}
 function restore(a){const k=key(a);if(!k)return null;try{const v=JSON.parse(localStorage.getItem(k)||'null');return v&&Date.now()-v.savedAt<7*86400000?v:null;}catch{return null;}}
 function clear(a){try{const k=key(a);if(k)localStorage.removeItem(k);}catch{}}
 return {save,restore,clear};
})();
