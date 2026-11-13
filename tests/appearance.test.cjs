const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync(__dirname+'/../assets/appearance.js','utf8');
function setup(saved,{blocked=false}={}){
 const handlers={},attrs={},label={},button={querySelector:()=>label,setAttribute:(k,v)=>attrs[k]=v};const root={dataset:{}};let reloaded=0;
 const storage={value:saved,getItem(){if(blocked)throw Error('blocked');return this.value;},setItem(k,v){if(blocked)throw Error('blocked');this.value=v;}};
 const ctx={localStorage:storage,document:{documentElement:root,querySelector:()=>({setAttribute(){}}),querySelectorAll:()=>[button],addEventListener:(type,fn)=>handlers[type]=fn},window:{addEventListener:(type,fn)=>handlers[type]=fn},location:{reload(){reloaded++;}}};
 vm.createContext(ctx);vm.runInContext(code,ctx);return {root,label,attrs,storage,handlers,get reloaded(){return reloaded;},click(selector){handlers.click({target:{closest:s=>s===selector?{}:null}});}};
}
test('première visite en mode nuit, bascule mémorisée et restaurée au rechargement',()=>{const h=setup(null);assert.equal(h.root.dataset.theme,'dark');assert.equal(h.label.textContent,'Mode jour');h.click('[data-theme-toggle]');assert.equal(h.root.dataset.theme,'light');assert.equal(h.storage.value,'light');assert.equal(h.attrs['aria-label'],'Activer le mode nuit');assert.equal(setup(h.storage.value).root.dataset.theme,'light');h.click('[data-theme-toggle]');assert.equal(h.storage.value,'dark');});
test('le mode reste utilisable si le stockage du navigateur est bloqué',()=>{const h=setup(null,{blocked:true});assert.equal(h.root.dataset.theme,'dark');h.click('[data-theme-toggle]');assert.equal(h.root.dataset.theme,'light');});
test('les commandes de rechargement relancent la page sans changer de thème',()=>{const h=setup('light');h.click('[data-reload-app]');assert.equal(h.reloaded,1);assert.equal(h.root.dataset.theme,'light');h.handlers.storage({key:'cognalys.theme',newValue:'dark'});assert.equal(h.root.dataset.theme,'dark');});
