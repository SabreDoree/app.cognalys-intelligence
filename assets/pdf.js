'use strict';
const QuotePDF=(()=>{
 const viewer=document.querySelector('#pdf-viewer');let url,documentTask,generation=0;
 function closePreview(){generation++;if(viewer.open)viewer.close();viewer.querySelector('.pdf-canvas').replaceChildren();viewer.querySelector('a').removeAttribute('href');if(url)URL.revokeObjectURL(url);url=null;if(documentTask){documentTask.destroy();documentTask=null;}}
 viewer.querySelector('button').addEventListener('click',closePreview);viewer.addEventListener('cancel',e=>{e.preventDefault();closePreview();});
 async function action(sessionId,row,type){const blob=await QuoteAPI.request('pdf',{sessionId,params:{token:row.token}},true);
  if(type==='download'){const link=document.createElement('a'),downloadUrl=URL.createObjectURL(blob);link.href=downloadUrl;link.download=row.numero+'.pdf';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(downloadUrl),60000);return;}
  closePreview();const current=++generation;url=URL.createObjectURL(blob);viewer.querySelector('h2').textContent=row.numero;viewer.querySelector('a').href=url;const area=viewer.querySelector('.pdf-canvas');area.textContent='Chargement du PDF…';viewer.showModal();
  try{const lib=await import('./vendor/pdf.min.mjs');lib.GlobalWorkerOptions.workerSrc=new URL('./assets/vendor/pdf.worker.min.mjs',document.baseURI).href;
   if(current!==generation)return;
   documentTask=lib.getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false});const pdf=await documentTask.promise;if(current!==generation)return;area.replaceChildren();
   for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);if(current!==generation)return;const base=page.getViewport({scale:1}),width=Math.min(area.clientWidth-24,1000),ratio=Math.min(devicePixelRatio||1,2),viewport=page.getViewport({scale:width/base.width*ratio});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;canvas.style.width=width+'px';canvas.style.height=viewport.height/ratio+'px';canvas.setAttribute('aria-label',row.numero+' · page '+i+' sur '+pdf.numPages);canvas.setAttribute('role','img');area.append(canvas);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;}
  }catch(e){if(current!==generation)return;area.textContent='L’aperçu est indisponible. Vous pouvez ouvrir le PDF dans un nouvel onglet ou le télécharger.';}
 }
 return {action,closePreview};
})();
