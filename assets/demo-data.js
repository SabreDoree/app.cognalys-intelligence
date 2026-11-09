'use strict';
const QuoteData = {
  services: ['Nettoyage de bureaux', 'Entretien d’immeuble', 'Ménage d’appartement', 'Nettoyage de vitres', 'Remise en état'],
  frequencies: ['Intervention ponctuelle', 'Tous les jours ouvrés', '3 fois par semaine', '2 fois par semaine', '1 fois par semaine', '1 fois par mois'],
  example: { name: 'M. Dupont', service: 'Nettoyage de bureaux', area: '120', frequency: '3 fois par semaine', city: 'Strasbourg', email: 'mdupont@example.com', desired: '2026-11-16' },
  transcript: 'J’ai eu Monsieur Dupont au téléphone. Il souhaite un nettoyage de bureaux de 120 m² à Strasbourg, trois fois par semaine. Il aimerait commencer lundi prochain. Son email est mdupont@example.com.',
  prompts: [
    ['name', 'Pour quel client préparez-vous le devis ?'],
    ['service', 'Quelle prestation de nettoyage faut-il prévoir ?'],
    ['city', 'Dans quelle ville aura lieu l’intervention ?'],
    ['notes', 'Quels détails faut-il reprendre sur le devis ? Indiquez par exemple la surface, la fréquence ou les horaires.']
  ]
};
