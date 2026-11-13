const pdf = $('Rendre l’estimation PDF').first().binary?.pdf;
if (!pdf || pdf.mimeType !== 'application/pdf') throw new Error('Estimation PDF indisponible.');
const { email } = $('Valider la demande').first().json;
const { quote } = $('Préparer l’estimation').first().json;
return [{ json: { email, companyName: quote.presentation.companyName }, binary: { devis: { ...pdf, fileName: quote.numero + '.pdf' } } }];
