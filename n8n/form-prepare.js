const demande = $('Valider la demande').first().json;
const output = $('Analyser la demande').first().json.output;
const catalogue = [["nettoyage","bureaux","Entretien standard des bureaux","m² / passage",0.5],["nettoyage","vitres","Nettoyage de vitres accessibles","m²",3],["nettoyage","chantier","Nettoyage léger de fin de chantier","m²",5],["nettoyage","logement","Nettoyage courant de logement","h",32],["travaux","murs","Peinture intérieure des murs","m²",25],["travaux","plafond","Peinture intérieure des plafonds","m²",30],["depannage","plomberie","Diagnostic plomberie (hors réparation)","forfait",95],["depannage","electricite","Diagnostic électrique (hors réparation)","forfait",95]];
const choices = catalogue.filter(row => row[0] === demande.projet.service);
let ids = [];
try {
  const answer = JSON.parse(String(output ?? '').trim().replace(/^```(?:json)?\s*|\s*```$/gi, ''));
  if (Array.isArray(answer.ids)) ids = [...new Set(answer.ids)].slice(0, 4);
} catch {}
const description = [demande.projet.description, demande.projet.details].filter(Boolean).join(' ');
function explicitQuantity(unit) {
  if (unit === 'forfait') return 1;
  const pattern = unit === 'h' ? /(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:heures?\b|h\b)/gi
    : /(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:m²|m2\b|mètres carrés)/gi;
  const values = [...new Set(Array.from(description.matchAll(pattern), m => Number(m[1].replace(',', '.'))))];
  return values.length === 1 && values[0] > 0 ? values[0] : null;
}
const terms = {bureaux:/\bbureaux?\b/i,vitres:/\b(?:vitres?|vitrages?)\b/i,chantier:/\bfin de chantier\b/i,logement:/\b(?:logement|maison|appartement)\b/i,murs:/peint\w*\s+(?:les |des )?murs|peinture murale/i,plafond:/\bplafonds?\b/i,plomberie:/\b(?:plomberie|fuite|robinet)\b/i,electricite:/électri|disjoncteur/i};
const matching = choices.filter(row => terms[row[1]].test(description));
const specific = matching.some(row => ['vitres','chantier'].includes(row[1])) ? matching.filter(row => ['vitres','chantier'].includes(row[1])) : matching;
const proposed = specific.filter(row => ids.includes(row[1]));
const selected = specific.length === 1 ? specific : proposed;
const rows = selected.map(([, , label, unit, rate]) => {
  const qty = unit !== 'forfait' && selected.length > 1 ? null : explicitQuantity(unit);
  const ht = qty === null ? null : Math.round(qty * Math.round(rate * 100));
  return {label, unit, rate, qty, ht, tax: ht === null ? null : Math.round(ht / 5)};
});
const complete = rows.length > 0 && rows.every(row => row.ht !== null);
const total = rows.reduce((sum, row) => sum + (row.ht ?? 0), 0);
const tax = rows.reduce((sum, row) => sum + (row.tax ?? 0), 0);

const scope = $('Vérifier l’espace du formulaire').first().json.scope;
const event = $('Lire les réglages du devis').all().map(item => item.json)
  .filter(row => row.scope === scope && row.kind === 'settings' && row.entity === 'company')
  .sort((a, b) => Number(b.id) - Number(a.id))[0];
const company = event ? JSON.parse(event.payload) : {};
const identityFields = [
  'companyName', 'companyDetails', 'street', 'addressExtra', 'postalCode', 'city', 'country',
  'legalForm', 'capital', 'siren', 'siret', 'rcsCity', 'vatNumber', 'sapNumber',
  'companyEmail', 'companyPhone', 'primaryColor', 'accentColor', 'logo',
];
const presentation = Object.fromEntries(identityFields
  .filter(field => typeof company[field] === 'string' || (field === 'capital' && Number.isFinite(company[field])))
  .map(field => [field, company[field]]));
presentation.companyName = presentation.companyName?.trim() || 'Clair & Soin';
const createdAt = new Date().toISOString();
const { token } = $('Créer le jeton du formulaire').first().json;
if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(token ?? '')) throw new Error('Jeton d’estimation invalide.');
const day = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(createdAt));
const quoteId = 'DEV-' + day.split('/').reverse().join('') + '-' + token.replace(/-/g, '').slice(0, 12).toUpperCase();
const names = { travaux:'Travaux et rénovation', nettoyage:'Nettoyage', depannage:'Dépannage', autre:'Autre prestation' };
const dossier = {
  dossierId: 'DOS-' + token,
  sessionId: token,
  revision: 1,
  updatedAt: createdAt,
  nom_client: demande.nomFamille,
  prenom_client: demande.prenom,
  clientName: demande.nom,
  prestation: names[demande.projet.service],
  surface: demande.surface === null ? '' : demande.surface + ' m²',
  adresse_chantier: demande.projet.codePostal + ' ' + demande.projet.commune,
  adresse_facturation: '',
  frequence: demande.frequence,
  notes: [
    'Demande reçue depuis le formulaire Clair & Soin.',
    'E-mail : ' + demande.email,
    'Téléphone : ' + demande.telephone,
    'Description : ' + demande.projet.description,
    demande.projet.delai && 'Délai : ' + demande.projet.delai,
    demande.projet.details,
  ].filter(Boolean).join('\n').slice(0, 2000),
};
return [{ json: { dossier, quote: {
  documentType: 'estimate',
  source: 'formulaire-clair-soin',
  title: 'Estimation · ' + names[demande.projet.service],
  quoteId,
  numero: quoteId + '-V1',
  token,
  sessionId: token,
  dossierId: dossier.dossierId,
  parentToken: null,
  status: 'brouillon',
  reason: 'Estimation issue du formulaire Clair & Soin',
  createdAt,
  version: 1,
  clientName: demande.nom,
  client: dossier,
  presentation,
  lines: rows.map((row, index) => ({ lineId: token + '-' + index, label: row.label, quantity: row.qty, unit: row.unit, price: row.rate, vat: 20, htCents: row.ht, vatCents: row.tax })),
  htCents: complete ? total : null,
  vatCents: complete ? tax : null,
  ttcCents: complete ? total + tax : null,
} } }];

