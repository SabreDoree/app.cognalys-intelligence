const { scope } = $('Vérifier l’espace du formulaire').first().json;
const { dossier, quote } = $('Préparer l’estimation').first().json;
const event = (kind, entity, record) => ({ json: { scope, kind, entity, requestId: '', payload: JSON.stringify(record) } });
if (quote.ttcCents === null) {
  dossier.notes = ('Chiffrage à confirmer.\n' + dossier.notes).slice(0, 2000);
}
return [event('dossier', dossier.dossierId, dossier), event('quote', quote.quoteId, quote)];

