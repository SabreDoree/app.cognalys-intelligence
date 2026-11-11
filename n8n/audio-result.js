const sessionId=$('Préparer audio').first().json.sessionId;
const result=$input.first().json;
const text=typeof result.text==='string'?result.text.trim():'';
if(result.error)return [{json:{ok:false,sessionId,error:'La transcription OpenRouter est indisponible. Réessayez.',statusCode:502}}];
if(!text)return [{json:{ok:false,sessionId,error:'Aucune parole reconnue. Réessayez ou écrivez votre message.',statusCode:422}}];
return [{json:{ok:true,sessionId,transcription:text,statusCode:200}}];
