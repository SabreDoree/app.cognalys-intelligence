# Cognalys Intelligence — Création de devis

Ouvrir `index.html` dans un navigateur, directement ou depuis GitHub Pages. Le prototype statique propose deux entrées.

- **Audio ou chat** — enregistrer avec le micro, relire la transcription et envoyer la note ou échanger par écrit avec le chatbot n8n, puis vérifier les champs.
- **Formulaire rapide** — saisir les informations et préparer le brouillon. Le montant est renseigné manuellement.

Les messages écrits et les notes vocales utilisent le même sessionId. Les notes sont envoyées en multipart avec files et chatInput. La reconnaissance vocale du navigateur, si disponible, propose une transcription française modifiable. Sinon, le texte doit être renseigné pour le workflow actuel. Le navigateur conserve l’échange en mémoire dans l’onglet. La validation, l’envoi du devis et le PDF sont simulés.

Les vues, les interactions et les données de démonstration se trouvent dans `assets/views.js`, `assets/app.js` et `assets/demo-data.js`. Les logos fournis et la police sont inclus localement.
