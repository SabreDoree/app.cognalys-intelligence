const item=$input.first();
const sessionId=String(item.json.body?.sessionId??item.json.sessionId??'').trim();
const fail=(error,statusCode=400)=>[{json:{ok:false,error,statusCode,sessionId}}];
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId))return fail('Identifiant de conversation invalide.');
const binary=item.binary??{};
const property=binary.audio?'audio':binary.data?'data':Object.keys(binary)[0];
if(!property)return fail('Aucun enregistrement reçu. Envoyez un fichier dans le champ audio.');
const meta=binary[property];
const extension=String(meta.fileName??'').split('.').pop().toLowerCase();
const mime=String(meta.mimeType??'').toLowerCase();
const formats={mp3:'mp3',wav:'wav',wave:'wav',m4a:'m4a',mp4:'m4a',ogg:'ogg',oga:'ogg',webm:'webm',flac:'flac',aac:'aac'};
const format=formats[extension]||(mime.includes('webm')?'webm':mime.includes('mp4')?'m4a':mime.includes('ogg')?'ogg':mime.includes('wav')?'wav':mime.includes('flac')?'flac':mime.includes('mpeg')?'mp3':mime.includes('aac')?'aac':null);
if(!format)return fail('Format audio non reconnu. Réessayez depuis le microphone.');
try{
 const buffer=await this.helpers.getBinaryDataBuffer(0,property);
 if(!buffer.length)return fail('L’enregistrement est vide. Réessayez.');
 return [{json:{ok:true,sessionId,audioFormat:format,audioBase64:buffer.toString('base64')}}];
}catch{return fail('Impossible de lire l’enregistrement reçu.');}
