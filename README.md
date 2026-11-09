# Cognalys Intelligence — Création de devis

Ouvrir `index.html` dans un navigateur, directement ou depuis GitHub Pages. Le prototype statique propose deux entrées.

- **Audio ou chat** — enregistrer avec le micro, transcrire la note et transmettre automatiquement le texte à l'assistant n8n, ou échanger par écrit, puis vérifier les champs.
- **Formulaire rapide** — saisir les informations et préparer le brouillon. Le montant est renseigné manuellement.

Le site envoie l'audio en multipart (`audio`, `sessionId`) au webhook n8n de transcription. Après réception de `transcription`, il envoie automatiquement ce texte au Chat Trigger n8n avec le même `sessionId`. Si l'un des appels échoue, l'interface propose de réessayer ou de corriger le texte. L'échange reste en mémoire dans l'onglet du navigateur. La mémoire de l'agent n8n nécessite une configuration distincte dans son workflow. La validation, l'envoi du devis et le PDF sont simulés.

Les vues, les interactions et les données de démonstration se trouvent dans `assets/views.js`, `assets/app.js` et `assets/demo-data.js`. Les logos fournis et la police sont inclus localement.
